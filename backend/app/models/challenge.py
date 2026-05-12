from sqlalchemy import String, Integer, Float, Boolean, JSON, ForeignKey, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class ChallengeStatus(str, enum.Enum):
    waiting = "waiting"
    active = "active"
    completed = "completed"


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    opponent_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    opponent_is_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[ChallengeStatus] = mapped_column(Enum(ChallengeStatus), default=ChallengeStatus.waiting)
    creator_score: Mapped[float] = mapped_column(Float, default=0.0)
    opponent_score: Mapped[float] = mapped_column(Float, default=0.0)
    winner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)


class OverCommentary(Base):
    __tablename__ = "over_commentaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False)
    innings: Mapped[int] = mapped_column(Integer, nullable=False)
    over_no: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(String(1000), nullable=False)
    runs_in_over: Mapped[int] = mapped_column(Integer, default=0)
    wickets_in_over: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
