from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
from ..solver.schemas import SolutionStep, StructuredProblem


class AttemptClassification(str, Enum):
    CORRECT_EXPECTED = "correct_expected"
    CORRECT_ALTERNATE = "correct_alternate"
    VALID_NO_PROGRESS = "valid_no_progress"
    NOT_EQUIVALENT = "not_equivalent"
    UNREADABLE = "unreadable"


class MisconceptionId(str, Enum):
    MC_001 = "MC-001"
    MC_002 = "MC-002"
    MC_003 = "MC-003"
    MC_004 = "MC-004"
    MC_005 = "MC-005"
    MC_006 = "MC-006"
    MC_007 = "MC-007"
    MC_008 = "MC-008"
    MC_009 = "MC-009"
    MC_010 = "MC-010"


class AttemptResult(BaseModel):
    classification: AttemptClassification
    misconception_id: Optional[MisconceptionId] = None
    divergence_step: Optional[int] = None
    feedback: str
    hint_level: int
    hint_text: str
    show_step_allowed: bool = True
    is_final_answer: bool = False


class MisconceptionEntry(BaseModel):
    id: MisconceptionId
    name: str
    detector_expr: str
    explanation: str
    hint: str
    grade_range: List[int]


class SavedProblem(BaseModel):
    id: str
    problem_data: StructuredProblem
    solution_steps: List
    practice_summary: Dict[str, Any]
    topic: str
    grade: int
    created_at: str


class PracticeSession(BaseModel):
    problem: StructuredProblem
    current_step: int
    grade: int
    attempts: List[Dict[str, Any]]
    hints_used: int
    misconceptions_found: List[str]


class AnalyticsEvent(BaseModel):
    event_type: Literal[
        "recognition_failure",
        "clarification_shown",
        "verification_failed",
        "hint_used",
        "misconception_detected",
        "practice_step_completed",
        "user_reported_issue",
        "latency"
    ]
    topic: str
    grade: int
    latency_ms: int
    hint_level: int
    misconception_id: Optional[str] = None
    timestamp: str