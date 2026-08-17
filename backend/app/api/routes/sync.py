"""Sync routes — trigger FPL data fetch and report status."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import SyncLog
from app.services.data_ingestion import run_full_sync
from app.services.fpl_client import clear_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sync", tags=["sync"])


def _as_utc_iso(value):
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


@router.post("")
def trigger_sync(db: Session = Depends(get_db)):
    """Trigger a full FPL data sync."""
    logger.info("Manual sync triggered")
    clear_cache()
    results = run_full_sync(db)
    return {
        "status": "ok" if "error" not in results else "partial",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }


@router.get("/status")
def sync_status(db: Session = Depends(get_db)):
    """Return last sync log entries."""
    logs = (
        db.query(SyncLog)
        .order_by(SyncLog.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "sync_type": l.sync_type,
            "status": l.status,
            "message": l.message,
            "records_updated": l.records_updated,
            "created_at": _as_utc_iso(l.created_at),
        }
        for l in logs
    ]
