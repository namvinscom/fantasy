"""Transfer optimizer — finds best in/out pairs for current squad."""
import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Player, SquadPlayer, UserSquad
from app.services.scoring_engine import compute_player_score

logger = logging.getLogger(__name__)


@dataclass
class TransferSuggestion:
    player_out_id: int
    player_out_name: str
    player_out_price: int
    player_out_score: float
    player_in_id: int
    player_in_name: str
    player_in_price: int
    player_in_score: float
    horizon_fdr_out: float
    horizon_fdr_in: float
    budget_delta: int           # positive = money returned
    score_gain: float
    transfer_cost: int          # 0 or 4
    net_gain: float             # score_gain - transfer_cost penalty
    confidence: int
    recommendation: str         # BUY / HOLD
    reason: str


def get_transfer_suggestions(
    db: Session,
    squad: UserSquad,
    free_transfers: int = 1,
    num_suggestions: int = 5,
) -> list[TransferSuggestion]:
    """Find best transfer(s) for a squad."""
    from app.services.scoring_engine import get_scoring_context
    ctx = get_scoring_context(db)
    current_gw_id = ctx.current_gw if ctx.current_gw else 1
    horizon_gws = list(range(current_gw_id, min(current_gw_id + 5, 39)))

    def get_player_fdr(p: Player) -> float:
        fdr_sum = 0
        valid = 0
        for h_gw in horizon_gws:
            p_fixtures = [f for f in ctx.fixtures_by_team.get(p.team_id, []) if f.gameweek == h_gw]
            if not p_fixtures:
                fdr_sum += 5.0
                valid += 1
            else:
                for f in p_fixtures:
                    fdr_sum += f.team_h_difficulty if f.team_h == p.team_id else f.team_a_difficulty
                    valid += 1
        return round(fdr_sum / valid, 2) if valid > 0 else 3.0

    squad_player_ids = {sp.player_id for sp in squad.players}
    squad_players_by_id: dict[int, SquadPlayer] = {sp.player_id: sp for sp in squad.players}
    bank = squad.bank or 0

    suggestions: list[TransferSuggestion] = []

    for sp in squad.players:
        player_out = db.get(Player, sp.player_id)
        if not player_out:
            continue
        out_score_bd = compute_player_score(player_out, db)
        out_score = out_score_bd.total
        out_fdr = get_player_fdr(player_out)
        budget_available = bank + (sp.selling_price or sp.purchase_price or player_out.price or 0)

        # Find candidates in same position within budget
        candidates = (
            db.query(Player)
            .filter(
                Player.position == player_out.position,
                Player.id.notin_(squad_player_ids),
                Player.price <= budget_available,
                Player.status.in_(["a", "d"]),
            )
            .order_by(Player.total_points.desc())
            .limit(30)
            .all()
        )

        for candidate in candidates:
            in_score_bd = compute_player_score(candidate, db)
            in_score = in_score_bd.total
            in_fdr = get_player_fdr(candidate)

            score_gain = in_score - out_score
            if score_gain <= 3:  # Only suggest meaningful upgrades
                continue

            # Determine transfer cost
            num_transfers = 1  # one transfer at a time
            transfer_cost = max(0, (num_transfers - free_transfers)) * 4
            # Net gain: deduct hit cost as score penalty (4 pts ≈ 8 score points)
            net_gain = score_gain - (transfer_cost * 2)

            if net_gain <= 0:
                continue

            rec = "BUY" if net_gain >= 5 else "HOLD"
            reason = (
                f"Score gain +{score_gain:.1f}. "
                f"{'Free transfer.' if transfer_cost == 0 else f'-{transfer_cost} hit.'} "
                f"Net gain: {net_gain:.1f}"
            )

            suggestions.append(
                TransferSuggestion(
                    player_out_id=player_out.id,
                    player_out_name=player_out.web_name or player_out.name,
                    player_out_price=sp.selling_price or player_out.price or 0,
                    player_out_score=out_score,
                    player_in_id=candidate.id,
                    player_in_name=candidate.web_name or candidate.name,
                    player_in_price=candidate.price or 0,
                    player_in_score=in_score,
                    horizon_fdr_out=out_fdr,
                    horizon_fdr_in=in_fdr,
                    budget_delta=budget_available - (candidate.price or 0),
                    score_gain=round(score_gain, 1),
                    transfer_cost=transfer_cost,
                    net_gain=round(net_gain, 1),
                    confidence=in_score_bd.confidence,
                    recommendation=rec,
                    reason=reason,
                )
            )

    suggestions.sort(key=lambda x: x.net_gain, reverse=True)
    return suggestions[:num_suggestions]


def evaluate_hit(
    db: Session,
    squad: UserSquad,
    transfers: list[tuple[int, int]],
    free_transfers: int,
) -> dict:
    """
    Evaluate whether taking a hit is worth it.
    transfers: list of (player_out_id, player_in_id)
    """
    num_free = free_transfers
    num_transfers = len(transfers)
    hit_count = max(0, num_transfers - num_free)
    hit_cost = hit_count * 4

    total_score_gain = 0.0
    transfer_details = []

    for out_id, in_id in transfers:
        player_out = db.get(Player, out_id)
        player_in = db.get(Player, in_id)
        if not player_out or not player_in:
            continue
        out_score = compute_player_score(player_out, db).total
        in_score = compute_player_score(player_in, db).total
        gain = in_score - out_score
        total_score_gain += gain
        transfer_details.append({
            "out": player_out.web_name,
            "in": player_in.web_name,
            "score_gain": round(gain, 1),
        })

    # 4 pts hit ≈ 8 score points penalty
    net_gain = total_score_gain - (hit_cost * 2)
    take_hit = net_gain > 0 and hit_cost > 0

    return {
        "num_transfers": num_transfers,
        "free_transfers": num_free,
        "hit_count": hit_count,
        "hit_cost": hit_cost,
        "total_score_gain": round(total_score_gain, 1),
        "net_gain": round(net_gain, 1),
        "verdict": "Take the hit" if take_hit else "Do not take the hit",
        "explanation": (
            f"Expected score gain: +{total_score_gain:.1f}, "
            f"Hit penalty: -{hit_cost * 2:.0f} score pts. "
            f"Net: {net_gain:+.1f}"
        ),
        "transfers": transfer_details,
    }
