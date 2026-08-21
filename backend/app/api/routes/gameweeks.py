"""Gameweek routes."""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import Gameweek
from app.services.data_ingestion import sync_gw_live
from app.services.fpl_client import fpl_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gameweeks", tags=["gameweeks"])


def _gw_to_dict(gw: Gameweek) -> dict:
    return {
        "id": gw.id,
        "name": gw.name,
        "deadline_time": gw.deadline_time.isoformat() if gw.deadline_time else None,
        "finished": gw.finished,
        "is_current": gw.is_current,
        "is_next": gw.is_next,
        "is_previous": gw.is_previous,
        "average_entry_score": gw.average_entry_score,
        "highest_score": gw.highest_score,
        "top_element": gw.top_element,
    }


@router.get("")
def list_gameweeks(db: Session = Depends(get_db)):
    gws = db.query(Gameweek).order_by(Gameweek.id).all()
    return [_gw_to_dict(gw) for gw in gws]


@router.get("/current")
def current_gameweek(db: Session = Depends(get_db)):
    gw = db.query(Gameweek).filter_by(is_current=True).first()
    if not gw:
        gw = db.query(Gameweek).filter_by(is_next=True).first()
    if not gw:
        raise HTTPException(status_code=404, detail="No current gameweek found. Please sync first.")
    return _gw_to_dict(gw)


@router.get("/{gw_id}")
def get_gameweek(gw_id: int, db: Session = Depends(get_db)):
    gw = db.get(Gameweek, gw_id)
    if not gw:
        raise HTTPException(status_code=404, detail="Gameweek not found")
    return _gw_to_dict(gw)


@router.post("/{gw_id}/sync-live")
def sync_live_gw(gw_id: int, db: Session = Depends(get_db)):
    live = fpl_client.get_gw_live(gw_id)
    if not live:
        raise HTTPException(status_code=502, detail=f"Could not fetch GW{gw_id} live data from FPL")
    count = sync_gw_live(db, gw_id, live)
    return {"gameweek": gw_id, "records_updated": count}


@router.get("/chip-planner/data")
def chip_planner_data(db: Session = Depends(get_db)):
    """Return BGW/DGW data, squad horizon, and recommendations for chip planner."""
    from app.services.chip_planner import analyze_chip_strategy
    return analyze_chip_strategy(db)

