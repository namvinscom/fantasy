"""Pick assistant routes."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.pick_assistant import get_pick_suggestions

router = APIRouter(prefix="/picks", tags=["picks"])


def _parse_ids(raw: str | None) -> set[int]:
    if not raw:
        return set()
    ids: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if part.isdigit():
            ids.add(int(part))
    return ids


@router.get("/suggestions")
def pick_suggestions(
    db: Session = Depends(get_db),
    position: Optional[str] = Query(None, description="GK/DEF/MID/FWD/all"),
    budget: Optional[int] = Query(None, ge=0, description="Max player price in tenths, e.g. 75 = £7.5m"),
    exclude_ids: Optional[str] = Query(None, description="Comma-separated player IDs to exclude"),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[str] = Query(None, description="recommended/budget/differential/watch/avoid/all"),
):
    suggestions = get_pick_suggestions(
        db,
        position=position,
        budget=budget,
        exclude_ids=_parse_ids(exclude_ids),
        limit=limit,
        category=category,
    )
    return {
        "suggestions": [s.__dict__ for s in suggestions],
    }
