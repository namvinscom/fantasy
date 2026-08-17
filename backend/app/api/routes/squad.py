"""Squad management routes — save, load, optimize XI, captain."""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import Gameweek, Player, SquadPlayer, UserSquad
from app.services.captain_optimizer import get_captain_candidates
from app.services.transfer_optimizer import evaluate_hit, get_transfer_suggestions
from app.services.xi_optimizer import optimize_xi

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/squad", tags=["squad"])


# --- Pydantic schemas ---

class ImportSquadRequest(BaseModel):
    team_id: str

class SquadPlayerIn(BaseModel):
    player_id: int
    is_starting: bool = True
    is_captain: bool = False
    is_vice_captain: bool = False
    bench_order: Optional[int] = None
    purchase_price: Optional[int] = None
    selling_price: Optional[int] = None


class SaveSquadRequest(BaseModel):
    gameweek: int
    fpl_team_id: Optional[str] = None
    team_value: Optional[int] = None
    bank: Optional[int] = None
    free_transfers: int = 1
    overall_rank: Optional[int] = None
    gameweek_rank: Optional[int] = None
    total_points: Optional[int] = None
    gameweek_points: Optional[int] = None
    formation: Optional[str] = None
    wildcard_1_used: bool = False
    wildcard_2_used: bool = False
    freehit_1_used: bool = False
    freehit_2_used: bool = False
    bench_boost_used: bool = False
    triple_captain_used: bool = False
    players: list[SquadPlayerIn]


class HitEvalRequest(BaseModel):
    transfers: list[tuple[int, int]]  # [(out_id, in_id), ...]
    free_transfers: Optional[int] = None


# --- Helpers ---

def _normalize_position(position: str | None) -> str:
    return "GK" if (position or "").upper() == "GKP" else (position or "").upper()


def _squad_to_dict(squad: UserSquad, db: Session) -> dict:
    players_out = []
    for sp in squad.players:
        p = db.get(Player, sp.player_id)
        if p:
            players_out.append({
                "player_id": p.id,
                "name": p.name,
                "web_name": p.web_name,
                "position": _normalize_position(p.position),
                "team_id": p.team_id,
                "price": sp.selling_price or p.price,
                "purchase_price": sp.purchase_price,
                "is_starting": sp.is_starting,
                "is_captain": sp.is_captain,
                "is_vice_captain": sp.is_vice_captain,
                "bench_order": sp.bench_order,
                "status": p.status,
                "news": p.news,
                "chance_of_playing": p.chance_of_playing_next_round,
                "fpl_score": p.fpl_score,
                "form": p.form,
            })

    return {
        "id": squad.id,
        "gameweek": squad.gameweek,
        "fpl_team_id": squad.fpl_team_id,
        "team_value": squad.team_value,
        "bank": squad.bank,
        "free_transfers": squad.free_transfers,
        "overall_rank": squad.overall_rank,
        "gameweek_rank": squad.gameweek_rank,
        "total_points": squad.total_points,
        "gameweek_points": squad.gameweek_points,
        "formation": squad.formation,
        "chips": {
            "wildcard_1": squad.wildcard_1_used,
            "wildcard_2": squad.wildcard_2_used,
            "freehit_1": squad.freehit_1_used,
            "freehit_2": squad.freehit_2_used,
            "bench_boost": squad.bench_boost_used,
            "triple_captain": squad.triple_captain_used,
        },
        "players": players_out,
    }


# --- Routes ---

@router.get("")
def get_squad(db: Session = Depends(get_db)):
    """Return most recent squad."""
    squad = db.query(UserSquad).order_by(UserSquad.created_at.desc()).first()
    if not squad:
        return {"message": "No squad saved yet. Please set up your squad.", "squad": None}
    return _squad_to_dict(squad, db)


@router.post("")
def save_squad(body: SaveSquadRequest, db: Session = Depends(get_db)):
    """Save or update squad for a given GW."""
    # Validate player count
    if len(body.players) != 15:
        raise HTTPException(status_code=400, detail=f"Squad must have exactly 15 players, got {len(body.players)}")

    # Validate all players exist
    for sp in body.players:
        p = db.get(Player, sp.player_id)
        if not p:
            raise HTTPException(status_code=400, detail=f"Player ID {sp.player_id} not found")

    # Check for existing squad this GW (update if exists)
    squad = db.query(UserSquad).filter_by(gameweek=body.gameweek).first()
    if not squad:
        squad = UserSquad(gameweek=body.gameweek)
        db.add(squad)

    squad.fpl_team_id = body.fpl_team_id
    squad.team_value = body.team_value
    squad.bank = body.bank
    squad.free_transfers = body.free_transfers
    squad.overall_rank = body.overall_rank
    squad.gameweek_rank = body.gameweek_rank
    squad.total_points = body.total_points
    squad.gameweek_points = body.gameweek_points
    squad.formation = body.formation
    squad.wildcard_1_used = body.wildcard_1_used
    squad.wildcard_2_used = body.wildcard_2_used
    squad.freehit_1_used = body.freehit_1_used
    squad.freehit_2_used = body.freehit_2_used
    squad.bench_boost_used = body.bench_boost_used
    squad.triple_captain_used = body.triple_captain_used
    db.flush()

    # Replace squad players
    for sp in squad.players:
        db.delete(sp)
    db.flush()

    for sp_in in body.players:
        sp = SquadPlayer(
            squad_id=squad.id,
            player_id=sp_in.player_id,
            is_starting=sp_in.is_starting,
            is_captain=sp_in.is_captain,
            is_vice_captain=sp_in.is_vice_captain,
            bench_order=sp_in.bench_order,
            purchase_price=sp_in.purchase_price,
            selling_price=sp_in.selling_price,
        )
        db.add(sp)

    db.commit()
    db.refresh(squad)
    return {"message": "Squad saved", "squad_id": squad.id}


@router.get("/xi")
def get_optimal_xi(db: Session = Depends(get_db)):
    """Return optimal starting XI recommendation."""
    squad = db.query(UserSquad).order_by(UserSquad.created_at.desc()).first()
    if not squad:
        raise HTTPException(status_code=404, detail="No squad found. Please save your squad first.")
    result = optimize_xi(db, squad)
    return {
        "formation": result.formation,
        "gk": result.gk,
        "defenders": result.defenders,
        "midfielders": result.midfielders,
        "forwards": result.forwards,
        "bench": result.bench,
        "total_score": result.total_score,
    }


@router.get("/captain")
def get_captain_picks(db: Session = Depends(get_db)):
    """Return top captain candidates."""
    squad = db.query(UserSquad).order_by(UserSquad.created_at.desc()).first()
    if not squad:
        raise HTTPException(status_code=404, detail="No squad found.")
    candidates = get_captain_candidates(db, squad)
    if not candidates:
        return {"candidates": [], "recommended_captain": None, "recommended_vc": None}

    return {
        "candidates": [
            {
                "rank": i + 1,
                "player_id": c.player_id,
                "player_name": c.player_name,
                "position": _normalize_position(c.position),
                "captain_score": c.captain_score,
                "base_fpl_score": c.base_fpl_score,
                "fixture_difficulty": c.fixture_difficulty,
                "is_home": c.is_home,
                "ownership": c.ownership,
                "form": c.form,
                "reasons": c.reasons,
                "risks": c.risks,
            }
            for i, c in enumerate(candidates)
        ],
        "recommended_captain": candidates[0].player_name if candidates else None,
        "recommended_vc": candidates[1].player_name if len(candidates) > 1 else None,
    }


@router.get("/transfers")
def get_transfer_recommendations(db: Session = Depends(get_db)):
    """Return top transfer suggestions for current squad."""
    squad = db.query(UserSquad).order_by(UserSquad.created_at.desc()).first()
    if not squad:
        raise HTTPException(status_code=404, detail="No squad found.")
    suggestions = get_transfer_suggestions(db, squad, free_transfers=squad.free_transfers or 1)
    return {
        "free_transfers": squad.free_transfers,
        "bank": squad.bank,
        "suggestions": [
            {
                "player_out": s.player_out_name,
                "player_out_id": s.player_out_id,
                "player_out_price": s.player_out_price,
                "player_out_score": s.player_out_score,
                "player_in": s.player_in_name,
                "player_in_id": s.player_in_id,
                "player_in_price": s.player_in_price,
                "player_in_score": s.player_in_score,
                "score_gain": s.score_gain,
                "transfer_cost": s.transfer_cost,
                "net_gain": s.net_gain,
                "confidence": s.confidence,
                "recommendation": s.recommendation,
                "reason": s.reason,
            }
            for s in suggestions
        ],
    }


@router.post("/hit-calculator")
def hit_calculator(body: HitEvalRequest, db: Session = Depends(get_db)):
    """Evaluate whether taking a hit is worth it."""
    squad = db.query(UserSquad).order_by(UserSquad.created_at.desc()).first()
    ft = body.free_transfers if body.free_transfers is not None else (squad.free_transfers if squad else 1)
    result = evaluate_hit(db, squad, body.transfers, ft)
    return result

@router.post("/import")
def import_squad_from_fpl(body: ImportSquadRequest, db: Session = Depends(get_db)):
    """Import squad directly from FPL using Team ID."""
    from app.services.fpl_client import fpl_client
    
    current_gw = db.query(Gameweek).filter_by(is_current=True).first()
    gw_id = current_gw.id if current_gw else 1
    
    # Check if we can get picks
    data = fpl_client.get_entry_picks(body.team_id, gw_id)
    if not data:
        # Sometimes FPL API resets, or team hasn't played GW1
        raise HTTPException(status_code=400, detail="Không thể tải dữ liệu đội. Kiểm tra lại ID hoặc chờ GW đầu tiên bắt đầu.")

    history = data.get("entry_history", {})
    picks = data.get("picks", [])
    
    if not picks:
        raise HTTPException(status_code=400, detail="Đội hình trống.")

    # Create SaveSquadRequest data internally
    players_in = []
    for p in picks:
        players_in.append(SquadPlayerIn(
            player_id=p["element"],
            is_starting=p["position"] <= 11,
            is_captain=p.get("is_captain", False),
            is_vice_captain=p.get("is_vice_captain", False),
            bench_order=None if p["position"] <= 11 else p["position"] - 11
        ))
        
    save_req = SaveSquadRequest(
        gameweek=gw_id,
        fpl_team_id=body.team_id,
        team_value=history.get("value", 1000),
        bank=history.get("bank", 0),
        free_transfers=1, # FPL API doesn't expose FT directly in picks
        overall_rank=history.get("overall_rank"),
        gameweek_rank=history.get("rank"),
        total_points=history.get("total_points"),
        gameweek_points=history.get("points"),
        players=players_in
    )
    
    return save_squad(save_req, db)
