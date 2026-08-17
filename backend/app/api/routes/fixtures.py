"""Fixtures routes."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import Fixture, Gameweek, Team
from app.services.fixture_analyzer import get_fixture_difficulty_table

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fixtures", tags=["fixtures"])


@router.get("")
def list_fixtures(
    db: Session = Depends(get_db),
    gameweek: Optional[int] = Query(None),
    team_id: Optional[int] = Query(None),
):
    q = db.query(Fixture)
    if gameweek:
        q = q.filter(Fixture.gameweek == gameweek)
    if team_id:
        q = q.filter((Fixture.team_h == team_id) | (Fixture.team_a == team_id))
    fixtures = q.order_by(Fixture.gameweek, Fixture.kickoff_time).all()
    teams = {t.id: t for t in db.query(Team).all()}

    return [
        {
            "id": f.id,
            "gameweek": f.gameweek,
            "team_h": f.team_h,
            "team_h_name": teams.get(f.team_h, {}).name if teams.get(f.team_h) else "?",
            "team_h_short": teams.get(f.team_h, {}).short_name if teams.get(f.team_h) else "?",
            "team_a": f.team_a,
            "team_a_name": teams.get(f.team_a, {}).name if teams.get(f.team_a) else "?",
            "team_a_short": teams.get(f.team_a, {}).short_name if teams.get(f.team_a) else "?",
            "team_h_difficulty": f.team_h_difficulty,
            "team_a_difficulty": f.team_a_difficulty,
            "kickoff_time": f.kickoff_time.isoformat() if f.kickoff_time else None,
            "finished": f.finished,
            "team_h_score": f.team_h_score,
            "team_a_score": f.team_a_score,
        }
        for f in fixtures
    ]


@router.get("/difficulty")
def fixture_difficulty_table(
    db: Session = Depends(get_db),
    num_gw: int = Query(8, ge=3, le=10),
):
    """FDR heatmap for all teams."""
    table = get_fixture_difficulty_table(db, num_gw=num_gw)
    return [
        {
            "team_id": r.team_id,
            "team_name": r.team_name,
            "team_short": r.team_short,
            "avg_fdr_3": r.avg_fdr_3,
            "avg_fdr_5": r.avg_fdr_5,
            "avg_fdr_8": r.avg_fdr_8,
            "swing_alert": r.swing_alert,
            "alert_type": r.alert_type,
            "alert_severity": r.alert_severity,
            "fixture_score": r.fixture_score,
            "gw_fixtures": r.gw_fixtures,
        }
        for r in table
    ]
