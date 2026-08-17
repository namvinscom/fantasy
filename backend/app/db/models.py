from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    short_name = Column(String(10))
    strength = Column(Integer)
    strength_overall_home = Column(Integer)
    strength_overall_away = Column(Integer)
    strength_attack_home = Column(Integer)
    strength_attack_away = Column(Integer)
    strength_defence_home = Column(Integer)
    strength_defence_away = Column(Integer)

    players = relationship("Player", back_populates="team_rel")
    home_fixtures = relationship("Fixture", foreign_keys="Fixture.team_h", back_populates="home_team")
    away_fixtures = relationship("Fixture", foreign_keys="Fixture.team_a", back_populates="away_team")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True)  # FPL element ID
    name = Column(String(150), nullable=False)
    web_name = Column(String(80))
    team_id = Column(Integer, ForeignKey("teams.id"))
    position = Column(String(4))  # GK / DEF / MID / FWD
    price = Column(Integer)  # In tenths: 85 = £8.5m
    total_points = Column(Integer, default=0)
    event_points = Column(Integer, default=0)  # Latest GW points
    form = Column(Float, default=0.0)
    selected_by_percent = Column(Float, default=0.0)
    minutes = Column(Integer, default=0)
    goals_scored = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    clean_sheets = Column(Integer, default=0)
    bonus = Column(Integer, default=0)
    bps = Column(Integer, default=0)
    yellow_cards = Column(Integer, default=0)
    red_cards = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    # xG / xA — available in FPL API
    expected_goals = Column(Float)
    expected_assists = Column(Float)
    expected_goal_involvements = Column(Float)
    expected_goals_conceded = Column(Float)
    # Availability
    news = Column(Text)
    news_added = Column(DateTime)
    chance_of_playing_next_round = Column(Integer)
    chance_of_playing_this_round = Column(Integer)
    status = Column(String(2), default="a")  # a/d/i/s/u/n
    # Computed
    fpl_score = Column(Float)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    team_rel = relationship("Team", back_populates="players")
    gw_stats = relationship("PlayerGameweekStat", back_populates="player")


class Fixture(Base):
    __tablename__ = "fixtures"

    id = Column(Integer, primary_key=True)
    gameweek = Column(Integer)
    team_h = Column(Integer, ForeignKey("teams.id"))
    team_a = Column(Integer, ForeignKey("teams.id"))
    team_h_difficulty = Column(Integer)
    team_a_difficulty = Column(Integer)
    kickoff_time = Column(DateTime)
    finished = Column(Boolean, default=False)
    started = Column(Boolean, default=False)
    team_h_score = Column(Integer)
    team_a_score = Column(Integer)
    provisional_start_time = Column(Boolean, default=False)

    home_team = relationship("Team", foreign_keys=[team_h], back_populates="home_fixtures")
    away_team = relationship("Team", foreign_keys=[team_a], back_populates="away_fixtures")


class Gameweek(Base):
    __tablename__ = "gameweeks"

    id = Column(Integer, primary_key=True)  # GW number
    name = Column(String(50))
    deadline_time = Column(DateTime)
    finished = Column(Boolean, default=False)
    is_current = Column(Boolean, default=False)
    is_next = Column(Boolean, default=False)
    is_previous = Column(Boolean, default=False)
    average_entry_score = Column(Integer)
    highest_score = Column(Integer)
    highest_scoring_entry = Column(Integer)
    transfers_made = Column(Integer)
    most_selected = Column(Integer)
    most_transferred_in = Column(Integer)
    most_captained = Column(Integer)
    top_element = Column(Integer)
    top_element_points = Column(Integer)
    chip_plays = Column(Text)  # JSON


class PlayerGameweekStat(Base):
    __tablename__ = "player_gameweek_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    gameweek = Column(Integer, nullable=False)
    minutes = Column(Integer, default=0)
    goals_scored = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    clean_sheets = Column(Integer, default=0)
    goals_conceded = Column(Integer, default=0)
    own_goals = Column(Integer, default=0)
    penalties_saved = Column(Integer, default=0)
    penalties_missed = Column(Integer, default=0)
    yellow_cards = Column(Integer, default=0)
    red_cards = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    bonus = Column(Integer, default=0)
    bps = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    expected_goals = Column(Float)
    expected_assists = Column(Float)
    expected_goal_involvements = Column(Float)
    expected_goals_conceded = Column(Float)
    transfers_in = Column(Integer, default=0)
    transfers_out = Column(Integer, default=0)
    selected = Column(Integer, default=0)

    player = relationship("Player", back_populates="gw_stats")


class UserSquad(Base):
    __tablename__ = "user_squads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gameweek = Column(Integer, nullable=False)
    fpl_team_id = Column(String(20))
    team_value = Column(Integer)
    bank = Column(Integer)
    free_transfers = Column(Integer, default=1)
    overall_rank = Column(Integer)
    gameweek_rank = Column(Integer)
    total_points = Column(Integer)
    gameweek_points = Column(Integer)
    formation = Column(String(10))
    # Chips
    wildcard_1_used = Column(Boolean, default=False)
    wildcard_2_used = Column(Boolean, default=False)
    freehit_1_used = Column(Boolean, default=False)
    freehit_2_used = Column(Boolean, default=False)
    bench_boost_used = Column(Boolean, default=False)
    triple_captain_used = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    players = relationship("SquadPlayer", back_populates="squad", cascade="all, delete-orphan")
    transfers = relationship("Transfer", back_populates="squad")


class SquadPlayer(Base):
    __tablename__ = "squad_players"

    id = Column(Integer, primary_key=True, autoincrement=True)
    squad_id = Column(Integer, ForeignKey("user_squads.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    is_starting = Column(Boolean, default=True)
    position_index = Column(Integer)  # position within formation
    is_captain = Column(Boolean, default=False)
    is_vice_captain = Column(Boolean, default=False)
    bench_order = Column(Integer)  # 1-4 if on bench, NULL if starting
    purchase_price = Column(Integer)
    selling_price = Column(Integer)

    squad = relationship("UserSquad", back_populates="players")
    player = relationship("Player")


class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    squad_id = Column(Integer, ForeignKey("user_squads.id"), nullable=False)
    gameweek = Column(Integer, nullable=False)
    player_out_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    player_in_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    cost = Column(Integer, default=0)  # 0 or 4
    player_out_price = Column(Integer)
    player_in_price = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    squad = relationship("UserSquad", back_populates="transfers")
    player_out = relationship("Player", foreign_keys=[player_out_id])
    player_in = relationship("Player", foreign_keys=[player_in_id])


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gameweek = Column(Integer, nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    recommendation = Column(String(10))  # BUY/HOLD/SELL/WATCH
    fpl_score = Column(Float)
    reason = Column(Text)   # JSON array of strings
    risks = Column(Text)    # JSON array of strings
    confidence = Column(Integer)  # 0-100
    created_at = Column(DateTime, server_default=func.now())

    player = relationship("Player")


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_type = Column(String(50))  # bootstrap / fixtures / gw_live / etc
    status = Column(String(20))     # success / error
    message = Column(Text)
    records_updated = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
