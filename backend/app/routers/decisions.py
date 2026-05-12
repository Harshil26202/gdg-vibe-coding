from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.decision import Decision
from app.models.match import Match, Ball, MatchStatus
from app.models.user import User
from app.schemas.decision import DecisionSubmit, DecisionOut, ScoreBreakdown
from app.routers.auth import get_current_user_dep
from app.services import scoring_engine, ai_service
from app.services.match_engine import get_decision_window
import redis.asyncio as aioredis
from app.config import settings

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.post("", response_model=DecisionOut, status_code=201)
async def submit_decision(
    body: DecisionSubmit,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    # Verify match exists and is live
    result = await db.execute(select(Match).where(Match.id == body.match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")
    if match.status != MatchStatus.live:
        raise HTTPException(400, "Match is not currently live")

    # Check decision window is open
    dw = await get_decision_window(body.match_id)
    if not dw:
        raise HTTPException(400, "Decision window is not open right now")

    # Prevent duplicate decision for same ball
    dup = await db.execute(
        select(Decision).where(
            Decision.user_id == current_user.id,
            Decision.match_id == body.match_id,
            Decision.innings == body.innings,
            Decision.over_no == body.over_no,
            Decision.ball_no == body.ball_no,
            Decision.decision_type == body.decision_type,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(400, "You already submitted this decision")

    # Get the ball's captain decisions for scoring
    ball_result = await db.execute(
        select(Ball).where(
            Ball.match_id == body.match_id,
            Ball.innings == body.innings,
            Ball.over_no == body.over_no,
            Ball.ball_no == body.ball_no,
        )
    )
    ball = ball_result.scalar_one_or_none()

    captain_field = ball.captain_field_config if ball else None
    captain_bowl = ball.captain_bowling_decision if ball else None
    captain_bat = ball.captain_batting_order_decision if ball else None
    captain_pp = ball.captain_powerplay_decision if ball else None

    # Determine bowler type and batsman hand from ball data
    bowler_type = "pace_swing"  # default; would be enriched from player DB
    batsman_hand = "RHB"

    scores = scoring_engine.compute_score(
        decision_type=body.decision_type,
        fan_payload=body.payload,
        captain_field=captain_field,
        captain_bowl=captain_bowl,
        captain_bat=captain_bat,
        captain_pp=captain_pp,
        innings=body.innings,
        over_no=body.over_no,
        wickets=match.team_b_wickets if match.batting_team == match.team_b else match.team_a_wickets,
        score=match.team_b_score if match.batting_team == match.team_b else match.team_a_score,
        bowler_type=bowler_type,
        batsman_hand=batsman_hand,
    )

    # Generate AI explanation asynchronously
    match_context = {
        "title": match.title,
        "over_no": body.over_no,
        "ball_no": body.ball_no,
        "innings": body.innings,
        "batting_team": match.batting_team,
        "score": match.team_b_score if match.batting_team == match.team_b else match.team_a_score,
        "wickets": match.team_b_wickets if match.batting_team == match.team_b else match.team_a_wickets,
        "bowler_type": bowler_type,
        "batsman": ball.batsman if ball else "Unknown",
        "batsman_hand": batsman_hand,
        "rr_bucket": "mid",
    }

    captain_decision = {}
    if body.decision_type == "field_placement" and captain_field:
        captain_decision = captain_field
    elif body.decision_type == "bowling_change" and captain_bowl:
        captain_decision = {"bowler": captain_bowl}
    elif body.decision_type == "batting_order" and captain_bat:
        captain_decision = {"batsman": captain_bat}

    explanation = await ai_service.generate_tactical_explanation(
        decision_type=body.decision_type,
        fan_payload=body.payload if isinstance(body.payload, dict) else {"value": body.payload},
        captain_decision=captain_decision,
        match_context=match_context,
        score_breakdown=scores,
    )

    decision = Decision(
        user_id=current_user.id,
        match_id=body.match_id,
        innings=body.innings,
        over_no=body.over_no,
        ball_no=body.ball_no,
        decision_type=body.decision_type,
        payload=body.payload if isinstance(body.payload, dict) else {"value": body.payload},
        captain_match_score=scores["captain_match_score"],
        historical_score=scores["historical_score"],
        rule_score=scores["rule_score"],
        total_score=scores["total_score"],
        ai_explanation=explanation,
    )
    db.add(decision)

    # Update user's cumulative score
    current_user.total_score += scores["total_score"]
    current_user.decisions_made += 1

    await db.commit()
    await db.refresh(decision)

    # Update Redis leaderboard
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    await r.zadd("leaderboard:global", {str(current_user.id): current_user.total_score})
    await r.zadd(f"leaderboard:match:{body.match_id}", {str(current_user.id): scores["total_score"]})
    await r.aclose()

    return decision


@router.get("/my/{match_id}", response_model=list[DecisionOut])
async def my_decisions(
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
    return result.scalars().all()
