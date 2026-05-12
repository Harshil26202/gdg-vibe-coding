from sqlalchemy import String, Integer, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PreMatchStrategy(Base):
    __tablename__ = "pre_match_strategies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False)
    playing_xi: Mapped[list] = mapped_column(JSON, nullable=False)         # list of player names
    opening_pair: Mapped[list] = mapped_column(JSON, nullable=False)        # [opener1, opener2]
    powerplay_bowler: Mapped[str] = mapped_column(String(100), nullable=False)
    death_over_bowler: Mapped[str] = mapped_column(String(100), nullable=False)
    extra_notes: Mapped[str] = mapped_column(String(500), nullable=True)
    strategy_score: Mapped[float] = mapped_column(nullable=True)            # scored after match
    ai_assessment: Mapped[str] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
