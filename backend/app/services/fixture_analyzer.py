"""Fixture analyzer — FDR heatmap and fixture swing alerts."""
import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Fixture, Gameweek, Team

logger = logging.getLogger(__name__)

FDR_LABELS = {1: "Dễ", 2: "Dễ vừa", 3: "Trung bình", 4: "Khó", 5: "Rất khó"}
FDR_COLORS = {1: "green", 2: "green", 3: "yellow", 4: "red", 5: "red"}


@dataclass
class TeamFixtureWindow:
    team_id: int
    team_name: str
    team_short: str
    gw_fixtures: list[dict]  # per GW: {gw, opponent_short, fdr, is_home, color, label}
    avg_fdr_3: Optional[float] = None
    avg_fdr_5: Optional[float] = None
    avg_fdr_8: Optional[float] = None
    swing_alert: Optional[str] = None
    alert_type: Optional[str] = None
    alert_severity: Optional[str] = None
    fixture_score: Optional[float] = None


def _get_start_gw(db: Session) -> int:
    current_gw_obj = db.query(Gameweek).filter_by(is_current=True).first()
    if not current_gw_obj:
        current_gw_obj = db.query(Gameweek).filter_by(is_next=True).first()
    return current_gw_obj.id if current_gw_obj else 1


def _avg(values: list[float]) -> Optional[float]:
    return round(sum(values) / len(values), 2) if values else None


def _window_score(avg_fdr: Optional[float]) -> Optional[float]:
    if avg_fdr is None:
        return None
    return round(max(0.0, min(100.0, ((5 - avg_fdr) / 4) * 100)), 1)


def _build_alert(start_gw: int, gw_fdrs: list[dict]) -> tuple[Optional[str], Optional[str], Optional[str]]:
    if not gw_fdrs:
        return None, None, None

    fdrs = [row["fdr"] for row in gw_fdrs]
    first3 = fdrs[:3]
    first5 = fdrs[:5]
    later = fdrs[3:6]
    avg3 = _avg(first3)
    avg5 = _avg(first5)
    avg_later = _avg(later)

    if any(row.get("fixture_count", 1) == 0 for row in gw_fdrs[:5]):
        return "blank_or_double", "avoid", "Có blank GW trong 5 vòng tới. Tránh pick nếu không có bench cover."
    if any(row.get("fixture_count", 1) > 1 for row in gw_fdrs[:5]):
        return "blank_or_double", "buy", "Có double GW trong 5 vòng tới. Ưu tiên cầu thủ đá chính ổn định."

    if avg3 is not None and avg3 <= 2.35:
        return "good_run", "buy", "Lịch 3 GW tới đẹp. Có thể ưu tiên mua/pick sớm."
    if avg3 is not None and avg3 >= 3.75:
        return "bad_run", "avoid", "Lịch 3 GW tới khó. Hạn chế pick mới."

    if avg5 is not None and avg5 <= 2.6:
        return "good_run", "watch", "Lịch 5 GW tới khá dễ. Đáng theo dõi để pick."
    if avg5 is not None and avg5 >= 3.5:
        return "bad_run", "sell", "Lịch 5 GW tới nặng. Cân nhắc tránh hoặc bán."

    if avg3 is not None and avg_later is not None:
        diff = avg_later - avg3
        swing_gw = start_gw + 3
        if diff >= 1.0:
            return "swing_up", "sell", f"Lịch khó lên từ GW{swing_gw}. Không nên mua trễ."
        if diff <= -1.0:
            return "swing_down", "watch", f"Lịch dễ hơn từ GW{swing_gw}. Có thể chuẩn bị mua sớm."

    return None, None, None


def get_fixture_difficulty_table(
    db: Session,
    num_gw: int = 8,
) -> list[TeamFixtureWindow]:
    start_gw = _get_start_gw(db)

    teams = db.query(Team).all()
    team_map: dict[int, Team] = {t.id: t for t in teams}

    results: list[TeamFixtureWindow] = []

    for team in teams:
        fixtures = (
            db.query(Fixture)
            .filter(
                Fixture.gameweek >= start_gw,
                Fixture.gameweek < start_gw + num_gw,
            )
            .filter(
                (Fixture.team_h == team.id) | (Fixture.team_a == team.id)
            )
            .order_by(Fixture.gameweek)
            .all()
        )

        fixtures_by_gw: dict[int, list[Fixture]] = {}
        for fix in fixtures:
            fixtures_by_gw.setdefault(fix.gameweek, []).append(fix)

        gw_fixtures: list[dict] = []
        fdrs: list[float] = []

        for gw in range(start_gw, start_gw + num_gw):
            gw_items = fixtures_by_gw.get(gw, [])
            if not gw_items:
                gw_fixtures.append({
                    "gw": gw,
                    "opponent_id": None,
                    "opponent_short": "BLANK",
                    "fdr": 5,
                    "is_home": None,
                    "color": "red",
                    "label": "Blank GW",
                    "fixture_count": 0,
                })
                fdrs.append(5)
                continue

            fixture_labels: list[str] = []
            gw_fdr_values: list[int] = []
            is_home_for_label = None
            opp_id_for_label = None
            for fix in gw_items:
                is_home = fix.team_h == team.id
                opp_id = fix.team_a if is_home else fix.team_h
                opp = team_map.get(opp_id)
                fdr = (fix.team_h_difficulty if is_home else fix.team_a_difficulty) or 3
                gw_fdr_values.append(fdr)
                fixture_labels.append((opp.short_name if opp else "?") + (" (H)" if is_home else " (A)"))
                is_home_for_label = is_home if len(gw_items) == 1 else None
                opp_id_for_label = opp_id if len(gw_items) == 1 else None

            fdr = round(sum(gw_fdr_values) / len(gw_fdr_values), 2)
            fdrs.append(fdr)
            gw_fixtures.append({
                "gw": gw,
                "opponent_id": opp_id_for_label,
                "opponent_short": " + ".join(fixture_labels),
                "fdr": fdr,
                "is_home": is_home_for_label,
                "color": FDR_COLORS.get(round(fdr), "yellow"),
                "label": FDR_LABELS.get(round(fdr), "?"),
                "fixture_count": len(gw_items),
            })

        avg3 = _avg(fdrs[:3])
        avg5 = _avg(fdrs[:5])
        avg8 = _avg(fdrs)
        alert_type, severity, swing = _build_alert(start_gw, gw_fixtures)

        results.append(
            TeamFixtureWindow(
                team_id=team.id,
                team_name=team.name,
                team_short=team.short_name or team.name[:3].upper(),
                gw_fixtures=gw_fixtures,
                avg_fdr_3=avg3,
                avg_fdr_5=avg5,
                avg_fdr_8=avg8,
                swing_alert=swing,
                alert_type=alert_type,
                alert_severity=severity,
                fixture_score=_window_score(avg5),
            )
        )

    results.sort(key=lambda r: r.avg_fdr_5 or 99)
    return results
