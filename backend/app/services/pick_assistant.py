"""Pick assistant — ranks FPL players for squad building."""
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.db.models import Player
from app.services.fixture_analyzer import get_fixture_difficulty_table
from app.services.scoring_engine import compute_player_score


@dataclass
class PickSuggestion:
    player_id: int
    name: str
    web_name: str
    team_id: int
    team_name: str
    team_short: str
    position: str
    price: int
    price_display: str
    pick_score: float
    fpl_score: float
    fixture_score: Optional[float]
    avg_fdr_3: Optional[float]
    avg_fdr_5: Optional[float]
    form: Optional[float]
    ownership: Optional[float]
    total_points: Optional[int]
    status: str
    news: str
    category: str
    reasons: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)


def _normalize_position(position: str | None) -> str:
    return "GK" if (position or "").upper() == "GKP" else (position or "").upper()


def _position_query_values(position: str | None) -> list[str] | None:
    normalized = _normalize_position(position)
    if not normalized or normalized == "ALL":
        return None
    if normalized == "GK":
        return ["GK", "GKP"]
    return [normalized]


def _value_score(player: Player) -> float:
    if not player.price:
        return 45.0
    fpl_score = player.fpl_score or 0
    return max(0.0, min(100.0, (fpl_score / player.price) * 120))


def _availability_penalty(player: Player) -> float:
    if player.status in ("i", "s", "u", "n"):
        return 35.0
    if player.status == "d":
        return 12.0
    if player.chance_of_playing_next_round is not None and player.chance_of_playing_next_round < 75:
        return 15.0
    return 0.0


def _minutes_reliability(player: Player) -> float:
    minutes = player.minutes or 0
    if minutes >= 2500:
        return 100.0
    if minutes >= 1800:
        return 86.0
    if minutes >= 900:
        return 62.0
    if minutes >= 300:
        return 38.0
    if minutes > 0:
        return 22.0
    return 8.0


def _category(player: Player, pick_score: float) -> str:
    ownership = player.selected_by_percent or 0
    if player.status in ("i", "s", "u", "n") or pick_score < 38:
        return "avoid"
    if player.price and player.price <= 55 and pick_score >= 48:
        return "budget"
    if ownership <= 8 and pick_score >= 50:
        return "differential"
    if pick_score >= 60:
        return "recommended"
    return "watch"


def _build_pick_notes(
    player: Player,
    fpl_score: float,
    fixture_score: Optional[float],
    avg_fdr_5: Optional[float],
    pick_score: float,
) -> tuple[list[str], list[str]]:
    reasons: list[str] = []
    risks: list[str] = []

    if fixture_score is not None:
        if fixture_score >= 62:
            reasons.append("Lịch 5 GW thuận lợi")
        elif fixture_score <= 38:
            risks.append("Lịch 5 GW khó")

    if fpl_score >= 45:
        reasons.append("FPL Score cao trong dữ liệu hiện tại")
    if player.price and player.price <= 55 and pick_score >= 48:
        reasons.append("Giá tốt cho ngân sách")
    if player.selected_by_percent is not None:
        if player.selected_by_percent <= 8 and pick_score >= 50:
            reasons.append(f"Differential ownership {player.selected_by_percent:.1f}%")
        elif player.selected_by_percent >= 30:
            reasons.append(f"Pick an toàn ownership {player.selected_by_percent:.1f}%")
    if player.form is not None and player.form >= 5:
        reasons.append("Phong độ tốt")
    if avg_fdr_5 is not None and avg_fdr_5 <= 2.6:
        reasons.append("Team có fixture run đẹp")
    if (player.minutes or 0) >= 1800:
        reasons.append("Phút thi đấu ổn định")

    if player.status == "d":
        risks.append("Đang nghi ngờ ra sân")
    elif player.status in ("i", "s", "u", "n"):
        risks.append("Không sẵn sàng thi đấu")
    if (player.minutes or 0) < 900:
        risks.append("Ít phút thi đấu, cần kiểm tra vai trò đá chính")
    if player.news:
        risks.append(player.news[:90])

    return reasons[:4], risks[:3]


def get_pick_suggestions(
    db: Session,
    position: str | None = None,
    budget: int | None = None,
    exclude_ids: set[int] | None = None,
    limit: int = 20,
    category: str | None = None,
) -> list[PickSuggestion]:
    exclude_ids = exclude_ids or set()
    fixture_rows = get_fixture_difficulty_table(db, num_gw=8)
    fixture_by_team = {row.team_id: row for row in fixture_rows}

    q = db.query(Player).options(joinedload(Player.team_rel))
    position_values = _position_query_values(position)
    if position_values:
        q = q.filter(Player.position.in_(position_values))
    if budget is not None:
        q = q.filter(Player.price <= budget)
    if exclude_ids:
        q = q.filter(~Player.id.in_(exclude_ids))

    players = q.all()
    suggestions: list[PickSuggestion] = []

    for player in players:
        team_fixture = fixture_by_team.get(player.team_id)
        breakdown = compute_player_score(player, db)
        fpl_score = player.fpl_score if player.fpl_score is not None else breakdown.total
        fixture_score = team_fixture.fixture_score if team_fixture else breakdown.fixture
        value_score = _value_score(player)
        minutes_score = _minutes_reliability(player)
        ownership = player.selected_by_percent or 0
        differential_bonus = 6 if 0 < ownership <= 8 else 0
        pick_score = (
            (fpl_score * 0.34)
            + ((fixture_score or 45) * 0.24)
            + (value_score * 0.14)
            + (minutes_score * 0.28)
            + differential_bonus
            - _availability_penalty(player)
        )
        pick_score = round(max(0.0, min(100.0, pick_score)), 1)
        pick_category = _category(player, pick_score)
        if category and category != "all" and category != pick_category:
            continue

        reasons, risks = _build_pick_notes(
            player,
            fpl_score=fpl_score,
            fixture_score=fixture_score,
            avg_fdr_5=team_fixture.avg_fdr_5 if team_fixture else None,
            pick_score=pick_score,
        )
        suggestions.append(PickSuggestion(
            player_id=player.id,
            name=player.name,
            web_name=player.web_name,
            team_id=player.team_id,
            team_name=player.team_rel.name if player.team_rel else "",
            team_short=player.team_rel.short_name if player.team_rel else "",
            position=_normalize_position(player.position),
            price=player.price,
            price_display=f"£{(player.price or 0) / 10:.1f}m",
            pick_score=pick_score,
            fpl_score=round(fpl_score, 1),
            fixture_score=fixture_score,
            avg_fdr_3=team_fixture.avg_fdr_3 if team_fixture else None,
            avg_fdr_5=team_fixture.avg_fdr_5 if team_fixture else None,
            form=player.form,
            ownership=player.selected_by_percent,
            total_points=player.total_points,
            status=player.status,
            news=player.news or "",
            category=pick_category,
            reasons=reasons,
            risks=risks,
        ))

    suggestions.sort(key=lambda item: item.pick_score, reverse=True)
    return suggestions[:limit]
