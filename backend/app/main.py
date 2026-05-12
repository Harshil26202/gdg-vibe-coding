from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, AsyncSessionLocal, Base
from app.models import User, Match, Ball, Decision, HistoricalSituation
from app.routers import auth, matches, decisions, leaderboard
from app.services.match_engine import seed_matches
import json
from pathlib import Path


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed mock matches
    async with AsyncSessionLocal() as db:
        await seed_matches(db)

    # Seed historical situations
    await _seed_historical()

    yield


async def _seed_historical():
    from sqlalchemy import select
    from app.models.historical import HistoricalSituation

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


app = FastAPI(title="IPL Coaching Simulator", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(matches.router)
app.include_router(decisions.router)
app.include_router(leaderboard.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
