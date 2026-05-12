"""
Shared fixtures for all tests.
Uses an in-memory SQLite database and a fakeredis instance so no
real Postgres or Redis is needed to run the suite.
"""
import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import AsyncMock, patch

from app.database import Base, get_db
from app.config import settings
import app.models  # noqa: F401 — registers all models with Base.metadata

# ── in-memory SQLite engine ─────────────────────────────────────────────────
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


# ── app fixture ──────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def app() -> FastAPI:
    """Create tables once for the whole session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.main import app as fastapi_app
    fastapi_app.dependency_overrides[get_db] = override_get_db

    # Seed historical data
    data_path = Path(__file__).parent.parent / "app" / "data" / "historical_situations.json"
    from app.models.historical import HistoricalSituation
    async with TestSessionLocal() as db:
        from sqlalchemy import select
        r = await db.execute(select(HistoricalSituation))
        if not r.scalars().first():
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

    yield fastapi_app

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="session")
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── mock Redis so no real Redis needed ──────────────────────────────────────
@pytest.fixture(autouse=True)
def mock_redis():
    """Replace all redis calls with no-ops so tests don't need a live Redis."""
    fake_store: dict = {}

    async def fake_get(key):
        return fake_store.get(key)

    async def fake_set(key, value, **kwargs):
        fake_store[key] = value

    async def fake_delete(key):
        fake_store.pop(key, None)

    async def fake_zadd(key, mapping, **kwargs):
        pass

    async def fake_zrevrange(key, start, end, **kwargs):
        return []

    async def fake_zrevrank(key, member):
        return None

    async def fake_aclose():
        pass

    mock = AsyncMock()
    mock.get = fake_get
    mock.set = fake_set
    mock.delete = fake_delete
    mock.zadd = fake_zadd
    mock.zrevrange = fake_zrevrange
    mock.zrevrank = fake_zrevrank
    mock.aclose = fake_aclose

    with patch("redis.asyncio.from_url", return_value=mock):
        yield mock


# ── helper: register + get token ────────────────────────────────────────────
@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    import time
    unique = str(int(time.time() * 1000))[-6:]
    res = await client.post("/auth/register", json={
        "username": f"testuser_{unique}",
        "email": f"test_{unique}@example.com",
        "password": "TestPass123!",
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def seeded_match(client: AsyncClient, auth_headers: dict) -> dict:
    """Seed a match via the match engine seeding and return the first match."""
    from app.services.match_engine import seed_matches
    async with TestSessionLocal() as db:
        await seed_matches(db)
    res = await client.get("/matches", headers=auth_headers)
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) > 0
    return matches[0]
