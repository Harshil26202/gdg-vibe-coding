"""Tests for /report endpoints (coach report + commentary)."""
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_coach_report_no_decisions(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    """Report endpoint should return 200 even with no decisions (fallback data)."""
    with patch("app.services.commentary_service.generate_coach_report", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "headline": "Fresh coach on the block",
            "strengths": ["Eagerness"],
            "weaknesses": ["Needs more data"],
            "signature_move": "TBD",
            "overall_verdict": "Play more to unlock.",
            "coach_rating": "Rookie",
        }
        res = await client.get(f"/report/coach/{seeded_match['id']}", headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert "report" in body
    assert "total_score" in body
    assert "rank" in body
    assert body["report"]["coach_rating"] == "Rookie"


@pytest.mark.asyncio
async def test_coach_report_shape(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    with patch("app.services.commentary_service.generate_coach_report", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "headline": "Test headline",
            "strengths": ["s1", "s2"],
            "weaknesses": ["w1"],
            "signature_move": "sig",
            "overall_verdict": "verdict",
            "coach_rating": "Club Pro",
        }
        res = await client.get(f"/report/coach/{seeded_match['id']}", headers=auth_headers)

    body = res.json()
    assert "user" in body
    assert "match_title" in body
    assert "decisions_made" in body
    report = body["report"]
    for key in ["headline", "strengths", "weaknesses", "signature_move", "overall_verdict", "coach_rating"]:
        assert key in report


@pytest.mark.asyncio
async def test_commentary_not_found(client: AsyncClient, auth_headers: dict, seeded_match: dict):
    res = await client.get(f"/report/commentary/{seeded_match['id']}/1/99", headers=auth_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_report_unauthenticated(client: AsyncClient, seeded_match: dict):
    res = await client.get(f"/report/coach/{seeded_match['id']}")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_report_invalid_match(client: AsyncClient, auth_headers: dict):
    with patch("app.services.commentary_service.generate_coach_report", new_callable=AsyncMock) as mock:
        mock.return_value = {"headline": "x", "strengths": [], "weaknesses": [], "signature_move": "", "overall_verdict": "", "coach_rating": "Rookie"}
        res = await client.get("/report/coach/9999", headers=auth_headers)
    assert res.status_code == 404
