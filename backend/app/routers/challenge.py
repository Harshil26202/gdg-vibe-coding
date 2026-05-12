import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db, AsyncSessionLocal
from app.models.challenge import Challenge, ChallengeStatus
from app.models.match import Match
from app.models.user import User
from app.routers.auth import get_current_user_dep
from app.services.websocket_manager import ws_manager
from app.services.scoring_engine import compute_score
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/challenge", tags=["challenge"])

# In-memory lobby: challenge_id -> asyncio.Event (fires when opponent joins)
_lobby: dict[int, asyncio.Event] = {}


class ChallengeOut(BaseModel):
    id: int
    match_id: int
    creator_id: int
    opponent_id: int | None = None
    opponent_is_ai: bool
    status: str
    creator_score: float
    opponent_score: float

    model_config = {"from_attributes": True}


@router.post("/create", response_model=ChallengeOut, status_code=201)
async def create_challenge(
    match_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Match).where(Match.id == match_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Match not found")

    challenge = Challenge(
        match_id=match_id,
        creator_id=current_user.id,
        status=ChallengeStatus.waiting,
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    # Set up a lobby event; background task will fire it or time out after 30s
    event = asyncio.Event()
    _lobby[challenge.id] = event
    asyncio.create_task(_ai_fallback_timer(challenge.id, event))

    return challenge


@router.post("/{challenge_id}/join", response_model=ChallengeOut)
async def join_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    if challenge.status != ChallengeStatus.waiting:
        raise HTTPException(400, "Challenge is no longer open")
    if challenge.creator_id == current_user.id:
        raise HTTPException(400, "Cannot join your own challenge")

    challenge.opponent_id = current_user.id
    challenge.status = ChallengeStatus.active
    challenge.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(challenge)

    # Fire the lobby event so the AI timer is cancelled
    if challenge_id in _lobby:
        _lobby[challenge_id].set()

    # Notify both players via WebSocket
    await ws_manager.broadcast(challenge.match_id, {
        "type": "challenge_started",
        "challenge_id": challenge_id,
        "opponent": current_user.username,
        "opponent_is_ai": False,
    })

    return challenge


@router.get("/{challenge_id}", response_model=ChallengeOut)
async def get_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    return challenge


async def _ai_fallback_timer(challenge_id: int, event: asyncio.Event):
    """After 30 seconds without a real opponent, Claude AI joins."""
    try:
        await asyncio.wait_for(event.wait(), timeout=30.0)
    except asyncio.TimeoutError:
        # No human joined — activate AI opponent
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
            challenge = result.scalar_one_or_none()
            if challenge and challenge.status == ChallengeStatus.waiting:
                challenge.opponent_is_ai = True
                challenge.status = ChallengeStatus.active
                challenge.started_at = datetime.now(timezone.utc)
                await db.commit()

        await ws_manager.broadcast(0, {
            "type": "challenge_started",
            "challenge_id": challenge_id,
            "opponent": "AI Coach",
            "opponent_is_ai": True,
        })
    finally:
        _lobby.pop(challenge_id, None)
