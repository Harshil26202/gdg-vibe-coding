from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any
from app.models.decision import DecisionType


class FieldPosition(BaseModel):
    name: str
    x: float  # 0-100 percent
    y: float  # 0-100 percent


class DecisionSubmit(BaseModel):
    match_id: int
    innings: int
    over_no: int
    ball_no: int
    decision_type: DecisionType
    payload: Any  # flexible JSON for each decision type


class DecisionOut(BaseModel):
    id: int
    match_id: int
    innings: int
    over_no: int
    ball_no: int
    decision_type: DecisionType
    payload: Any
    captain_match_score: float
    historical_score: float
    rule_score: float
    total_score: float
    ai_explanation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ScoreBreakdown(BaseModel):
    captain_match_score: float
    historical_score: float
    rule_score: float
    total_score: float
    captain_actual_decision: Any
    ai_explanation: str
