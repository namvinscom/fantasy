"""
Data ingestion service — fetches from FPL API and persists to SQLite.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Fixture, Gameweek, Player, PlayerGameweekStat, SyncLog, Team
from app.services.fpl_client import fpl_client

logger = logging.getLogger(__name__)

POSITION_MAP = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}


def _safe_float(val: Any) -> float | None:
    try:
        return float(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def _safe_int(val: Any) -> int | None:
    try:
        return int(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def _parse_dt(val: str | None) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        return None


def sync_teams(db: Session, teams_data: list[dict]) -> int:
    count = 0
    for t in teams_data:
        team = db.get(Team, t["id"])
        if not team:
            team = Team(id=t["id"])
            db.add(team)
        team.name = t.get("name", "")
        team.short_name = t.get("short_name", "")
        team.strength = _safe_int(t.get("strength"))
        team.strength_overall_home = _safe_int(t.get("strength_overall_home"))
        team.strength_overall_away = _safe_int(t.get("strength_overall_away"))
        team.strength_attack_home = _safe_int(t.get("strength_attack_home"))
        team.strength_attack_away = _safe_int(t.get("strength_attack_away"))
        team.strength_defence_home = _safe_int(t.get("strength_defence_home"))
        team.strength_defence_away = _safe_int(t.get("strength_defence_away"))
        count += 1
    db.commit()
    logger.info(f"Synced {count} teams")
    return count


def sync_players(db: Session, elements: list[dict], element_types: list[dict]) -> int:
    pos_map = {et["id"]: POSITION_MAP.get(et["id"], et.get("singular_name_short", "UNK")) for et in element_types}
    count = 0
    for e in elements:
        player = db.get(Player, e["id"])
        if not player:
            player = Player(id=e["id"])
            db.add(player)
        player.name = f"{e.get('first_name', '')} {e.get('second_name', '')}".strip()
        player.web_name = e.get("web_name", "")
        player.team_id = _safe_int(e.get("team"))
        player.position = pos_map.get(e.get("element_type", 0), "UNK")
        player.price = _safe_int(e.get("now_cost"))
        player.total_points = _safe_int(e.get("total_points"))
        player.event_points = _safe_int(e.get("event_points"))
        player.form = _safe_float(e.get("form"))
        player.selected_by_percent = _safe_float(e.get("selected_by_percent"))
        player.minutes = _safe_int(e.get("minutes"))
        player.goals_scored = _safe_int(e.get("goals_scored"))
        player.assists = _safe_int(e.get("assists"))
        player.clean_sheets = _safe_int(e.get("clean_sheets"))
        player.bonus = _safe_int(e.get("bonus"))
        player.bps = _safe_int(e.get("bps"))
        player.yellow_cards = _safe_int(e.get("yellow_cards"))
        player.red_cards = _safe_int(e.get("red_cards"))
        player.saves = _safe_int(e.get("saves"))
        # xG / xA (available since 2022-23)
        player.expected_goals = _safe_float(e.get("expected_goals"))
        player.expected_assists = _safe_float(e.get("expected_assists"))
        player.expected_goal_involvements = _safe_float(e.get("expected_goal_involvements"))
        player.expected_goals_conceded = _safe_float(e.get("expected_goals_conceded"))
        # Availability
        player.news = e.get("news", "")
        player.news_added = _parse_dt(e.get("news_added"))
        player.chance_of_playing_next_round = _safe_int(e.get("chance_of_playing_next_round"))
        player.chance_of_playing_this_round = _safe_int(e.get("chance_of_playing_this_round"))
        player.status = e.get("status", "a")
        count += 1
    db.commit()
    logger.info(f"Synced {count} players")
    return count


def sync_gameweeks(db: Session, events: list[dict]) -> int:
    count = 0
    for ev in events:
        gw = db.get(Gameweek, ev["id"])
        if not gw:
            gw = Gameweek(id=ev["id"])
            db.add(gw)
        gw.name = ev.get("name", "")
        gw.deadline_time = _parse_dt(ev.get("deadline_time"))
        gw.finished = ev.get("finished", False)
        gw.is_current = ev.get("is_current", False)
        gw.is_next = ev.get("is_next", False)
        gw.is_previous = ev.get("is_previous", False)
        gw.average_entry_score = _safe_int(ev.get("average_entry_score"))
        gw.highest_score = _safe_int(ev.get("highest_score"))
        gw.highest_scoring_entry = _safe_int(ev.get("highest_scoring_entry"))
        gw.transfers_made = _safe_int(ev.get("transfers_made"))
        gw.most_selected = _safe_int(ev.get("most_selected"))
        gw.most_transferred_in = _safe_int(ev.get("most_transferred_in"))
        gw.most_captained = _safe_int(ev.get("most_captained"))
        gw.top_element = _safe_int(ev.get("top_element"))
        gw.top_element_points = _safe_int(ev.get("top_element_points"))
        chip_plays = ev.get("chip_plays")
        gw.chip_plays = json.dumps(chip_plays) if chip_plays else None
        count += 1
    db.commit()
    logger.info(f"Synced {count} gameweeks")
    return count


def sync_fixtures(db: Session, fixtures_data: list[dict]) -> int:
    count = 0
    for f in fixtures_data:
        fixture = db.get(Fixture, f["id"])
        if not fixture:
            fixture = Fixture(id=f["id"])
            db.add(fixture)
        fixture.gameweek = _safe_int(f.get("event"))
        fixture.team_h = _safe_int(f.get("team_h"))
        fixture.team_a = _safe_int(f.get("team_a"))
        fixture.team_h_difficulty = _safe_int(f.get("team_h_difficulty"))
        fixture.team_a_difficulty = _safe_int(f.get("team_a_difficulty"))
        fixture.kickoff_time = _parse_dt(f.get("kickoff_time"))
        fixture.finished = f.get("finished", False)
        fixture.started = f.get("started", False)
        fixture.team_h_score = _safe_int(f.get("team_h_score"))
        fixture.team_a_score = _safe_int(f.get("team_a_score"))
        fixture.provisional_start_time = f.get("provisional_start_time", False)
        count += 1
    db.commit()
    logger.info(f"Synced {count} fixtures")
    return count


def sync_gw_live(db: Session, gameweek: int, live_data: dict) -> int:
    """Sync live GW stats for all players."""
    elements = live_data.get("elements", [])
    count = 0
    for el in elements:
        pid = el.get("id")
        stats = el.get("stats", {})
        if not pid:
            continue
        existing = (
            db.query(PlayerGameweekStat)
            .filter_by(player_id=pid, gameweek=gameweek)
            .first()
        )
        if not existing:
            existing = PlayerGameweekStat(player_id=pid, gameweek=gameweek)
            db.add(existing)
        existing.minutes = _safe_int(stats.get("minutes"))
        existing.goals_scored = _safe_int(stats.get("goals_scored"))
        existing.assists = _safe_int(stats.get("assists"))
        existing.clean_sheets = _safe_int(stats.get("clean_sheets"))
        existing.goals_conceded = _safe_int(stats.get("goals_conceded"))
        existing.own_goals = _safe_int(stats.get("own_goals"))
        existing.penalties_saved = _safe_int(stats.get("penalties_saved"))
        existing.penalties_missed = _safe_int(stats.get("penalties_missed"))
        existing.yellow_cards = _safe_int(stats.get("yellow_cards"))
        existing.red_cards = _safe_int(stats.get("red_cards"))
        existing.saves = _safe_int(stats.get("saves"))
        existing.bonus = _safe_int(stats.get("bonus"))
        existing.bps = _safe_int(stats.get("bps"))
        existing.total_points = _safe_int(stats.get("total_points"))
        existing.expected_goals = _safe_float(stats.get("expected_goals"))
        existing.expected_assists = _safe_float(stats.get("expected_assists"))
        existing.expected_goal_involvements = _safe_float(stats.get("expected_goal_involvements"))
        existing.expected_goals_conceded = _safe_float(stats.get("expected_goals_conceded"))
        count += 1
    db.commit()
    logger.info(f"Synced {count} live GW{gameweek} records")
    return count


def run_full_sync(db: Session) -> dict:
    """Main sync: bootstrap + fixtures + current GW live."""
    results = {}

    # 1. Bootstrap
    bootstrap = fpl_client.get_bootstrap()
    if bootstrap:
        t = sync_teams(db, bootstrap.get("teams", []))
        p = sync_players(db, bootstrap.get("elements", []), bootstrap.get("element_types", []))
        g = sync_gameweeks(db, bootstrap.get("events", []))
        results["teams"] = t
        results["players"] = p
        results["gameweeks"] = g
        _log_sync(db, "bootstrap", "success", f"{p} players, {t} teams, {g} GWs", p + t + g)
    else:
        results["error"] = "Failed to fetch bootstrap-static"
        _log_sync(db, "bootstrap", "error", "Could not reach FPL API")
        return results

    # 2. Fixtures
    fixtures = fpl_client.get_fixtures()
    if fixtures:
        f = sync_fixtures(db, fixtures)
        results["fixtures"] = f
        _log_sync(db, "fixtures", "success", f"{f} fixtures", f)
    else:
        results["fixtures_error"] = "Failed to fetch fixtures"
        _log_sync(db, "fixtures", "error", "Could not reach FPL API")

    # 3. Current GW live
    current_gw = db.query(Gameweek).filter_by(is_current=True).first()
    if current_gw:
        live = fpl_client.get_gw_live(current_gw.id)
        if live:
            lc = sync_gw_live(db, current_gw.id, live)
            results["gw_live"] = lc
            _log_sync(db, f"gw_live_{current_gw.id}", "success", f"{lc} records", lc)
        else:
            results["gw_live_error"] = f"Failed to fetch GW{current_gw.id} live"

    return results


def _log_sync(db: Session, sync_type: str, status: str, message: str, records: int = 0):
    log = SyncLog(sync_type=sync_type, status=status, message=message, records_updated=records)
    db.add(log)
    db.commit()
