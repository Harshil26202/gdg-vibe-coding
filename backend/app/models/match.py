from sqlalchemy import String, Integer, Boolean, Float, DateTime, JSON, ForeignKey, Enum, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class MatchStatus(str, enum.Enum):
    upcoming = "upcoming"
    live = "live"
    completed = "completed"


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    team_a: Mapped[str] = mapped_column(String(100), nullable=False)
    team_b: Mapped[str] = mapped_column(String(100), nullable=False)
    venue: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus), default=MatchStatus.upcoming)
    current_innings: Mapped[int] = mapped_column(Integer, default=1)
    current_over: Mapped[int] = mapped_column(Integer, default=0)
    current_ball: Mapped[int] = mapped_column(Integer, default=0)
    team_a_score: Mapped[int] = mapped_column(Integer, default=0)
    team_a_wickets: Mapped[int] = mapped_column(Integer, default=0)
    team_b_score: Mapped[int] = mapped_column(Integer, default=0)
    team_b_wickets: Mapped[int] = mapped_column(Integer, default=0)
    batting_team: Mapped[str] = mapped_column(String(100), nullable=True)
    bowling_team: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    balls = relationship("Ball", back_populates="match", lazy="select", order_by="Ball.id")
    decisions = relationship("Decision", back_populates="match", lazy="select")


class Ball(Base):
    __tablename__ = "balls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False)
    innings: Mapped[int] = mapped_column(Integer, nullable=False)
    over_no: Mapped[int] = mapped_column(Integer, nullable=False)
    ball_no: Mapped[int] = mapped_column(Integer, nullable=False)
    bowler: Mapped[str] = mapped_column(String(100), nullable=False)
    batsman: Mapped[str] = mapped_column(String(100), nullable=False)
    runs: Mapped[int] = mapped_column(Integer, default=0)
    is_wicket: Mapped[bool] = mapped_column(Boolean, default=False)
    wicket_type: Mapped[str] = mapped_column(String(50), nullable=True)
    extras: Mapped[int] = mapped_column(Integer, default=0)
    extras_type: Mapped[str] = mapped_column(String(20), nullable=True)
    commentary: Mapped[str] = mapped_column(Text, nullable=True)
    # captain's actual decisions at this point
    captain_field_config: Mapped[dict] = mapped_column(JSON, nullable=True)
    captain_bowling_decision: Mapped[str] = mapped_column(String(100), nullable=True)
    captain_batting_order_decision: Mapped[str] = mapped_column(String(100), nullable=True)
    captain_powerplay_decision: Mapped[bool] = mapped_column(Boolean, nullable=True)

    match = relationship("Match", back_populates="balls")
