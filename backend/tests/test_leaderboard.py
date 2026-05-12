"""Tests for /leaderboard endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_global_leaderboard(client: AsyncClient, auth_headers: dict):
    res = await client.get("/leaderboard/global", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_match_leaderboard(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    res = await client.get(f"/leaderboard/match/{seeded_match['id']}", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_leaderboard_unauthenticated(client: AsyncClient):
    # Leaderboard is a public endpoint — anyone can browse it
    res = await client.get("/leaderboard/global")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_leaderboard_entry_shape(client: AsyncClient, auth_headers: dict):
    res = await client.get("/leaderboard/global", headers=auth_headers)
    entries = res.json()
    if entries:
        entry = entries[0]
        assert "rank" in entry
        assert "username" in entry
        assert "score" in entry
        assert "decisions_made" in entry
