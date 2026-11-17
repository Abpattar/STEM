from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

InputType = Literal["handwriting", "typed", "voice", "sign_language"]

class InputPayload(BaseModel):
    type: InputType = "typed"
    raw_content: Optional[str] = None
    strokes: Optional[List[Dict[str, Any]]] = None
    image_b64: Optional[str] = None
    recognized_latex: Optional[str] = None
    confidence: float = 1.0
    instruction: Optional[str] = None
    provider: str = "default"

class UnderstandingPayload(BaseModel):
    topic: str = "unknown"
    problem_type: str = "equation"
    ast: Dict[str, Any] = Field(default_factory=dict)
    unknowns: List[str] = Field(default_factory=list)
    mathml: Optional[str] = None
    is_ambiguous: bool = False
    clarification_question: Optional[str] = None
    clarification_options: List[str] = Field(default_factory=list)

class PrerequisiteConcept(BaseModel):
    id: str
    label: str
    domain: str = "algebra"
    description: Optional[str] = None
    mastered: bool = False

class LearningPayload(BaseModel):
    primary_concept_id: Optional[str] = None
    prerequisites: List[PrerequisiteConcept] = Field(default_factory=list)
    mastery_status: str = "in_progress"
    recommended_sequence: List[str] = Field(default_factory=list)

class SolutionStepPayload(BaseModel):
    step_number: int
    latex: str
    operation: str = "transformation"
    verified: bool = True
    explanation: str = ""
    what: Optional[str] = None
    why: Optional[str] = None
    rule: Optional[str] = None
    hint: Optional[str] = None
    visual_cue: Optional[str] = None
    is_final_answer: bool = False
    step_gestures: Optional[Dict[str, Any]] = None

class SolutionPayload(BaseModel):
    status: Literal["solved", "pending", "unsupported", "error"] = "pending"
    verified: bool = False
    steps: List[SolutionStepPayload] = Field(default_factory=list)
    final_answer_text: Optional[str] = None
    error_message: Optional[str] = None

class VisualisationPayload(BaseModel):
    type: Optional[str] = None  # e.g., "equation_balance", "quadratic_parabola", "algebra_tiles"
    component_id: Optional[str] = None
    initial_params: Dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None

class SpeechPayload(BaseModel):
    expression_speech: str = ""
    steps_speech: List[str] = Field(default_factory=list)
    dialect: str = "clearspeak"

class BraillePayload(BaseModel):
    standard: Literal["nemeth", "ueb"] = "nemeth"
    expression_braille: str = ""
    steps_braille: List[str] = Field(default_factory=list)

class AccessibilityPayload(BaseModel):
    speech: Optional[SpeechPayload] = None
    braille: Optional[BraillePayload] = None
    sonification: Optional[Dict[str, Any]] = None
    sign_language: Optional[Dict[str, Any]] = None

class UnifiedMathematicalRepresentation(BaseModel):
    problem_id: str
    input: InputPayload = Field(default_factory=InputPayload)
    understanding: UnderstandingPayload = Field(default_factory=UnderstandingPayload)
    learning: LearningPayload = Field(default_factory=LearningPayload)
    solution: SolutionPayload = Field(default_factory=SolutionPayload)
    visualisation: VisualisationPayload = Field(default_factory=VisualisationPayload)
    accessibility: AccessibilityPayload = Field(default_factory=AccessibilityPayload)
    metadata: Dict[str, Any] = Field(default_factory=dict)

