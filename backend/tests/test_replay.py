"""Tests for /replay endpoints."""
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_replayable_overs_empty(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """Before any simulation the overs list comes from DB balls."""
    res = await client.get(f"/replay/{seeded_match['id']}/overs", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_get_over_balls(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    overs = (await client.get(f"/replay/{seeded_match['id']}/overs", headers=auth_headers)).json()
    if not overs:
        pytest.skip("No balls seeded for this match")
    first_over = overs[0]
    res = await client.get(
        f"/replay/{seeded_match['id']}/over/{first_over['innings']}/{first_over['over_no']}",
        headers=auth_headers,
    )
    assert res.status_code == 200
    balls = res.json()
    assert isinstance(balls, list)
    assert len(balls) > 0
    for b in balls:
        assert "ball_no" in b
        assert "bowler" in b
        assert "batsman" in b


@pytest.mark.asyncio
async def test_try_replay_decision(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    overs = (await client.get(f"/replay/{seeded_match['id']}/overs", headers=auth_headers)).json()
    if not overs:
        pytest.skip("No balls seeded for this match")
    first_over = overs[0]

    with patch("app.services.ai_service.generate_tactical_explanation", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = "Interesting replay choice!"
        res = await client.post("/replay/try", headers=auth_headers, json={
            "match_id": seeded_match["id"],
            "innings": first_over["innings"],
            "over_no": first_over["over_no"],
            "decision_type": "field_placement",
            "payload": {"slip": True, "gully": True},
        })

    assert res.status_code == 200
    body = res.json()
    assert "total_score" in body
    assert "ai_explanation" in body
    assert "outcome_hint" in body
    assert 0 <= body["total_score"] <= 100


@pytest.mark.asyncio
async def test_replay_over_not_found(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    res = await client.get(f"/replay/{seeded_match['id']}/over/1/99", headers=auth_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_replay_unauthenticated(client: AsyncClient, seeded_match: dict):
    res = await client.get(f"/replay/{seeded_match['id']}/overs")
    assert res.status_code == 401
