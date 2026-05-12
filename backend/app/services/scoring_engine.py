import json
from pathlib import Path
from typing import Any

HISTORICAL_DATA_PATH = Path(__file__).parent.parent / "data" / "historical_situations.json"

_historical: list[dict] | None = None


def _load_historical() -> list[dict]:
    global _historical
    if _historical is None:
        with open(HISTORICAL_DATA_PATH) as f:
            _historical = json.load(f)
    return _historical


def _over_bucket(over_no: int) -> str:
    if over_no <= 5:
        return "0-5"
    elif over_no <= 10:
        return "6-10"
    elif over_no <= 15:
        return "11-15"
    return "16-20"


def _rr_bucket(score: int, over_no: int) -> str:
    if over_no == 0:
        return "low"
    rr = score / (over_no + 1)
    if rr < 6:
        return "low"
    elif rr < 9:
        return "mid"
    return "high"


def _situation_hash(innings: int, over_no: int, wickets: int, score: int, bowler_type: str, batsman_hand: str) -> str:
    return f"innings{innings}_{_over_bucket(over_no)}_wkt{wickets}_{_rr_bucket(score, over_no)}_{bowler_type}_{batsman_hand}"


def _field_similarity(fan_field: dict, captain_field: dict) -> float:
    """Returns 0-1 similarity between two field configurations."""
    if not fan_field or not captain_field:
        return 0.5
    positions = list(captain_field.keys())
    if not positions:
        return 0.5
    matches = sum(1 for p in positions if fan_field.get(p) == captain_field.get(p))
    return matches / len(positions)


# ── Captain match scoring ────────────────────────────────────────────────────

def score_captain_match(decision_type: str, fan_payload: Any, captain_field: dict | None,
                        captain_bowl: str | None, captain_bat: str | None, captain_pp: bool | None) -> float:
    if decision_type == "field_placement":
        if not captain_field or not fan_payload:
            return 20.0
        fan_field = {item["name"]: item.get("active", True) for item in fan_payload} if isinstance(fan_payload, list) else fan_payload
        sim = _field_similarity(fan_field, captain_field)
        return round(sim * 40, 1)

    if decision_type == "bowling_change":
        if not captain_bowl:
            return 20.0
        fan_bowl = fan_payload.get("bowler") if isinstance(fan_payload, dict) else str(fan_payload)
        return 40.0 if fan_bowl == captain_bowl else 0.0

    if decision_type == "batting_order":
        if not captain_bat:
            return 20.0
        fan_bat = fan_payload.get("batsman") if isinstance(fan_payload, dict) else str(fan_payload)
        return 40.0 if fan_bat == captain_bat else 0.0

    if decision_type in ("powerplay", "drs_review"):
        fan_call = fan_payload.get("use") if isinstance(fan_payload, dict) else bool(fan_payload)
        captain_call = captain_pp if captain_pp is not None else False
        return 40.0 if fan_call == captain_call else 0.0

    return 20.0


# ── Historical scoring ───────────────────────────────────────────────────────

def score_historical(decision_type: str, fan_payload: Any, innings: int, over_no: int,
                     wickets: int, score: int, bowler_type: str, batsman_hand: str) -> float:
    hist = _load_historical()
    h = _situation_hash(innings, over_no, wickets, score, bowler_type, batsman_hand)
    match = next((s for s in hist if s["situation_hash"] == h), None)

    if not match:
        return 20.0  # neutral when no data

    if decision_type == "field_placement":
        optimal = match.get("optimal_field_config", {})
        fan_field = {item["name"]: item.get("active", True) for item in fan_payload} if isinstance(fan_payload, list) else (fan_payload or {})
        sim = _field_similarity(fan_field, optimal)
        return round(sim * 40, 1)

    if decision_type == "bowling_change":
        fan_bowl_type = fan_payload.get("bowler_type", "") if isinstance(fan_payload, dict) else ""
        optimal_bowl = match.get("optimal_bowler_type", "")
        return 40.0 if fan_bowl_type == optimal_bowl else max(0.0, 20.0 - abs(10))

    return 20.0


# ── Rule-based scoring ───────────────────────────────────────────────────────

def score_rules(decision_type: str, fan_payload: Any, bowler_type: str, batsman_hand: str,
                over_no: int, wickets: int) -> float:
    score = 10.0  # base
    bonus = 0.0

    if decision_type == "field_placement":
        fan_field = {item["name"]: item.get("active", True) for item in fan_payload} if isinstance(fan_payload, list) else (fan_payload or {})

        # Rule: slip fielder for pace bowlers in powerplay
        if "pace" in bowler_type and over_no <= 5:
            if fan_field.get("slip"):
                bonus += 4
            else:
                bonus -= 2

        # Rule: deep midwicket for aggressive LHBs
        if batsman_hand == "LHB":
            if fan_field.get("deep_midwicket"):
                bonus += 3

        # Rule: remove slip in death overs (waste of a fielder)
        if over_no >= 16:
            if not fan_field.get("slip"):
                bonus += 3
            else:
                bonus -= 3

        # Rule: fine leg for pace bowlers (protect the pull)
        if "pace" in bowler_type:
            if fan_field.get("fine_leg"):
                bonus += 2

    elif decision_type == "bowling_change":
        bowler_type_choice = fan_payload.get("bowler_type", "") if isinstance(fan_payload, dict) else ""
        # Rule: bring spin in overs 7-14
        if 7 <= over_no <= 14 and "spin" in bowler_type_choice:
            bonus += 5
        # Rule: pace in death overs
        if over_no >= 16 and "pace" in bowler_type_choice:
            bonus += 5
        # Rule: variety — don't bowl same type consecutively if wickets = 0
        if wickets == 0 and bowler_type_choice == bowler_type:
            bonus -= 3

    return min(20.0, max(0.0, score + bonus))


# ── Combined scorer ──────────────────────────────────────────────────────────

def compute_score(
    decision_type: str,
    fan_payload: Any,
    captain_field: dict | None,
    captain_bowl: str | None,
    captain_bat: str | None,
    captain_pp: bool | None,
    innings: int,
    over_no: int,
    wickets: int,
    score: int,
    bowler_type: str,
    batsman_hand: str,
) -> dict:
    captain_score = score_captain_match(decision_type, fan_payload, captain_field, captain_bowl, captain_bat, captain_pp)
    hist_score = score_historical(decision_type, fan_payload, innings, over_no, wickets, score, bowler_type, batsman_hand)
    rule_score = score_rules(decision_type, fan_payload, bowler_type, batsman_hand, over_no, wickets)
    total = round(captain_score + hist_score + rule_score, 1)

    return {
        "captain_match_score": captain_score,
        "historical_score": hist_score,
        "rule_score": rule_score,
        "total_score": min(100.0, total),
    }
