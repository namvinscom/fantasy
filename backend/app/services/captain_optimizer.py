"""Captain optimizer — scores captain candidates and recommends best pick."""
import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Fixture, Gameweek, Player, SquadPlayer, UserSquad
from app.services.scoring_engine import compute_player_score

logger = logging.getLogger(__name__)

ATTACKING_POSITIONS = {"MID", "FWD"}


@dataclass
class CaptainCandidate:
    player_id: int
    player_name: str
    position: str
    price: int
    captain_score: float
    base_fpl_score: float
    fixture_difficulty: Optional[int]
    is_home: Optional[bool]
    ownership: Optional[float]
    form: Optional[float]
    reasons: list[str]
    risks: list[str]


def get_captain_candidates(
    db: Session,
    squad: UserSquad,
    top_n: int = 5,
) -> list[CaptainCandidate]:
    current_gw_obj = db.query(Gameweek).filter_by(is_current=True).first()
    if not current_gw_obj:
        current_gw_obj = db.query(Gameweek).filter_by(is_next=True).first()
    current_gw = current_gw_obj.id if current_gw_obj else 1

    candidates: list[CaptainCandidate] = []

    for sp in squad.players:
        if not sp.is_starting:
            continue
        player = db.get(Player, sp.player_id)
        if not player:
            continue

        # Only attacking/creative players considered for captaincy
        if player.position not in ATTACKING_POSITIONS:
            if (player.goals_scored or 0) + (player.assists or 0) < 3:
                continue

        bd = compute_player_score(player, db)
        base_score = bd.total

        # Captain scoring modifiers
        captain_score = base_score

        # Home game bonus
        fixture = (
            db.query(Fixture)
            .filter(
                Fixture.gameweek == current_gw,
                Fixture.finished == False,
            )
            .filter(
                (Fixture.team_h == player.team_id) | (Fixture.team_a == player.team_id)
            )
            .first()
        )
        is_home = None
        fdr = None
        if fixture:
            is_home = fixture.team_h == player.team_id
            fdr = fixture.team_h_difficulty if is_home else fixture.team_a_difficulty
            if is_home:
                captain_score += 3  # home bonus
            if fdr and fdr <= 2:
                captain_score += 5  # easy fixture bonus

        # Ownership safe-pick modifier
        sel = player.selected_by_percent or 0
        if sel >= 30:
            captain_score += 2

        # xGI modifier
        xgi = (player.expected_goals or 0) + (player.expected_assists or 0)
        if xgi > 0.5:
            captain_score += xgi * 3

        reasons: list[str] = []
        risks: list[str] = []

        if is_home:
            reasons.append("Sân nhà")
        if fdr and fdr <= 2:
            reasons.append(f"FDR thấp ({fdr}/5)")
        if (player.form or 0) >= 7:
            reasons.append(f"Form tốt ({player.form:.1f})")
        if xgi > 0.5:
            reasons.append(f"xGI cao ({xgi:.2f})")
        if sel >= 30:
            reasons.append(f"Ownership cao ({sel:.1f}%)")

        if fdr and fdr >= 4:
            risks.append(f"Fixture khó (FDR {fdr}/5)")
        if not is_home:
            risks.append("Sân khách")
        if player.chance_of_playing_next_round is not None and player.chance_of_playing_next_round < 100:
            risks.append(f"Fitness risk ({player.chance_of_playing_next_round}%)")

        candidates.append(
            CaptainCandidate(
                player_id=player.id,
                player_name=player.web_name or player.name,
                position=player.position or "?",
                price=player.price or 0,
                captain_score=round(min(captain_score, 100), 1),
                base_fpl_score=base_score,
                fixture_difficulty=fdr,
                is_home=is_home,
                ownership=player.selected_by_percent,
                form=player.form,
                reasons=reasons,
                risks=risks,
            )
        )

    candidates.sort(key=lambda c: c.captain_score, reverse=True)
    return candidates[:top_n]
