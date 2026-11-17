from pydantic import BaseModel, Field
from typing import Any, Literal, Optional
from enum import Enum


class SupportLevel(str, Enum):
    FULL = "full"
    LIMITED = "limited"
    UNSUPPORTED = "unsupported"


class OperationType(str, Enum):
    SUBSTITUTE = "substitute"
    SUBTRACT_BOTH_SIDES = "subtract_both_sides"
    ADD_BOTH_SIDES = "add_both_sides"
    MULTIPLY_BOTH_SIDES = "multiply_both_sides"
    DIVIDE_BOTH_SIDES = "divide_both_sides"
    EXPAND = "expand"
    FACTORISE = "factorise"
    SIMPLIFY = "simplify"
    COLLECT_LIKE_TERMS = "collect_like_terms"
    ISOLATE_VARIABLE = "isolate_variable"
    QUADRATIC_FORMULA = "quadratic_formula"
    COMPLETING_SQUARE = "completing_square"
    CROSS_MULTIPLY = "cross_multiply"
    FIND_COMMON_DENOMINATOR = "find_common_denominator"
    CONVERT_DECIMAL = "convert_decimal"
    CONVERT_PERCENTAGE = "convert_percentage"
    UNIT_CONVERSION = "unit_conversion"
    APPLY_IDENTITY = "apply_identity"
    ISOLATE_RADICAL = "isolate_radical"
    SQUARE_BOTH_SIDES = "square_both_sides"
    CHECK_EXTRANEOUS_ROOTS = "check_extraneous_roots"
    APPLY_FORMULA = "apply_formula"
    CHECK_PYTHAGORAS = "check_pythagoras"
    CHECK_ANGLE_SUM = "check_angle_sum"
    CONVERT_UNITS = "convert_units"
    COMPUTE_STATISTICS = "compute_statistics"
    COMPUTE_PROBABILITY = "compute_probability"
    VERIFY_BY_ALTERNATE_METHOD = "verify_by_alternate_method"


class ValidationMethod(str, Enum):
    SUBSTITUTION = "substitution"
    EQUIVALENCE_CHECK = "equivalence_check"
    SYMPY_VERIFY = "sympy_verify"
    MANUAL = "manual"


class Validation(BaseModel):
    is_valid: bool
    method: ValidationMethod
    details: str = ""


class RawSolutionStep(BaseModel):
    step_number: int
    operation: OperationType
    equation_ast: dict
    result_ast: dict
    validation: Validation
    from_step: int = 0


class StructuredProblem(BaseModel):
    problem_type: Literal["equation", "system", "expression", "word_problem", "inequality"]
    expressions: list[dict]
    unknowns: list[str]
    given_values: dict[str, dict]
    constraints: list[str]
    requested_operation: Literal["solve", "simplify", "evaluate", "factor", "expand", "substitute"]
    topic: str
    units: dict[str, str] = {}
    grade_hint: Optional[int] = None
    source: Literal["handwriting", "typed", "mixed"] = "typed"


class SolutionStep(BaseModel):
    step_number: int
    operation: str
    equation_ast: dict
    display_math: str
    explanation: str
    validation: Validation
    hint: str
    is_final_answer: bool = False
    final_answer_text: str = ""
    diagram_focus: list[str] = []
    diagram_type: Literal["triangle", "rectangle", "circle", "parallel_lines", "coordinate_plane", "bar_chart", "data_table", "none"] = "none"


class TopicSupport(BaseModel):
    topic: str
    level: Literal["full", "limited", "unsupported"]
    supported_operations: list[str]
    grade_range: list[int]
    test_status: Literal["passed", "pending", "failed"] = "pending"
    limitations: list[str] = []


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