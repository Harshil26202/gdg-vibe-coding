"""Tests for /matches endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_matches(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    res = await client.get("/matches", headers=auth_headers)
    assert res.status_code == 200
    matches = res.json()
    assert isinstance(matches, list)
    assert len(matches) >= 1
    m = matches[0]
    assert "title" in m
    assert "team_a" in m
    assert "team_b" in m
    assert "status" in m
    assert m["status"] in ("upcoming", "live", "completed")


@pytest.mark.asyncio
async def test_get_match_by_id(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    match_id = seeded_match["id"]
    res = await client.get(f"/matches/{match_id}", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == match_id
    assert "title" in body


@pytest.mark.asyncio
async def test_get_match_not_found(client: AsyncClient, auth_headers: dict):
    res = await client.get("/matches/99999", headers=auth_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_get_match_state(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    match_id = seeded_match["id"]
    res = await client.get(f"/matches/{match_id}/state", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert "match" in body
    assert "recent_balls" in body
    assert "decision_window_open" in body


@pytest.mark.asyncio
async def test_start_match(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    match_id = seeded_match["id"]
    # Starting runs in background — just check the response is accepted
    res = await client.post(f"/matches/{match_id}/start", headers=auth_headers)
    # Either 200 (started) or 400 (already live)
    assert res.status_code in (200, 400)


@pytest.mark.asyncio
async def test_list_matches_unauthenticated(client: AsyncClient):
    # Match listing is a public endpoint — anyone can browse available matches
    res = await client.get("/matches")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
