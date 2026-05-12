"""Unit tests for the 3-component scoring engine."""
import pytest
from app.services.scoring_engine import (
    score_captain_match,
    score_historical,
    score_rules,
    compute_score,
    _field_similarity,
)


# ── field similarity ─────────────────────────────────────────────────────────

def test_field_similarity_identical():
    field = {"slip": True, "gully": True, "cover_point": True}
    assert _field_similarity(field, field) == 1.0


def test_field_similarity_opposite():
    a = {"slip": True, "gully": True}
    b = {"slip": False, "gully": False}
    assert _field_similarity(a, b) == 0.0


def test_field_similarity_partial():
    a = {"slip": True, "gully": False, "mid_off": True, "mid_on": False}
    b = {"slip": True, "gully": True, "mid_off": False, "mid_on": False}
    # 2 out of 4 match
    assert _field_similarity(a, b) == 0.5


def test_field_similarity_empty():
    assert _field_similarity({}, {}) == 0.5


# ── captain match scoring ────────────────────────────────────────────────────

def test_captain_field_exact():
    field = {"slip": True, "gully": True, "cover_point": True}
    score = score_captain_match("field_placement", field, field, None, None, None)
    assert score == 40.0


def test_captain_field_no_match():
    fan = {"slip": True, "gully": True}
    captain = {"slip": False, "gully": False}
    score = score_captain_match("field_placement", fan, captain, None, None, None)
    assert score == 0.0


def test_captain_bowling_exact():
    score = score_captain_match("bowling_change", {"bowler": "Bumrah"}, None, "Bumrah", None, None)
    assert score == 40.0


def test_captain_bowling_wrong():
    score = score_captain_match("bowling_change", {"bowler": "Chahar"}, None, "Bumrah", None, None)
    assert score == 0.0


def test_captain_batting_exact():
    score = score_captain_match("batting_order", {"batsman": "SKY"}, None, None, "SKY", None)
    assert score == 40.0


def test_captain_powerplay_match():
    score = score_captain_match("powerplay", {"use": True}, None, None, None, True)
    assert score == 40.0


def test_captain_powerplay_mismatch():
    score = score_captain_match("powerplay", {"use": True}, None, None, None, False)
    assert score == 0.0


def test_captain_no_captain_data_returns_neutral():
    # When captain made no explicit decision, should return mid neutral score
    score = score_captain_match("bowling_change", {"bowler": "X"}, None, None, None, None)
    assert score == 20.0


# ── rule-based scoring ───────────────────────────────────────────────────────

def test_rule_slip_pace_powerplay():
    """Slip fielder for pace in overs 0-5 should give bonus."""
    payload = {"slip": True, "gully": False, "cover_point": True, "mid_off": True,
               "mid_on": True, "fine_leg": True, "square_leg": True, "third_man": True, "deep_midwicket": False}
    score = score_rules("field_placement", payload, "pace_swing", "RHB", 2, 0)
    assert score > 10  # bonus applied


def test_rule_no_slip_death_overs():
    """Removing slip in death overs (16+) should give bonus."""
    payload = {"slip": False, "gully": False, "cover_point": False, "mid_off": False,
               "mid_on": True, "fine_leg": True, "square_leg": True, "third_man": True, "deep_midwicket": True}
    score = score_rules("field_placement", payload, "pace_fast", "RHB", 18, 3)
    assert score > 10


def test_rule_slip_in_death_penalised():
    """Keeping slip in death overs should be penalised."""
    payload = {"slip": True, "gully": True, "cover_point": True}
    no_slip_score = score_rules("field_placement", {"slip": False}, "pace_fast", "RHB", 18, 3)
    slip_score = score_rules("field_placement", payload, "pace_fast", "RHB", 18, 3)
    assert no_slip_score > slip_score


def test_rule_spin_mid_overs():
    """Selecting spin in overs 7-14 should score higher."""
    spin_score = score_rules("bowling_change", {"bowler_type": "spin_offbreak"}, "pace_swing", "RHB", 9, 2)
    pace_score = score_rules("bowling_change", {"bowler_type": "pace_fast"}, "pace_swing", "RHB", 9, 2)
    assert spin_score > pace_score


def test_rule_pace_death_overs():
    """Pace in death overs (16+) should score higher than spin."""
    pace_score = score_rules("bowling_change", {"bowler_type": "pace_fast"}, "spin_offbreak", "RHB", 17, 4)
    spin_score = score_rules("bowling_change", {"bowler_type": "spin_offbreak"}, "spin_offbreak", "RHB", 17, 4)
    assert pace_score > spin_score


def test_rule_score_bounds():
    """Rule score must always be between 0 and 20."""
    for over in [0, 5, 10, 15, 19]:
        for bowler_type in ["pace_swing", "pace_fast", "spin_offbreak", "spin_leftharm"]:
            score = score_rules("field_placement", {"slip": True}, bowler_type, "RHB", over, 2)
            assert 0 <= score <= 20


# ── combined compute_score ───────────────────────────────────────────────────

def test_compute_score_total_bounded():
    result = compute_score(
        decision_type="field_placement",
        fan_payload={"slip": True, "gully": True, "cover_point": True, "mid_off": True,
                     "mid_on": True, "fine_leg": True, "square_leg": True, "third_man": True, "deep_midwicket": False},
        captain_field={"slip": True, "gully": True, "cover_point": True, "mid_off": True,
                       "mid_on": True, "fine_leg": True, "square_leg": True, "third_man": True, "deep_midwicket": False},
        captain_bowl=None, captain_bat=None, captain_pp=None,
        innings=1, over_no=2, wickets=1, score=24,
        bowler_type="pace_swing", batsman_hand="RHB",
    )
    assert 0 <= result["total_score"] <= 100
    assert result["captain_match_score"] == 40.0
    assert result["rule_score"] >= 0


def test_compute_score_returns_all_keys():
    result = compute_score(
        decision_type="bowling_change",
        fan_payload={"bowler": "Jadeja", "bowler_type": "spin_leftharm"},
        captain_field=None, captain_bowl="Jadeja", captain_bat=None, captain_pp=None,
        innings=1, over_no=8, wickets=2, score=65,
        bowler_type="pace_swing", batsman_hand="LHB",
    )
    for key in ["captain_match_score", "historical_score", "rule_score", "total_score"]:
        assert key in result


def test_compute_score_perfect_bowling_change():
    result = compute_score(
        decision_type="bowling_change",
        fan_payload={"bowler": "Jadeja", "bowler_type": "spin_leftharm"},
        captain_field=None, captain_bowl="Jadeja", captain_bat=None, captain_pp=None,
        innings=1, over_no=8, wickets=2, score=60,
        bowler_type="pace_swing", batsman_hand="RHB",
    )
    assert result["captain_match_score"] == 40.0
    assert result["total_score"] > 50
