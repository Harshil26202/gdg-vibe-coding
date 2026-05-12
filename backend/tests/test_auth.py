"""Tests for /auth endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    res = await client.post("/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "SecurePass1!",
    })
    assert res.status_code == 201
    body = res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "newuser@example.com"
    assert body["user"]["username"] == "newuser"
    assert body["user"]["total_score"] == 0.0


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"username": "dup1", "email": "dup@test.com", "password": "Pass1!"}
    await client.post("/auth/register", json=payload)
    res = await client.post("/auth/register", json={**payload, "username": "dup2"})
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/auth/register", json={
        "username": "loginuser", "email": "login@test.com", "password": "MyPass99!"
    })
    res = await client.post("/auth/login", json={
        "email": "login@test.com", "password": "MyPass99!"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/auth/register", json={
        "username": "wp_user", "email": "wp@test.com", "password": "CorrectPass1"
    })
    res = await client.post("/auth/login", json={
        "email": "wp@test.com", "password": "WrongPass!"
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    res = await client.post("/auth/login", json={
        "email": "nobody@test.com", "password": "anything"
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, auth_headers: dict):
    res = await client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert "email" in body
    assert "total_score" in body


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    res = await client.get("/auth/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    res = await client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert res.status_code == 401
