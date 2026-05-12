from __future__ import annotations

import logging
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def generate_tactical_explanation(
    decision_type: str,
    fan_payload: dict,
    captain_decision: dict,
    match_context: dict,
    score_breakdown: dict,
) -> str:
    if not settings.openai_api_key:
        return _fallback_explanation(decision_type, score_breakdown)

    context_str = (
        f"Match: {match_context.get('title', 'IPL Match')}\n"
        f"Over: {match_context.get('over_no', '?')}.{match_context.get('ball_no', '?')}, "
        f"Innings: {match_context.get('innings', 1)}\n"
        f"Score: {match_context.get('batting_team', 'Team')} "
        f"{match_context.get('score', 0)}/{match_context.get('wickets', 0)}\n"
        f"Bowler type: {match_context.get('bowler_type', 'unknown')}, "
        f"Batsman: {match_context.get('batsman', 'unknown')} ({match_context.get('batsman_hand', 'RHB')})\n"
        f"Run rate bucket: {match_context.get('rr_bucket', 'mid')}"
    )

    fan_str = _format_decision(decision_type, fan_payload)
    captain_str = _format_decision(decision_type, captain_decision)

    prompt = f"""You are an expert IPL cricket analyst. A fan made a tactical decision during a live match. Analyze it concisely.

Match Context:
{context_str}

Fan's Decision ({decision_type.replace('_', ' ')}):
{fan_str}

Captain's Actual Decision:
{captain_str}

Score: {score_breakdown.get('total_score', 0)}/100 (Captain agreement: {score_breakdown.get('captain_match_score', 0)}/40, Historical merit: {score_breakdown.get('historical_score', 0)}/40, Tactical rules: {score_breakdown.get('rule_score', 0)}/20)

In 2-3 sentences, explain: (1) whether the fan's decision was tactically sound, (2) why the captain made their choice, and (3) what the historical data says about this situation. Be specific to the match situation. Be direct and engaging, like a TV commentator."""

    try:
        response = await _get_client().chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()
    except Exception:
        logger.exception("Tactical explanation generation failed")
        return _fallback_explanation(decision_type, score_breakdown)


def _format_decision(decision_type: str, payload: dict) -> str:
    if not payload:
        return "No decision recorded"
    if decision_type == "field_placement":
        if isinstance(payload, list):
            active = [p["name"] for p in payload if p.get("active", True)]
            return f"Positions: {', '.join(active)}"
        active = [k for k, v in payload.items() if v]
        return f"Positions: {', '.join(active)}"
    if decision_type == "bowling_change":
        return f"Bowler: {payload.get('bowler', payload.get('bowler_type', str(payload)))}"
    if decision_type == "batting_order":
        return f"Batsman: {payload.get('batsman', str(payload))}"
    if decision_type in ("powerplay", "drs_review"):
        return f"Use: {payload.get('use', payload)}"
    return str(payload)


def _fallback_explanation(decision_type: str, score: dict) -> str:
    total = score.get("total_score", 0)
    if total >= 70:
        return "Excellent tactical decision! Your choice aligns well with both the captain's strategy and historical data for this match situation. You clearly read the game well."
    elif total >= 45:
        return "Decent tactical instinct — you got some elements right, but the captain's decision had subtle advantages given the pitch conditions and batsman tendencies in this situation."
    else:
        return "The captain's choice was significantly different here. In similar IPL situations, the historical data shows that the alternative approach yields better results in containing runs and taking wickets."
