"""
FPL Scoring Engine — computes a 0-100 score for each player.

Framework (adjustable weights):
  25% Fixture difficulty (FDR-based)
  30% xG + xA / 90 (attacking involvement)
  15% Form (recent 5-GW rolling average)
  15% Player Role (captain/penalty/set-piece flags encoded in position & stats)
  15% Team Strength

If a metric is unavailable, it is excluded from the denominator
and weights are re-normalized automatically.
"""
import json
import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Fixture, Gameweek, Player, Team

@dataclass
class ScoringContext:
    current_gw: int
    fixtures_by_team: dict[int, list[Fixture]]
    teams_by_id: dict[int, Team]

def get_scoring_context(db: Session, num_gw: int = 5) -> ScoringContext:
    current_gw_obj = db.query(Gameweek).filter_by(is_current=True).first()
    if not current_gw_obj:
        current_gw_obj = db.query(Gameweek).filter_by(is_next=True).first()
    current_gw = current_gw_obj.id if current_gw_obj else 1

    fixtures = (
        db.query(Fixture)
        .filter(
            Fixture.gameweek >= current_gw,
            Fixture.gameweek < current_gw + num_gw,
            Fixture.finished == False,
        )
        .all()
    )
    
    fixtures_by_team = {}
    for f in fixtures:
        fixtures_by_team.setdefault(f.team_h, []).append(f)
        fixtures_by_team.setdefault(f.team_a, []).append(f)
        
    teams = db.query(Team).all()
    teams_by_id = {t.id: t for t in teams}
    
    return ScoringContext(current_gw=current_gw, fixtures_by_team=fixtures_by_team, teams_by_id=teams_by_id)

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: dict[str, float] = {
    "fixture": 0.25,
    "xg_xa": 0.30,
    "form": 0.15,
    "role": 0.15,
    "team_strength": 0.15,
}


def _normalize_position(position: str | None) -> str:
    return "GK" if (position or "").upper() == "GKP" else (position or "").upper()


@dataclass
class ScoreBreakdown:
    total: float = 0.0
    fixture: Optional[float] = None
    xg_xa: Optional[float] = None
    form: Optional[float] = None
    role: Optional[float] = None
    team_strength: Optional[float] = None
    reasons: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    confidence: int = 0


def _normalize_weights(weights: dict[str, float], available_keys: set[str]) -> dict[str, float]:
    filtered = {k: v for k, v in weights.items() if k in available_keys}
    total = sum(filtered.values())
    if total == 0:
        return {}
    return {k: v / total for k, v in filtered.items()}


def _fixture_score(player: Player, db: Session = None, ctx: ScoringContext | None = None, num_gw: int = 5) -> Optional[float]:
    """Score 0-1 based on upcoming FDR for the next num_gw gameweeks."""
    if not player.team_id:
        return None
        
    if ctx:
        fixtures = ctx.fixtures_by_team.get(player.team_id, [])
    else:
        if not db: return None
        current_gw_obj = db.query(Gameweek).filter_by(is_current=True).first()
        if not current_gw_obj:
            current_gw_obj = db.query(Gameweek).filter_by(is_next=True).first()
        if not current_gw_obj:
            return None
        current_gw = current_gw_obj.id

        fixtures = (
            db.query(Fixture)
            .filter(
                Fixture.gameweek >= current_gw,
                Fixture.gameweek < current_gw + num_gw,
                Fixture.finished == False,
            )
            .filter(
                (Fixture.team_h == player.team_id) | (Fixture.team_a == player.team_id)
            )
            .all()
        )
        
    if not fixtures:
        return None

    fdrs = []
    for fix in fixtures:
        if fix.team_h == player.team_id:
            fdr = fix.team_h_difficulty or 3
        else:
            fdr = fix.team_a_difficulty or 3
        fdrs.append(fdr)

    avg_fdr = sum(fdrs) / len(fdrs)
    # FDR 1 (easiest) → score 1.0, FDR 5 (hardest) → score 0.0
    score = (5 - avg_fdr) / 4
    return max(0.0, min(1.0, score))


def _availability_multiplier(player: Player) -> float:
    """Multiplier for final score based on availability (0.0 to 1.0)."""
    if player.status in ("i", "s", "u", "n"):
        return 0.0
    if player.status == "a":
        return 1.0
    if player.status == "d":
        return 0.5
    cop = player.chance_of_playing_next_round
    if cop is not None:
        return cop / 100.0
    return 1.0


def _xg_xa_score(player: Player) -> Optional[float]:
    """Score 0-1 based on xG + xA per 90 minutes."""
    xg = player.expected_goals or 0.0
    xa = player.expected_assists or 0.0
    total = xg + xa
    minutes = player.minutes or 0
    if minutes < 90:
        return 0.0
    
    xgi_90 = total / (minutes / 90.0)
    # A top tier player has ~1.0 xGI/90. We cap it at 1.0.
    return min(xgi_90 / 1.0, 1.0)


def _role_score(player: Player) -> Optional[float]:
    """Crude role heuristic: attacking positions + penalty/set-piece indicators."""
    base = {"GK": 0.3, "DEF": 0.4, "MID": 0.7, "FWD": 0.8}.get(_normalize_position(player.position) or "MID", 0.5)
    # Bonus if they contribute goals/assists beyond expected
    goals = player.goals_scored or 0
    assists = player.assists or 0
    if (goals + assists) > 10:
        base = min(base + 0.15, 1.0)
    return base


def _team_strength_score(player: Player, db: Session = None, ctx: ScoringContext | None = None) -> Optional[float]:
    if not player.team_id:
        return None
    
    if ctx:
        team = ctx.teams_by_id.get(player.team_id)
    else:
        if not db: return None
        team = db.get(Team, player.team_id)
        
    if not team:
        return None
    overall = (team.strength_overall_home or 1200) + (team.strength_overall_away or 1200)
    # Typical range: 2000–3000
    score = (overall - 2000) / 1000
    return max(0.0, min(1.0, score))


def _form_score(player: Player) -> Optional[float]:
    if player.form is None:
        return None
    return min(player.form / 12.0, 1.0)


def _build_reasons(bd: ScoreBreakdown, player: Player) -> tuple[list[str], list[str]]:
    reasons, risks = [], []

    if bd.fixture is not None:
        if bd.fixture >= 0.7:
            reasons.append("Fixture ngắn hạn tốt")
        elif bd.fixture <= 0.3:
            risks.append("Fixture ngắn hạn khó")

    if bd.xg_xa is not None:
        if bd.xg_xa >= 0.5:
            reasons.append("Chỉ số tấn công (xG+xA / 90) rất cao")

    if bd.role is not None:
        if bd.role >= 0.7:
            reasons.append("Vai trò tấn công quan trọng trong đội")

    if player.news:
        risks.append(f"Tin tức: {player.news[:80]}")

    return reasons, risks


def compute_player_score(
    player: Player,
    db: Session = None,
    weights: dict[str, float] | None = None,
    ctx: ScoringContext | None = None,
) -> ScoreBreakdown:
    w = weights or DEFAULT_WEIGHTS
    bd = ScoreBreakdown()

    raw: dict[str, Optional[float]] = {
        "fixture": _fixture_score(player, db=db, ctx=ctx),
        "xg_xa": _xg_xa_score(player),
        "role": _role_score(player),
        "team_strength": _team_strength_score(player, db=db, ctx=ctx),
        "form": _form_score(player),
    }

    available = {k for k, v in raw.items() if v is not None}
    norm_w = _normalize_weights(w, available)

    base_index = sum(norm_w[k] * raw[k] for k in norm_w)
    multiplier = _availability_multiplier(player)
    
    total = base_index * multiplier
    bd.total = round(total * 100, 1)

    # Store individual component scores (0-100)
    for k, v in raw.items():
        if v is not None:
            setattr(bd, k, round(v * 100, 1))

    bd.reasons, bd.risks = _build_reasons(bd, player)
    bd.confidence = min(100, int(len(available) / len(w) * 100))

    return bd


def compute_recommendation(score: float, player: Player) -> str:
    """Simple recommendations based on score + status."""
    if player.status in ("i", "s", "u", "n"):
        return "Sell / Drop"
    if score > 75:
        return "Must-Have"
    elif score >= 60:
        return "Solid Hold"
    elif score >= 45:
        return "Monitor / Rotation"
    else:
        return "Sell / Drop"
