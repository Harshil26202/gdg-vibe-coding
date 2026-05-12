from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.decision import Decision
from app.models.match import Match
from app.models.user import User
from app.routers.auth import get_current_user_dep
from app.services.commentary_service import generate_coach_report, generate_over_commentary
from app.models.challenge import OverCommentary
import redis.asyncio as aioredis
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/report", tags=["report"])


@router.get("/coach/{match_id}")
async def get_coach_report(
    match_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Decision).where(
            Decision.user_id == current_user.id,
            Decision.match_id == match_id,
        ).order_by(Decision.id)
    )
    decisions = result.scalars().all()

    match_result = await db.execute(select(Match).where(Match.id == match_id))
    match = match_result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")

    # Get rank
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    rank_raw = await r.zrevrank(f"leaderboard:match:{match_id}", str(current_user.id))
    await r.aclose()
    rank = (rank_raw or 0) + 1

    decisions_data = [
        {
            "decision_type": d.decision_type,
            "total_score": d.total_score,
            "over_no": d.over_no,
            "captain_match_score": d.captain_match_score,
            "historical_score": d.historical_score,
        }
        for d in decisions
    ]

    total = sum(d.total_score for d in decisions)
    report = await generate_coach_report(
        username=current_user.username,
        match_title=match.title,
        decisions=decisions_data,
        total_score=total,
        rank=rank,
    )

    return {
        "user": {"id": current_user.id, "username": current_user.username},
        "match_title": match.title,
        "total_score": round(total, 1),
        "decisions_made": len(decisions),
        "rank": rank,
        "report": report,
    }


@router.get("/commentary/{match_id}/{innings}/{over_no}")
async def get_over_commentary(
    match_id: int,
    innings: int,
    over_no: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OverCommentary).where(
            OverCommentary.match_id == match_id,
            OverCommentary.innings == innings,
            OverCommentary.over_no == over_no,
        )
    )
    commentary = result.scalar_one_or_none()
    if not commentary:
        raise HTTPException(404, "Commentary not found yet")
    return {"text": commentary.text, "runs": commentary.runs_in_over, "wickets": commentary.wickets_in_over}
