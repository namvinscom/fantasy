"""
FPL Scoring Engine — computes a 0-100 score for each player.

Framework (adjustable weights):
  20% Fixture difficulty (FDR-based)
  20% Expected points (form × minutes projection)
  15% Minutes / starting probability
  15% xG + xA (attacking involvement)
  10% Player Role (captain/penalty/set-piece flags encoded in position & stats)
  10% Team Strength
   5% Form (recent 5-GW rolling average)
   5% Ownership (% selected)

If a metric is unavailable, it is excluded from the denominator
and weights are re-normalized automatically.
"""
import json
import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Fixture, Gameweek, Player, Team

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: dict[str, float] = {
    "fixture": 0.20,
    "expected_points": 0.20,
    "minutes": 0.15,
    "xg_xa": 0.15,
    "role": 0.10,
    "team_strength": 0.10,
    "form": 0.05,
    "ownership": 0.05,
}


def _normalize_position(position: str | None) -> str:
    return "GK" if (position or "").upper() == "GKP" else (position or "").upper()


@dataclass
class ScoreBreakdown:
    total: float = 0.0
    fixture: Optional[float] = None
    expected_points: Optional[float] = None
    minutes: Optional[float] = None
    xg_xa: Optional[float] = None
    role: Optional[float] = None
    team_strength: Optional[float] = None
    form: Optional[float] = None
    ownership: Optional[float] = None
    reasons: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    confidence: int = 0


def _normalize_weights(weights: dict[str, float], available_keys: set[str]) -> dict[str, float]:
    filtered = {k: v for k, v in weights.items() if k in available_keys}
    total = sum(filtered.values())
    if total == 0:
        return {}
    return {k: v / total for k, v in filtered.items()}


def _fixture_score(player: Player, db: Session, num_gw: int = 5) -> Optional[float]:
    """Score 0-1 based on upcoming FDR for the next num_gw gameweeks."""
    if not player.team_id:
        return None
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


def _minutes_score(player: Player) -> Optional[float]:
    """Starting probability proxy based on chance_of_playing and minutes."""
    cop = player.chance_of_playing_next_round
    if cop is not None:
        return cop / 100.0
    # Fallback: if no injury info and has minutes, assume likely starter
    if player.status == "a":
        return 0.8  # available but unknown playing time
    elif player.status == "d":
        return 0.5  # doubtful
    elif player.status in ("i", "s", "u", "n"):
        return 0.1  # injured / suspended / unavailable
    return None


def _expected_points_score(player: Player) -> Optional[float]:
    """Proxy for expected points: form combined with minutes availability."""
    if player.form is None:
        return None
    # form is avg pts over last 5 GWs (max reasonable ~15)
    pts_score = min(player.form / 15.0, 1.0)
    mins_modifier = _minutes_score(player) or 0.8
    return pts_score * mins_modifier


def _xg_xa_score(player: Player) -> Optional[float]:
    xg = player.expected_goals
    xa = player.expected_assists
    if xg is None and xa is None:
        return None
    total = (xg or 0) + (xa or 0)
    # Max reasonable xGI per season ≈ 25 (based on top players)
    return min(total / 25.0, 1.0)


def _role_score(player: Player) -> Optional[float]:
    """Crude role heuristic: attacking positions + penalty/set-piece indicators."""
    base = {"GK": 0.3, "DEF": 0.4, "MID": 0.7, "FWD": 0.8}.get(_normalize_position(player.position) or "MID", 0.5)
    # Bonus if they contribute goals/assists beyond expected
    goals = player.goals_scored or 0
    assists = player.assists or 0
    if (goals + assists) > 10:
        base = min(base + 0.15, 1.0)
    return base


def _team_strength_score(player: Player, db: Session) -> Optional[float]:
    if not player.team_id:
        return None
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


def _ownership_score(player: Player) -> Optional[float]:
    sel = player.selected_by_percent
    if sel is None:
        return None
    # Higher ownership = safer pick, max at 60%
    return min(sel / 60.0, 1.0)


def _build_reasons(bd: ScoreBreakdown, player: Player) -> tuple[list[str], list[str]]:
    reasons, risks = [], []

    if bd.fixture is not None:
        if bd.fixture >= 0.7:
            reasons.append("Fixture ngắn hạn tốt")
        elif bd.fixture <= 0.3:
            risks.append("Fixture ngắn hạn khó")

    if bd.expected_points is not None:
        if bd.expected_points >= 0.6:
            reasons.append("Expected points cao")
        elif bd.expected_points <= 0.2:
            risks.append("Expected points thấp")

    if bd.minutes is not None:
        if bd.minutes >= 0.75:
            reasons.append("Khả năng đá đủ phút cao")
        elif bd.minutes <= 0.4:
            risks.append("Rủi ro không đá đủ phút")

    if bd.xg_xa is not None:
        if bd.xg_xa >= 0.5:
            reasons.append("Chỉ số tấn công (xG+xA) tốt")

    if bd.role is not None:
        if bd.role >= 0.7:
            reasons.append("Vai trò tấn công quan trọng trong đội")

    if bd.ownership is not None:
        if player.selected_by_percent and player.selected_by_percent >= 30:
            reasons.append(f"Ownership cao ({player.selected_by_percent:.1f}%)")
        elif player.selected_by_percent and player.selected_by_percent <= 5:
            reasons.append(f"Differential (ownership thấp: {player.selected_by_percent:.1f}%)")

    if player.news:
        risks.append(f"Tin tức: {player.news[:80]}")

    return reasons, risks


def compute_player_score(
    player: Player,
    db: Session,
    weights: dict[str, float] | None = None,
) -> ScoreBreakdown:
    w = weights or DEFAULT_WEIGHTS
    bd = ScoreBreakdown()

    raw: dict[str, Optional[float]] = {
        "fixture": _fixture_score(player, db),
        "expected_points": _expected_points_score(player),
        "minutes": _minutes_score(player),
        "xg_xa": _xg_xa_score(player),
        "role": _role_score(player),
        "team_strength": _team_strength_score(player, db),
        "form": _form_score(player),
        "ownership": _ownership_score(player),
    }

    available = {k for k, v in raw.items() if v is not None}
    norm_w = _normalize_weights(w, available)

    total = sum(norm_w[k] * raw[k] for k in norm_w)
    bd.total = round(total * 100, 1)

    # Store individual component scores (0-100)
    for k, v in raw.items():
        if v is not None:
            setattr(bd, k, round(v * 100, 1))

    bd.reasons, bd.risks = _build_reasons(bd, player)
    bd.confidence = min(100, int(len(available) / len(w) * 100))

    return bd


def compute_recommendation(score: float, player: Player) -> str:
    """Simple BUY/HOLD/SELL/WATCH based on score + status."""
    if player.status in ("i", "s", "u", "n"):
        return "SELL"
    if score >= 72:
        return "BUY"
    elif score >= 55:
        return "HOLD"
    elif score >= 40:
        return "WATCH"
    else:
        return "SELL"
