"""Tests for /challenge endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_challenge(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    res = await client.post(
        f"/challenge/create?match_id={seeded_match['id']}",
        headers=auth_headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "waiting"
    assert body["opponent_is_ai"] is False
    assert body["match_id"] == seeded_match["id"]


@pytest.mark.asyncio
async def test_get_challenge(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    create_res = await client.post(
        f"/challenge/create?match_id={seeded_match['id']}",
        headers=auth_headers,
    )
    cid = create_res.json()["id"]
    res = await client.get(f"/challenge/{cid}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == cid


@pytest.mark.asyncio
async def test_join_own_challenge_fails(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    create_res = await client.post(
        f"/challenge/create?match_id={seeded_match['id']}",
        headers=auth_headers,
    )
    cid = create_res.json()["id"]
    res = await client.post(f"/challenge/{cid}/join", headers=auth_headers)
    assert res.status_code == 400
    assert "own" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_join_challenge_second_user(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """A different user can join a waiting challenge."""
    import time
    unique = str(int(time.time() * 1000))[-6:]
    reg_res = await client.post("/auth/register", json={
        "username": f"opponent_{unique}",
        "email": f"opp_{unique}@test.com",
        "password": "OpponentPass1!",
    })
    opponent_token = reg_res.json()["access_token"]
    opponent_headers = {"Authorization": f"Bearer {opponent_token}"}

    create_res = await client.post(
        f"/challenge/create?match_id={seeded_match['id']}",
        headers=auth_headers,
    )
    cid = create_res.json()["id"]

    join_res = await client.post(f"/challenge/{cid}/join", headers=opponent_headers)
    assert join_res.status_code == 200
    body = join_res.json()
    assert body["status"] == "active"
    assert body["opponent_is_ai"] is False


@pytest.mark.asyncio
async def test_challenge_not_found(client: AsyncClient, auth_headers: dict):
    res = await client.get("/challenge/9999", headers=auth_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_challenge_unauthenticated(client: AsyncClient, seeded_match: dict):
    res = await client.post(f"/challenge/create?match_id={seeded_match['id']}")
    assert res.status_code == 401
