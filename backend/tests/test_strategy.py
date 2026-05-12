"""Tests for /strategy endpoints."""
import pytest
from httpx import AsyncClient

STRATEGY_PAYLOAD = {
    "playing_xi": [
        "Ruturaj Gaikwad", "Devon Conway", "Ajinkya Rahane", "Shivam Dube",
        "Ravindra Jadeja", "MS Dhoni", "Moeen Ali", "Deepak Chahar",
        "Tushar Deshpande", "Maheesh Theekshana", "Simarjeet Singh",
    ],
    "opening_pair": ["Ruturaj Gaikwad", "Devon Conway"],
    "powerplay_bowler": "Deepak Chahar",
    "death_over_bowler": "Tushar Deshpande",
    "extra_notes": "Use spin early if pitch is turning.",
}


@pytest.mark.asyncio
async def test_create_strategy(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    payload = {**STRATEGY_PAYLOAD, "match_id": seeded_match["id"]}
    res = await client.post("/strategy", headers=auth_headers, json=payload)
    assert res.status_code == 201
    body = res.json()
    assert body["playing_xi"] == STRATEGY_PAYLOAD["playing_xi"]
    assert body["powerplay_bowler"] == "Deepak Chahar"
    assert body["death_over_bowler"] == "Tushar Deshpande"


@pytest.mark.asyncio
async def test_update_strategy_idempotent(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """Second POST should upsert, not create a duplicate."""
    payload = {**STRATEGY_PAYLOAD, "match_id": seeded_match["id"]}
    r1 = await client.post("/strategy", headers=auth_headers, json=payload)
    updated = {**payload, "death_over_bowler": "Maheesh Theekshana"}
    r2 = await client.post("/strategy", headers=auth_headers, json=updated)
    assert r1.status_code in (200, 201)
    assert r2.status_code in (200, 201)
    assert r2.json()["death_over_bowler"] == "Maheesh Theekshana"


@pytest.mark.asyncio
async def test_get_strategy(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    payload = {**STRATEGY_PAYLOAD, "match_id": seeded_match["id"]}
    await client.post("/strategy", headers=auth_headers, json=payload)
    res = await client.get(f"/strategy/{seeded_match['id']}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["powerplay_bowler"] == "Deepak Chahar"


@pytest.mark.asyncio
async def test_get_strategy_not_found(client: AsyncClient, auth_headers: dict):
    res = await client.get("/strategy/9999", headers=auth_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_strategy_invalid_match(client: AsyncClient, auth_headers: dict):
    payload = {**STRATEGY_PAYLOAD, "match_id": 9999}
    res = await client.post("/strategy", headers=auth_headers, json=payload)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_strategy_unauthenticated(client: AsyncClient, seeded_match: dict):
    res = await client.post("/strategy", json={**STRATEGY_PAYLOAD, "match_id": seeded_match["id"]})
    assert res.status_code == 401
