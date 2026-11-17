from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from ..solver.schemas import SolutionStep, StructuredProblem, Validation


class ExplanationRequest(BaseModel):
    problem: StructuredProblem
    step: SolutionStep
    grade: int
    previous_steps: List[SolutionStep] = []


class ExplanationResponse(BaseModel):
    explanation: str
    hint: str
    alternative_explanation: Optional[str] = None


class HintRequest(BaseModel):
    problem: StructuredProblem
    current_step_number: int
    student_attempt_ast: Optional[dict] = None
    grade: int


class HintResponse(BaseModel):
    hint: str
    hint_level: int


class TeachingProviderConfig(BaseModel):
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: Optional[str] = None
    max_tokens: int = 500
    temperature: float = 0.3