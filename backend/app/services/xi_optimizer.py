"""Starting XI Optimizer — selects the best 11 from a 15-player squad."""
import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Player, SquadPlayer, UserSquad
from app.services.scoring_engine import compute_player_score

logger = logging.getLogger(__name__)

VALID_FORMATIONS = [
    "3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"
]


def _normalize_position(position: str | None) -> str:
    return "GK" if (position or "").upper() == "GKP" else (position or "").upper()


@dataclass
class FormationResult:
    formation: str
    gk: list[dict]
    defenders: list[dict]
    midfielders: list[dict]
    forwards: list[dict]
    bench: list[dict]
    total_score: float
    captain_id: Optional[int] = None
    vice_captain_id: Optional[int] = None


def _player_to_dict(p: Player, score: float, is_captain: bool = False, is_vc: bool = False) -> dict:
    return {
        "id": p.id,
        "name": p.web_name or p.name,
        "position": _normalize_position(p.position),
        "price": p.price,
        "team_id": p.team_id,
        "fpl_score": score,
        "is_captain": is_captain,
        "is_vice_captain": is_vc,
        "status": p.status,
        "form": p.form,
        "chance_of_playing": p.chance_of_playing_next_round,
    }


def optimize_xi(db: Session, squad: UserSquad) -> FormationResult:
    """Find optimal starting XI and bench from 15-player squad."""
    squad_players: list[tuple[Player, float]] = []
    for sp in squad.players:
        p = db.get(Player, sp.player_id)
        if not p:
            continue
        score = compute_player_score(p, db).total
        squad_players.append((p, score))

    by_pos: dict[str, list[tuple[Player, float]]] = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p, s in squad_players:
        pos = _normalize_position(p.position) or "MID"
        if pos in by_pos:
            by_pos[pos].append((p, s))

    # Sort each position by score descending
    for pos in by_pos:
        by_pos[pos].sort(key=lambda x: x[1], reverse=True)

    best_result: Optional[FormationResult] = None

    for formation in VALID_FORMATIONS:
        parts = formation.split("-")
        nd, nm, nf = int(parts[0]), int(parts[1]), int(parts[2])

        # Need exactly 1 GK, nd DEF, nm MID, nf FWD
        if (
            len(by_pos["GK"]) < 1
            or len(by_pos["DEF"]) < nd
            or len(by_pos["MID"]) < nm
            or len(by_pos["FWD"]) < nf
        ):
            continue

        gk_list = by_pos["GK"][:1]
        def_list = by_pos["DEF"][:nd]
        mid_list = by_pos["MID"][:nm]
        fwd_list = by_pos["FWD"][:nf]

        starting = gk_list + def_list + mid_list + fwd_list
        starting_ids = {p.id for p, _ in starting}
        bench_players = [(p, s) for p, s in squad_players if p.id not in starting_ids]

        # Sort bench: GK last
        bench_gk = [(p, s) for p, s in bench_players if _normalize_position(p.position) == "GK"]
        bench_outfield = sorted(
            [(p, s) for p, s in bench_players if _normalize_position(p.position) != "GK"],
            key=lambda x: x[1],
            reverse=True,
        )
        bench_ordered = bench_outfield + bench_gk

        total_score = sum(s for _, s in starting)

        result = FormationResult(
            formation=formation,
            gk=[_player_to_dict(p, s) for p, s in gk_list],
            defenders=[_player_to_dict(p, s) for p, s in def_list],
            midfielders=[_player_to_dict(p, s) for p, s in mid_list],
            forwards=[_player_to_dict(p, s) for p, s in fwd_list],
            bench=[_player_to_dict(p, s) for p, s in bench_ordered],
            total_score=round(total_score, 1),
        )

        if best_result is None or total_score > best_result.total_score:
            best_result = result

    if best_result is None:
        # Fallback: 4-4-2 with whatever we have
        best_result = FormationResult(
            formation="4-4-2",
            gk=[], defenders=[], midfielders=[], forwards=[],
            bench=[], total_score=0.0,
        )

    return best_result
