"""Tests for /decisions endpoints and the scoring engine."""
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient


async def _make_match_live(client: AsyncClient, auth_headers: dict, match_id: int):
    """Force a match to live status directly in DB for testing."""
    from tests.conftest import TestSessionLocal
    from app.models.match import Match, MatchStatus
    from sqlalchemy import select
    async with TestSessionLocal() as db:
        r = await db.execute(select(Match).where(Match.id == match_id))
        match = r.scalar_one_or_none()
        if match:
            match.status = MatchStatus.live
            await db.commit()


@pytest.mark.asyncio
async def test_submit_decision_window_closed(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """Decision should fail when no window is open."""
    match_id = seeded_match["id"]
    await _make_match_live(client, auth_headers, match_id)

    res = await client.post("/decisions", headers=auth_headers, json={
        "match_id": match_id,
        "innings": 1,
        "over_no": 0,
        "ball_no": 1,
        "decision_type": "field_placement",
        "payload": {"slip": True, "gully": True},
    })
    assert res.status_code == 400
    assert "window" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_submit_decision_match_not_live(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """Decision on an upcoming match should fail."""
    # seeded_match is 'upcoming' by default
    res = await client.post("/decisions", headers=auth_headers, json={
        "match_id": seeded_match["id"],
        "innings": 1,
        "over_no": 0,
        "ball_no": 1,
        "decision_type": "bowling_change",
        "payload": {"bowler": "Deepak Chahar", "bowler_type": "pace_swing"},
    })
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_submit_decision_with_open_window(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """When the decision window is explicitly opened, submission should succeed."""
    match_id = seeded_match["id"]
    await _make_match_live(client, auth_headers, match_id)

    # Open a decision window in Redis mock
    from app.services.match_engine import open_decision_window
    await open_decision_window(match_id, "field_placement", seconds=60)

    with patch("app.services.ai_service.generate_tactical_explanation", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = "Great field placement choice!"

        res = await client.post("/decisions", headers=auth_headers, json={
            "match_id": match_id,
            "innings": 1,
            "over_no": 0,
            "ball_no": 1,
            "decision_type": "field_placement",
            "payload": [
                {"name": "slip", "active": True},
                {"name": "gully", "active": True},
                {"name": "cover_point", "active": True},
                {"name": "mid_off", "active": True},
                {"name": "mid_on", "active": True},
                {"name": "fine_leg", "active": True},
                {"name": "square_leg", "active": True},
                {"name": "third_man", "active": True},
                {"name": "deep_midwicket", "active": False},
            ],
        })

    assert res.status_code == 201
    body = res.json()
    assert "total_score" in body
    assert 0 <= body["total_score"] <= 100
    assert "captain_match_score" in body
    assert "historical_score" in body
    assert "rule_score" in body
    assert body["ai_explanation"] == "Great field placement choice!"


@pytest.mark.asyncio
async def test_no_duplicate_decision(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """Same user cannot submit the same decision type for the same ball twice."""
    match_id = seeded_match["id"]
    await _make_match_live(client, auth_headers, match_id)
    from app.services.match_engine import open_decision_window
    await open_decision_window(match_id, "bowling_change", seconds=60)

    payload = {
        "match_id": match_id,
        "innings": 1,
        "over_no": 1,
        "ball_no": 6,
        "decision_type": "bowling_change",
        "payload": {"bowler": "Maheesh Theekshana", "bowler_type": "spin_offbreak"},
    }
    with patch("app.services.ai_service.generate_tactical_explanation", new_callable=AsyncMock, return_value="OK"):
        r1 = await client.post("/decisions", headers=auth_headers, json=payload)
        r2 = await client.post("/decisions", headers=auth_headers, json=payload)

    assert r1.status_code == 201
    assert r2.status_code == 400
    assert "already submitted" in r2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_my_decisions(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    res = await client.get(f"/decisions/my/{seeded_match['id']}", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_decisions_unauthenticated(client: AsyncClient, seeded_match: dict):
    res = await client.get(f"/decisions/my/{seeded_match['id']}")
    assert res.status_code == 401
