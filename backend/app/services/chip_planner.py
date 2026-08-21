"""Chip Planner and Strategy Analysis."""
from sqlalchemy.orm import Session
from app.db.models import Gameweek, Fixture, Team, UserSquad, SquadPlayer, Player
from app.services.scoring_engine import get_scoring_context

def analyze_chip_strategy(db: Session):
    # Determine current GW
    gw = db.query(Gameweek).filter_by(is_current=True).first()
    if not gw:
        gw = db.query(Gameweek).filter_by(is_next=True).first()
    current_gw_id = gw.id if gw else 1
    
    # 1. Special Gameweeks logic (BGW/DGW)
    teams = {t.id: t for t in db.query(Team).all()}
    all_fixtures = db.query(Fixture).all()
    
    gw_map = {}
    for f in all_fixtures:
        if f.gameweek not in gw_map:
            gw_map[f.gameweek] = {t.id: 0 for t in teams.values()}
        gw_map[f.gameweek][f.team_h] += 1
        gw_map[f.gameweek][f.team_a] += 1
        
    special_gws = []
    for gw_id in sorted(gw_map.keys()):
        counts = gw_map[gw_id]
        blanks = []
        doubles = []
        for t_id, c in counts.items():
            if c == 0:
                blanks.append(teams[t_id].short_name)
            elif c > 1:
                doubles.append(teams[t_id].short_name)
                
        if blanks or doubles:
            special_gws.append({
                "gameweek": gw_id,
                "blanks": blanks,
                "doubles": doubles
            })

    # 2. Squad Horizon Analysis (next 5 GWs)
    squad = db.query(UserSquad).order_by(UserSquad.created_at.desc()).first()
    squad_horizon = []
    recommendations = []
    
    if squad:
        # Get squad starting players
        squad_players = db.query(SquadPlayer).filter(SquadPlayer.squad_id == squad.id, SquadPlayer.is_starting == True).all()
        squad_player_ids = [sp.player_id for sp in squad_players]
        players = db.query(Player).filter(Player.id.in_(squad_player_ids)).all()
        
        ctx = get_scoring_context(db)
        
        # Calculate FDR per Gameweek for the squad (next 5 GWs)
        horizon_gws = list(range(current_gw_id, min(current_gw_id + 5, 39)))
        
        for h_gw in horizon_gws:
            fdr_sum = 0
            valid_players = 0
            has_blank = False
            has_double = False
            
            for p in players:
                # get fixtures for player in this gameweek
                player_fixtures = [f for f in ctx.fixtures if f.gameweek == h_gw and (f.team_h == p.team_id or f.team_a == p.team_id)]
                if not player_fixtures:
                    fdr_sum += 5.0 # penalty for blank
                    has_blank = True
                    valid_players += 1
                else:
                    if len(player_fixtures) > 1:
                        has_double = True
                    for f in player_fixtures:
                        diff = f.team_h_difficulty if f.team_h == p.team_id else f.team_a_difficulty
                        fdr_sum += diff
                        valid_players += 1
            
            avg_fdr = fdr_sum / valid_players if valid_players > 0 else 3.0
            
            squad_horizon.append({
                "gameweek": h_gw,
                "average_fdr": round(avg_fdr, 2),
                "has_blank": has_blank,
                "has_double": has_double
            })
            
        # 3. AI Recommendations
        difficult_gws = [h["gameweek"] for h in squad_horizon if h["average_fdr"] >= 3.5 or h["has_blank"]]
        if difficult_gws:
            gw_list_str = ", ".join([f"GW{g}" for g in difficult_gws])
            recommendations.append(f"Đội hình hiện tại có lịch thi đấu rất khó (hoặc bị trống trận) ở {gw_list_str}. Hãy cân nhắc dùng Wildcard hoặc Free Hit nếu nhiều trụ cột bị ảnh hưởng.")
            
        easy_gws = [h["gameweek"] for h in squad_horizon if h["average_fdr"] <= 2.6 or h["has_double"]]
        if easy_gws:
            gw_list_str = ", ".join([f"GW{g}" for g in easy_gws])
            recommendations.append(f"Lịch thi đấu cực kỳ thuận lợi ở {gw_list_str}. Đây là thời điểm tuyệt vời để sử dụng Bench Boost hoặc Triple Captain.")
            
        if not recommendations:
            recommendations.append("Lịch thi đấu của đội hình trong 5 vòng tới tương đối cân bằng. Khuyến nghị giữ Chip (Hold) và sử dụng chuyển nhượng miễn phí (Free Transfer) để tối ưu hóa.")
    else:
        recommendations.append("Hãy thiết lập Đội của tôi (My Squad) để nhận được các phân tích và khuyến nghị chiến lược dùng Chip từ AI.")
    
    return {
        "special_gameweeks": special_gws,
        "squad_horizon": squad_horizon,
        "recommendations": recommendations
    }
