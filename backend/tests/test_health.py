"""Smoke tests — health check and OpenAPI schema."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient):
    res = await client.get("/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    assert "paths" in schema
    # All major routers should be present
    paths = schema["paths"]
    assert any("/auth" in p for p in paths)
    assert any("/matches" in p for p in paths)
    assert any("/decisions" in p for p in paths)
    assert any("/leaderboard" in p for p in paths)
    assert any("/strategy" in p for p in paths)
    assert any("/challenge" in p for p in paths)
    assert any("/replay" in p for p in paths)
    assert any("/report" in p for p in paths)
