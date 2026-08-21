"""Players routes — list, filter, score, detail."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db
from app.db.models import Gameweek, Player, Team
from app.services.scoring_engine import compute_player_score, compute_recommendation, get_scoring_context
from fastapi_cache.decorator import cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/players", tags=["players"])

FPL_PHOTO_BASE = "https://resources.premierleague.com/premierleague/photos/players/110x140/p{code}.png"
FPL_SHIRT_BASE = "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{team_code}-66.png"

SORT_COLUMNS = {
    "fpl_score": Player.fpl_score,
    "total_points": Player.total_points,
    "price": Player.price,
    "form": Player.form,
    "ownership": Player.selected_by_percent,
    "expected_goals": Player.expected_goals,
    "expected_assists": Player.expected_assists,
}


def _normalize_position(position: str | None) -> str:
    return "GK" if (position or "").upper() == "GKP" else (position or "").upper()


def _player_to_dict(p: Player, include_score: bool = True, db: Session | None = None) -> dict:
    team_name = p.team_rel.name if p.team_rel else ""
    team_short = p.team_rel.short_name if p.team_rel else ""
    d = {
        "id": p.id,
        "name": p.name,
        "web_name": p.web_name,
        "team_id": p.team_id,
        "team_name": team_name,
        "team_short": team_short,
        "position": _normalize_position(p.position),
        "price": p.price,
        "price_display": f"£{(p.price or 0) / 10:.1f}m",
        "total_points": p.total_points,
        "event_points": p.event_points,
        "form": p.form,
        "selected_by_percent": p.selected_by_percent,
        "minutes": p.minutes,
        "goals_scored": p.goals_scored,
        "assists": p.assists,
        "clean_sheets": p.clean_sheets,
        "bonus": p.bonus,
        "expected_goals": p.expected_goals,
        "expected_assists": p.expected_assists,
        "expected_goal_involvements": p.expected_goal_involvements,
        "expected_goals_conceded": p.expected_goals_conceded,
        "news": p.news,
        "chance_of_playing_next_round": p.chance_of_playing_next_round,
        "chance_of_playing_this_round": p.chance_of_playing_this_round,
        "status": p.status,
        "fpl_score": p.fpl_score,
    }
    return d


@router.get("")
@cache(expire=3600)
def list_players(
    db: Session = Depends(get_db),
    position: Optional[str] = Query(None, description="GK/DEF/MID/FWD"),
    team_id: Optional[int] = Query(None),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="a/d/i"),
    sort_by: str = Query("fpl_score", enum=list(SORT_COLUMNS.keys())),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=1000),
    offset: int = Query(0),
):
    q = db.query(Player).options(joinedload(Player.team_rel))

    if position:
        normalized_position = _normalize_position(position)
        if normalized_position == "GK":
            q = q.filter(Player.position.in_(["GK", "GKP"]))
        else:
            q = q.filter(Player.position == normalized_position)
    if team_id:
        q = q.filter(Player.team_id == team_id)
    if min_price:
        q = q.filter(Player.price >= min_price)
    if max_price:
        q = q.filter(Player.price <= max_price)
    if status:
        q = q.filter(Player.status == status)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(Player.name.ilike(term), Player.web_name.ilike(term)))

    col = SORT_COLUMNS.get(sort_by, Player.fpl_score)
    q = q.order_by(col.desc().nullslast())

    total = q.count()
    players = q.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "players": [_player_to_dict(p) for p in players],
    }


@router.get("/{player_id}")
def get_player(player_id: int, db: Session = Depends(get_db)):
    p = db.get(Player, player_id)
    if not p:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")

    bd = compute_player_score(p, db)
    rec = compute_recommendation(bd.total, p)

    return {
        **_player_to_dict(p),
        "score_breakdown": {
            "total": bd.total,
            "fixture": bd.fixture,
            "xg_xa": bd.xg_xa,
            "role": bd.role,
            "team_strength": bd.team_strength,
            "form": bd.form,
        },
        "reasons": bd.reasons,
        "risks": bd.risks,
        "confidence": bd.confidence,
        "recommendation": rec,
    }


@router.post("/compute-scores")
def compute_all_scores(db: Session = Depends(get_db)):
    """Recompute FPL scores for all players and persist to DB."""
    ctx = get_scoring_context(db)
    players = db.query(Player).all()
    updated = 0
    for p in players:
        bd = compute_player_score(p, db=db, ctx=ctx)
        p.fpl_score = bd.total
        updated += 1
    db.commit()
    return {"updated": updated}
