from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any
from app.models.match import MatchStatus


class MatchOut(BaseModel):
    id: int
    title: str
    team_a: str
    team_b: str
    venue: str
    status: MatchStatus
    current_innings: int
    current_over: int
    current_ball: int
    team_a_score: int
    team_a_wickets: int
    team_b_score: int
    team_b_wickets: int
    batting_team: Optional[str] = None
    bowling_team: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BallOut(BaseModel):
    id: int
    innings: int
    over_no: int
    ball_no: int
    bowler: str
    batsman: str
    runs: int
    is_wicket: bool
    wicket_type: Optional[str] = None
    extras: int
    commentary: Optional[str] = None

    model_config = {"from_attributes": True}


class LiveMatchState(BaseModel):
    match: MatchOut
    recent_balls: List[BallOut]
    decision_window_open: bool
    decision_window_type: Optional[str] = None  # field_placement/bowling_change/etc
    decision_window_seconds_left: int
    current_bowlers: List[str]
    available_batsmen: List[str]
    bowler_stats: dict
    batsman_stats: dict
