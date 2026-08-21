"""Sync routes — trigger FPL data fetch and report status."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.database import SessionLocal
from app.db.models import SyncLog, Player
from app.services.data_ingestion import run_full_sync
from app.services.fpl_client import clear_cache
from app.services.scoring_engine import compute_player_score, get_scoring_context

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sync", tags=["sync"])

# Simple in-memory flag for sync status
is_syncing = False

def _as_utc_iso(value):
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def run_sync_task():
    global is_syncing
    is_syncing = True
    db = SessionLocal()
    try:
        # 1. Fetch data
        run_full_sync(db)
        
        # 2. Recompute FPL scores
        ctx = get_scoring_context(db)
        players = db.query(Player).all()
        for p in players:
            bd = compute_player_score(p, db=db, ctx=ctx)
            p.fpl_score = bd.total
        db.commit()
        
        # 3. Clear cache
        from fastapi_cache import FastAPICache
        FastAPICache.clear(namespace="fpl-cache")
        logger.info("FastAPI Cache cleared.")
    except Exception as e:
        logger.error(f"Background sync failed: {e}")
    finally:
        db.close()
        is_syncing = False

@router.post("")
def trigger_sync(background_tasks: BackgroundTasks):
    """Trigger a full FPL data sync."""
    global is_syncing
    if is_syncing:
        return {"status": "processing", "message": "Sync is already running."}

    logger.info("Manual sync triggered (Background)")
    clear_cache()
    background_tasks.add_task(run_sync_task)
    
    return {
        "status": "processing",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": "Sync process started in the background."
    }

@router.get("/status")
def sync_status(db: Session = Depends(get_db)):
    """Return last sync log entries and current state."""
    global is_syncing
    logs = (
        db.query(SyncLog)
        .order_by(SyncLog.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "is_syncing": is_syncing,
        "logs": [
            {
                "sync_type": l.sync_type,
                "status": l.status,
                "message": l.message,
                "records_updated": l.records_updated,
                "created_at": _as_utc_iso(l.created_at),
            }
            for l in logs
        ]
    }
