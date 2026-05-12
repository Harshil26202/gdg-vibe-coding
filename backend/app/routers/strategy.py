from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.strategy import PreMatchStrategy
from app.models.match import Match
from app.models.user import User
from app.routers.auth import get_current_user_dep
from app.services.commentary_service import generate_coach_report
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/strategy", tags=["strategy"])


class StrategyCreate(BaseModel):
    match_id: int
    playing_xi: list[str]
    opening_pair: list[str]
    powerplay_bowler: str
    death_over_bowler: str
    extra_notes: Optional[str] = None


class StrategyOut(BaseModel):
    id: int
    match_id: int
    playing_xi: list
    opening_pair: list
    powerplay_bowler: str
    death_over_bowler: str
    extra_notes: Optional[str] = None
    strategy_score: Optional[float] = None
    ai_assessment: Optional[str] = None

    model_config = {"from_attributes": True}


@router.post("", response_model=StrategyOut, status_code=201)
async def create_strategy(
    body: StrategyCreate,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Match).where(Match.id == body.match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")

    # Upsert — one strategy per user per match
    existing = await db.execute(
        select(PreMatchStrategy).where(
            PreMatchStrategy.user_id == current_user.id,
            PreMatchStrategy.match_id == body.match_id,
        )
    )
    strategy = existing.scalar_one_or_none()

    if strategy:
        strategy.playing_xi = body.playing_xi
        strategy.opening_pair = body.opening_pair
        strategy.powerplay_bowler = body.powerplay_bowler
        strategy.death_over_bowler = body.death_over_bowler
        strategy.extra_notes = body.extra_notes
    else:
        strategy = PreMatchStrategy(
            user_id=current_user.id,
            match_id=body.match_id,
            playing_xi=body.playing_xi,
            opening_pair=body.opening_pair,
            powerplay_bowler=body.powerplay_bowler,
            death_over_bowler=body.death_over_bowler,
            extra_notes=body.extra_notes,
        )
        db.add(strategy)

    await db.commit()
    await db.refresh(strategy)
    return strategy


@router.get("/{match_id}", response_model=StrategyOut)
async def get_my_strategy(
    match_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PreMatchStrategy).where(
            PreMatchStrategy.user_id == current_user.id,
            PreMatchStrategy.match_id == match_id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(404, "No strategy found for this match")
    return strategy
