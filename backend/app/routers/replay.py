from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.models.match import Ball
from app.models.user import User
from app.routers.auth import get_current_user_dep
from app.services.scoring_engine import compute_score
from app.services.ai_service import generate_tactical_explanation
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/replay", tags=["replay"])


class ReplayDecision(BaseModel):
    match_id: int
    innings: int
    over_no: int
    decision_type: str
    payload: dict


class ReplayResult(BaseModel):
    captain_match_score: float
    historical_score: float
    rule_score: float
    total_score: float
    captain_actual: dict
    ai_explanation: str
    outcome_hint: str


@router.get("/{match_id}/overs")
async def list_replayable_overs(
    match_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ball.over_no, Ball.innings)
        .where(Ball.match_id == match_id)
        .distinct()
        .order_by(Ball.innings, Ball.over_no)
    )
    rows = result.fetchall()
    return [{"innings": r.innings, "over_no": r.over_no} for r in rows]


@router.get("/{match_id}/over/{innings}/{over_no}")
async def get_over_balls(
    match_id: int,
    innings: int,
    over_no: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ball).where(
            Ball.match_id == match_id,
            Ball.innings == innings,
            Ball.over_no == over_no,
        ).order_by(Ball.ball_no)
    )
    balls = result.scalars().all()
    if not balls:
        raise HTTPException(404, "Over not found")

    return [
        {
            "ball_no": b.ball_no,
            "bowler": b.bowler,
            "batsman": b.batsman,
            "runs": b.runs,
            "is_wicket": b.is_wicket,
            "wicket_type": b.wicket_type,
            "commentary": b.commentary,
            "captain_field": b.captain_field_config,
            "captain_bowl": b.captain_bowling_decision,
            "captain_bat": b.captain_batting_order_decision,
        }
        for b in balls
    ]


@router.post("/try", response_model=ReplayResult)
async def try_replay_decision(
    body: ReplayDecision,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ball).where(
            Ball.match_id == body.match_id,
            Ball.innings == body.innings,
            Ball.over_no == body.over_no,
        ).order_by(Ball.ball_no)
    )
    balls = result.scalars().all()
    if not balls:
        raise HTTPException(404, "Over not found")

    ball = balls[0]
    captain_field = ball.captain_field_config
    captain_bowl = ball.captain_bowling_decision
    captain_bat = ball.captain_batting_order_decision

    over_runs = sum(b.runs for b in balls)
    over_wickets = sum(1 for b in balls if b.is_wicket)

    scores = compute_score(
        decision_type=body.decision_type,
        fan_payload=body.payload,
        captain_field=captain_field,
        captain_bowl=captain_bowl,
        captain_bat=captain_bat,
        captain_pp=None,
        innings=body.innings,
        over_no=body.over_no,
        wickets=over_wickets,
        score=over_runs * (body.over_no + 1),
        bowler_type="pace_swing",
        batsman_hand="RHB",
    )

    captain_actual: dict = {}
    if body.decision_type == "field_placement" and captain_field:
        captain_actual = captain_field
    elif body.decision_type == "bowling_change" and captain_bowl:
        captain_actual = {"bowler": captain_bowl}
    elif body.decision_type == "batting_order" and captain_bat:
        captain_actual = {"batsman": captain_bat}

    match_context = {
        "title": f"Match {body.match_id} Replay",
        "over_no": body.over_no,
        "ball_no": 1,
        "innings": body.innings,
        "batting_team": "Team",
        "score": over_runs,
        "wickets": over_wickets,
        "bowler_type": "pace_swing",
        "batsman": ball.batsman,
        "batsman_hand": "RHB",
        "rr_bucket": "mid",
    }

    explanation = await generate_tactical_explanation(
        decision_type=body.decision_type,
        fan_payload=body.payload,
        captain_decision=captain_actual,
        match_context=match_context,
        score_breakdown=scores,
    )

    outcome_hint = (
        f"This over went for {over_runs} runs and {over_wickets} wicket(s). "
        f"{'The captain\\'s call paid off!' if scores['captain_match_score'] > 20 else 'Your call was a valid alternative.'}"
    )

    return ReplayResult(
        captain_match_score=scores["captain_match_score"],
        historical_score=scores["historical_score"],
        rule_score=scores["rule_score"],
        total_score=scores["total_score"],
        captain_actual=captain_actual,
        ai_explanation=explanation,
        outcome_hint=outcome_hint,
    )
