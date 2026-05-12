import json
import asyncio
import redis.asyncio as aioredis
from pathlib import Path
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.match import Match, Ball, MatchStatus
from app.services.websocket_manager import ws_manager

MATCH_DATA_DIR = Path(__file__).parent.parent / "data" / "mock_matches"
BALL_INTERVAL = 12  # seconds between balls
DECISION_WINDOW = 10  # seconds fans have to submit decisions


def _redis():
    return aioredis.from_url(settings.redis_url, decode_responses=True)


async def seed_matches(db: AsyncSession):
    """Load mock match scripts into the database on startup."""
    result = await db.execute(select(Match))
    if result.scalars().first():
        return  # already seeded

    for path in MATCH_DATA_DIR.glob("*.json"):
        with open(path) as f:
            data = json.load(f)

        inning_data = data["innings"][0]
        match = Match(
            title=data["title"],
            team_a=data["team_a"],
            team_b=data["team_b"],
            venue=data["venue"],
            status=MatchStatus.upcoming,
            batting_team=inning_data["batting_team"],
            bowling_team=inning_data["bowling_team"],
        )
        db.add(match)
        await db.flush()

        for over in inning_data["overs"]:
            for ball_data in over["balls"]:
                ball = Ball(
                    match_id=match.id,
                    innings=1,
                    over_no=over["over_no"],
                    ball_no=ball_data["ball_no"],
                    bowler=over["bowler"],
                    batsman=ball_data["batsman"],
                    runs=ball_data["runs"],
                    is_wicket=ball_data["is_wicket"],
                    wicket_type=ball_data.get("wicket_type"),
                    extras=0,
                    commentary=ball_data["commentary"],
                    captain_field_config=ball_data.get("captain_field"),
                    captain_bowling_decision=ball_data.get("captain_bowl"),
                    captain_batting_order_decision=ball_data.get("captain_bat"),
                    captain_powerplay_decision=ball_data.get("captain_pp"),
                )
                db.add(ball)

    await db.commit()


async def get_match_state(match_id: int) -> Optional[dict]:
    r = _redis()
    state = await r.get(f"match:{match_id}:state")
    await r.aclose()
    if state:
        return json.loads(state)
    return None


async def set_match_state(match_id: int, state: dict):
    r = _redis()
    await r.set(f"match:{match_id}:state", json.dumps(state), ex=3600)
    await r.aclose()


async def open_decision_window(match_id: int, decision_type: str, seconds: int = DECISION_WINDOW):
    r = _redis()
    await r.set(f"match:{match_id}:decision_window", decision_type, ex=seconds)
    await r.aclose()


async def close_decision_window(match_id: int):
    r = _redis()
    await r.delete(f"match:{match_id}:decision_window")
    await r.aclose()


async def get_decision_window(match_id: int) -> Optional[str]:
    r = _redis()
    val = await r.get(f"match:{match_id}:decision_window")
    await r.aclose()
    return val


async def _build_state_payload(match: Match, recent_balls: list[Ball], decision_window_type: Optional[str], seconds_left: int) -> dict:
    balls_data = [
        {
            "over_no": b.over_no, "ball_no": b.ball_no,
            "bowler": b.bowler, "batsman": b.batsman,
            "runs": b.runs, "is_wicket": b.is_wicket,
            "wicket_type": b.wicket_type, "commentary": b.commentary,
        }
        for b in recent_balls[-6:]
    ]
    return {
        "type": "match_state",
        "match": {
            "id": match.id, "title": match.title,
            "team_a": match.team_a, "team_b": match.team_b,
            "venue": match.venue, "status": match.status,
            "current_innings": match.current_innings,
            "current_over": match.current_over,
            "current_ball": match.current_ball,
            "team_a_score": match.team_a_score,
            "team_a_wickets": match.team_a_wickets,
            "team_b_score": match.team_b_score,
            "team_b_wickets": match.team_b_wickets,
            "batting_team": match.batting_team,
            "bowling_team": match.bowling_team,
        },
        "recent_balls": balls_data,
        "decision_window_open": decision_window_type is not None,
        "decision_window_type": decision_window_type,
        "decision_window_seconds_left": seconds_left,
    }


async def run_match_simulation(match_id: int, db_factory):
    """Background task: advance the match ball by ball."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Match).where(Match.id == match_id))
        match = result.scalar_one_or_none()
        if not match:
            return

        match.status = MatchStatus.live
        await db.commit()
        await db.refresh(match)

        result = await db.execute(
            select(Ball).where(Ball.match_id == match_id).order_by(Ball.id)
        )
        all_balls = result.scalars().all()

    for ball in all_balls:
        # Determine if this ball triggers a decision window
        decision_types = []
        if ball.captain_bowling_decision:
            decision_types.append("bowling_change")
        if ball.captain_batting_order_decision:
            decision_types.append("batting_order")
        if ball.captain_field_config:
            decision_types.append("field_placement")

        for dt in decision_types:
            await open_decision_window(match_id, dt, DECISION_WINDOW)
            # Broadcast decision window open
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Match).where(Match.id == match_id))
                match = result.scalar_one_or_none()
                result2 = await db.execute(
                    select(Ball).where(Ball.match_id == match_id).order_by(Ball.id)
                )
                recent = result2.scalars().all()

            payload = await _build_state_payload(match, list(recent), dt, DECISION_WINDOW)
            payload["type"] = "decision_window_open"
            payload["ball"] = {
                "over_no": ball.over_no, "ball_no": ball.ball_no,
                "bowler": ball.bowler, "batsman": ball.batsman,
                "batsman_hand": "RHB",  # simplified
            }
            await ws_manager.broadcast(match_id, payload)
            await asyncio.sleep(DECISION_WINDOW)
            await close_decision_window(match_id)

        # Deliver the ball
        await asyncio.sleep(2)

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Match).where(Match.id == match_id))
            match = result.scalar_one_or_none()
            match.current_over = ball.over_no
            match.current_ball = ball.ball_no
            if ball.runs > 0:
                if match.batting_team == match.team_b:
                    match.team_b_score += ball.runs
                else:
                    match.team_a_score += ball.runs
            if ball.is_wicket:
                if match.batting_team == match.team_b:
                    match.team_b_wickets += 1
                else:
                    match.team_a_wickets += 1
            await db.commit()
            await db.refresh(match)

            result2 = await db.execute(
                select(Ball).where(Ball.match_id == match_id).order_by(Ball.id)
            )
            recent = result2.scalars().all()

        delivered_payload = {
            "type": "ball_delivered",
            "ball": {
                "over_no": ball.over_no, "ball_no": ball.ball_no,
                "bowler": ball.bowler, "batsman": ball.batsman,
                "runs": ball.runs, "is_wicket": ball.is_wicket,
                "wicket_type": ball.wicket_type, "commentary": ball.commentary,
            },
            "match_score": {
                "team_a_score": match.team_a_score,
                "team_a_wickets": match.team_a_wickets,
                "team_b_score": match.team_b_score,
                "team_b_wickets": match.team_b_wickets,
            }
        }
        await ws_manager.broadcast(match_id, delivered_payload)

        state_payload = await _build_state_payload(match, list(recent), None, 0)
        await set_match_state(match_id, state_payload)
        await asyncio.sleep(BALL_INTERVAL - 2)

    # Match complete
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Match).where(Match.id == match_id))
        match = result.scalar_one_or_none()
        match.status = MatchStatus.completed
        await db.commit()

    await ws_manager.broadcast(match_id, {"type": "match_completed", "match_id": match_id})
