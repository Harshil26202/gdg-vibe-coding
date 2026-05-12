from sqlalchemy import String, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class HistoricalSituation(Base):
    __tablename__ = "historical_situations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    situation_hash: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    innings: Mapped[int] = mapped_column(Integer, nullable=False)
    over_bucket: Mapped[str] = mapped_column(String(10), nullable=False)  # "0-5","6-10","11-15","16-20"
    wickets_down: Mapped[int] = mapped_column(Integer, nullable=False)
    run_rate_bucket: Mapped[str] = mapped_column(String(10), nullable=False)  # "low","mid","high"
    bowler_type: Mapped[str] = mapped_column(String(50), nullable=False)
    batsman_hand: Mapped[str] = mapped_column(String(5), nullable=False)  # "RHB","LHB"
    optimal_field_config: Mapped[dict] = mapped_column(JSON, nullable=True)
    optimal_bowler_type: Mapped[str] = mapped_column(String(50), nullable=True)
    win_probability_delta: Mapped[float] = mapped_column(Float, default=0.0)
    sample_count: Mapped[int] = mapped_column(Integer, default=1)
