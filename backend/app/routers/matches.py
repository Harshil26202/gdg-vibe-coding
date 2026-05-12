import asyncio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.match import Match, Ball, MatchStatus
from app.schemas.match import MatchOut, LiveMatchState
from app.services.match_engine import (
    get_match_state, run_match_simulation, get_decision_window
)
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchOut])
async def list_matches(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Match).order_by(Match.id))
    return result.scalars().all()


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(match_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")
    return match


@router.post("/{match_id}/start")
async def start_match(match_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")
    if match.status == MatchStatus.live:
        raise HTTPException(400, "Match already live")
    background_tasks.add_task(run_match_simulation, match_id, None)
    return {"message": f"Match {match_id} simulation started"}


@router.get("/{match_id}/state")
async def get_live_state(match_id: int, db: AsyncSession = Depends(get_db)):
    state = await get_match_state(match_id)
    if state:
        return state
    # Fall back to DB
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")
    result2 = await db.execute(
        select(Ball).where(Ball.match_id == match_id).order_by(Ball.id)
    )
    balls = result2.scalars().all()
    dw = await get_decision_window(match_id)
    return {
        "match": MatchOut.model_validate(match).model_dump(),
        "recent_balls": [
            {"over_no": b.over_no, "ball_no": b.ball_no, "bowler": b.bowler,
             "batsman": b.batsman, "runs": b.runs, "is_wicket": b.is_wicket,
             "commentary": b.commentary}
            for b in balls[-6:]
        ],
        "decision_window_open": dw is not None,
        "decision_window_type": dw,
        "decision_window_seconds_left": 0,
    }


@router.websocket("/{match_id}/ws")
async def match_websocket(match_id: int, websocket: WebSocket, db: AsyncSession = Depends(get_db)):
    await ws_manager.connect(match_id, websocket)
    try:
        # Send current state immediately on connect
        state = await get_match_state(match_id)
        if state:
            await ws_manager.send_personal(websocket, state)

        while True:
            # Keep alive — listen for pings from client
            data = await websocket.receive_text()
            if data == "ping":
                await ws_manager.send_personal(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(match_id, websocket)
