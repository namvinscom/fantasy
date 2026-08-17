"""What-if simulator route."""
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import Player, UserSquad
from app.services.scoring_engine import compute_player_score, compute_recommendation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/simulator", tags=["simulator"])


class WhatIfRequest(BaseModel):
    player_out_id: int
    player_in_id: int


@router.post("/what-if")
def what_if(body: WhatIfRequest, db: Session = Depends(get_db)):
    player_out = db.get(Player, body.player_out_id)
    player_in = db.get(Player, body.player_in_id)

    if not player_out:
        raise HTTPException(status_code=404, detail=f"Player out ID {body.player_out_id} not found")
    if not player_in:
        raise HTTPException(status_code=404, detail=f"Player in ID {body.player_in_id} not found")

    squad = db.query(UserSquad).order_by(UserSquad.created_at.desc()).first()
    bank = squad.bank if squad else 0
    ft = squad.free_transfers if squad else 1

    out_bd = compute_player_score(player_out, db)
    in_bd = compute_player_score(player_in, db)

    score_diff = in_bd.total - out_bd.total
    price_diff = (player_in.price or 0) - (player_out.price or 0)
    affordable = price_diff <= bank

    # Transfer cost
    transfer_cost = 0 if ft >= 1 else 4
    net_gain = score_diff - (transfer_cost * 2)

    if not affordable:
        verdict = "AVOID"
        reason = f"Không đủ ngân sách (thiếu £{price_diff/10 - bank/10:.1f}m)"
    elif net_gain > 5:
        verdict = "BUY"
        reason = f"Score gain +{score_diff:.1f}, net gain +{net_gain:.1f} sau hit."
    elif net_gain > 0:
        verdict = "CONSIDER"
        reason = f"Score gain nhẹ (+{score_diff:.1f}). Chỉ nên làm nếu có FT."
    else:
        verdict = "HOLD"
        reason = f"Không đủ lợi ích để transfer (net: {net_gain:.1f})."

    return {
        "player_out": {
            "id": player_out.id,
            "name": player_out.web_name or player_out.name,
            "position": player_out.position,
            "price": player_out.price,
            "fpl_score": out_bd.total,
            "recommendation": compute_recommendation(out_bd.total, player_out),
            "reasons": out_bd.reasons,
            "risks": out_bd.risks,
        },
        "player_in": {
            "id": player_in.id,
            "name": player_in.web_name or player_in.name,
            "position": player_in.position,
            "price": player_in.price,
            "fpl_score": in_bd.total,
            "recommendation": compute_recommendation(in_bd.total, player_in),
            "reasons": in_bd.reasons,
            "risks": in_bd.risks,
        },
        "score_difference": round(score_diff, 1),
        "price_difference": price_diff,
        "affordable": affordable,
        "transfer_cost": transfer_cost,
        "net_gain": round(net_gain, 1),
        "verdict": verdict,
        "reason": reason,
    }
