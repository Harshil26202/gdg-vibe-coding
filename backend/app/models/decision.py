from sqlalchemy import String, Integer, Float, DateTime, JSON, ForeignKey, Enum, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class DecisionType(str, enum.Enum):
    field_placement = "field_placement"
    bowling_change = "bowling_change"
    batting_order = "batting_order"
    powerplay = "powerplay"
    drs_review = "drs_review"


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False)
    innings: Mapped[int] = mapped_column(Integer, nullable=False)
    over_no: Mapped[int] = mapped_column(Integer, nullable=False)
    ball_no: Mapped[int] = mapped_column(Integer, nullable=False)
    decision_type: Mapped[DecisionType] = mapped_column(Enum(DecisionType), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    # scores (0-100 each component)
    captain_match_score: Mapped[float] = mapped_column(Float, default=0.0)
    historical_score: Mapped[float] = mapped_column(Float, default=0.0)
    rule_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_explanation: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="decisions")
    match = relationship("Match", back_populates="decisions")
