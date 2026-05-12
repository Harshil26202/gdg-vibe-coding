import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, AsyncSessionLocal, Base
from app.models import User, Match, Ball, Decision, HistoricalSituation, PreMatchStrategy, Challenge, OverCommentary
from app.routers import auth, matches, decisions, leaderboard, strategy, challenge, replay, report
from app.services.match_engine import seed_matches
import json
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting IPL Coaching Simulator...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed_matches(db)
    await _seed_historical()
    logger.info("Startup complete.")
    yield
    logger.info("Shutting down.")


async def _seed_historical():
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(HistoricalSituation))
        if result.scalars().first():
            return
        data_path = Path(__file__).parent / "data" / "historical_situations.json"
        with open(data_path) as f:
            situations = json.load(f)
        for s in situations:
            db.add(HistoricalSituation(
                situation_hash=s["situation_hash"],
                innings=s["innings"],
                over_bucket=s["over_bucket"],
                wickets_down=s["wickets_down"],
                run_rate_bucket=s["run_rate_bucket"],
                bowler_type=s["bowler_type"],
                batsman_hand=s["batsman_hand"],
                optimal_field_config=s.get("optimal_field_config"),
                optimal_bowler_type=s.get("optimal_bowler_type"),
                win_probability_delta=s.get("win_probability_delta", 0.0),
            ))
        await db.commit()
        logger.info("Historical situations seeded.")


app = FastAPI(
    title="IPL Coaching Simulator",
    version="2.0.0",
    description="Real-time IPL tactical decision simulator with AI coaching analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router)
app.include_router(matches.router)
app.include_router(decisions.router)
app.include_router(leaderboard.router)
app.include_router(strategy.router)
app.include_router(challenge.router)
app.include_router(replay.router)
app.include_router(report.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": "2.0.0"}
