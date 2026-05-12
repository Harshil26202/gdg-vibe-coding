from __future__ import annotations

import json
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


async def generate_over_commentary(
    over_no: int,
    balls: list[dict],
    runs_in_over: int,
    wickets_in_over: int,
    batting_team: str,
    bowling_team: str,
    total_score: int,
    total_wickets: int,
    fan_decision_summary: str | None = None,
) -> str:
    if not settings.openai_api_key:
        return _fallback_commentary(over_no, runs_in_over, wickets_in_over, batting_team)

    ball_summary = " | ".join(
        f"{'W' if b.get('is_wicket') else b.get('runs', 0)}" for b in balls
    )
    fan_context = f"\nThe fan coach decided: {fan_decision_summary}" if fan_decision_summary else ""

    prompt = f"""You are Harsha Bhogle, the legendary cricket commentator. Deliver a punchy end-of-over summary.

Over {over_no + 1} just ended.
Batting: {batting_team} | Bowling: {bowling_team}
Ball-by-ball: {ball_summary}
Over result: {runs_in_over} runs, {wickets_in_over} wickets
Current score: {total_score}/{total_wickets}{fan_context}

Write 2 sharp sentences in Harsha's style — vivid, specific, with a hint of drama. Reference the fan's decision if provided. No hashtags, no emojis."""

    try:
        response = await _get_client().chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()
    except Exception:
        logger.exception("Commentary generation failed")
        return _fallback_commentary(over_no, runs_in_over, wickets_in_over, batting_team)


async def generate_ai_opponent_decision(
    decision_type: str,
    match_context: dict,
    available_options: list[str],
) -> dict:
    if not settings.openai_api_key:
        return {"choice": available_options[0] if available_options else "default", "reasoning": "Tactical default."}

    prompt = f"""You are an expert IPL coach making a real-time tactical decision.

Match: {match_context.get('title')}
Over: {match_context.get('over_no')}, Score: {match_context.get('score')}/{match_context.get('wickets')}
Innings: {match_context.get('innings')}, Bowler type: {match_context.get('bowler_type')}
Batsman: {match_context.get('batsman')} ({match_context.get('batsman_hand', 'RHB')})

Decision needed: {decision_type}
Available options: {', '.join(available_options)}

Reply with ONLY a JSON object: {{"choice": "<option>", "reasoning": "<one sentence why>"}}"""

    try:
        response = await _get_client().chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return {"choice": available_options[0] if available_options else "default", "reasoning": "Tactical default."}


async def generate_coach_report(
    username: str,
    match_title: str,
    decisions: list[dict],
    total_score: float,
    rank: int,
) -> dict:
    if not decisions:
        return {
            "headline": "Not enough data yet",
            "strengths": ["Keep playing to unlock your report!"],
            "weaknesses": [],
            "signature_move": "TBD",
            "overall_verdict": "Play more matches to unlock your coaching profile.",
            "coach_rating": "Rookie",
        }

    by_type: dict[str, list[float]] = {}
    for d in decisions:
        by_type.setdefault(d["decision_type"], []).append(d["total_score"])

    type_avgs = {k: sum(v) / len(v) for k, v in by_type.items()}
    best_type = max(type_avgs, key=type_avgs.get) if type_avgs else "field_placement"
    worst_type = min(type_avgs, key=type_avgs.get) if type_avgs else "bowling_change"

    if not settings.openai_api_key:
        return _fallback_report(username, total_score, best_type, worst_type, rank)

    decisions_summary = "\n".join(
        f"- {d['decision_type'].replace('_',' ')}: {round(d['total_score'])}/100 (over {d['over_no']})"
        for d in decisions[-10:]
    )

    prompt = f"""You are a cricket analyst writing a personalized Coach Report Card.

Player: {username}
Match: {match_title}
Final Score: {round(total_score)} points | Rank: #{rank}
Best decision type: {best_type.replace('_',' ')} (avg {round(type_avgs.get(best_type, 0))}/100)
Weakest type: {worst_type.replace('_',' ')} (avg {round(type_avgs.get(worst_type, 0))}/100)

Recent decisions:
{decisions_summary}

Write a JSON coach report with these exact keys:
{{
  "headline": "<punchy 6-word headline for this coach>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>"],
  "signature_move": "<their signature tactical tendency in one phrase>",
  "overall_verdict": "<2 sentences of coaching verdict>",
  "coach_rating": "<one of: Rookie / Club Pro / State Level / National Prospect / Elite Coach>"
}}

Be specific to their actual decisions. Be honest but encouraging."""

    try:
        response = await _get_client().chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        logger.exception("Report generation failed")
        return _fallback_report(username, total_score, best_type, worst_type, rank)


def _fallback_commentary(over_no: int, runs: int, wickets: int, team: str) -> str:
    if wickets > 0 and runs < 8:
        return f"A productive over for the bowling side! {wickets} wicket(s) and just {runs} runs — the pressure is building on {team}."
    elif runs >= 15:
        return f"What an over! {runs} runs in that over — {team} are absolutely flying and putting the bowlers to the sword."
    else:
        return f"{runs} runs from that over, keeping {team} ticking along steadily. The game is perfectly poised."


def _fallback_report(username: str, total_score: float, best: str, worst: str, rank: int) -> dict:
    rating = "Elite Coach" if total_score > 300 else "National Prospect" if total_score > 200 else "State Level" if total_score > 100 else "Club Pro"
    return {
        "headline": f"Tactical mind with strong {best.replace('_', ' ')} instincts",
        "strengths": [f"Strong {best.replace('_', ' ')} decisions", "Good reading of match situations"],
        "weaknesses": [f"Needs work on {worst.replace('_', ' ')} calls"],
        "signature_move": f"Aggressive {best.replace('_', ' ')} approach",
        "overall_verdict": f"Ranked #{rank} with {round(total_score)} points. Solid tactical foundation with room to grow.",
        "coach_rating": rating,
    }
