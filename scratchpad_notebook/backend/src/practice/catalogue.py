from typing import Optional, List
from typing import List, Callable
import sympy as sp
from .schemas import MisconceptionEntry, MisconceptionId, AttemptClassification, AttemptResult


MISCONCEPTION_CATALOGUE: List[MisconceptionEntry] = [
    MisconceptionEntry(
        id=MisconceptionId.MC_001,
        name="square_of_sum_error",
        detector_expr="(a+b)**2 - (a**2 + b**2)",
        explanation="You expanded (a+b)² as a²+b², but you missed the middle term 2ab.",
        hint="Remember: (a+b)² = a² + 2ab + b². Don't forget the middle term!",
        grade_range=[7, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_002,
        name="sign_error_moving_term",
        detector_expr="a - b + b != a",  # Moving term across = without flipping sign
        explanation="When you move a term across the equals sign, you must change its sign.",
        hint="Moving a term to the other side means doing the opposite operation. Addition becomes subtraction, subtraction becomes addition.",
        grade_range=[6, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_003,
        name="one_sided_operation",
        detector_expr="a + 5 = 10 -> a = 5",  # Only operating on one side
        explanation="You applied an operation to only one side of the equation. Whatever you do to one side, you must do to the other.",
        hint="Whatever operation you do to one side, you must do to the other to keep the equation balanced.",
        grade_range=[6, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_004,
        name="cancel_terms_not_factors",
        detector_expr="(a + b) / a != b",  # Cancelling terms instead of factors
        explanation="You can only cancel factors (things multiplied), not terms (things added or subtracted).",
        hint="You can only cancel common factors. In (a+b)/a, 'a' is not a factor of the numerator.",
        grade_range=[7, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_005,
        name="divide_by_variable_may_be_zero",
        detector_expr="x**2 = x**3 -> x = x**2",  # Dividing by x without checking x != 0
        explanation="You divided by a variable that could be zero. This can lose solutions or create invalid steps.",
        hint="Never divide by a variable without stating it's non-zero. Factor instead: x(x-1)=0 gives x=0 or x=1.",
        grade_range=[8, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_006,
        name="wrong_order_of_operations",
        detector_expr="2 + 3 * 4 != 20",  # Doing 2+3 first instead of 3*4
        explanation="You performed operations in the wrong order. Multiplication and division come before addition and subtraction.",
        hint="Follow PEMDAS/BODMAS: Parentheses, Exponents, Multiplication/Division (left to right), Addition/Subtraction (left to right).",
        grade_range=[5, 8]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_007,
        name="unit_error",
        detector_expr="5 m + 3 cm != 8",  # Missing unit conversion
        explanation="You combined quantities with different units without converting them first.",
        hint="Always convert all quantities to the same unit before adding or subtracting.",
        grade_range=[4, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_008,
        name="extraneous_root_not_checked",
        detector_expr="sqrt(x) = x - 2 -> x = 4, x = 1",  # x=1 is extraneous
        explanation="When you square both sides of an equation, you can introduce extraneous solutions. Always check your answers in the original equation.",
        hint="After squaring both sides, always substitute your solutions back into the original equation to check for extraneous roots.",
        grade_range=[9, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_009,
        name="wrong_identity_use",
        detector_expr="a**2 - b**2 == (a - b)**2",  # Confusing difference of squares with square of difference
        explanation="You confused the difference of squares identity a²-b²=(a+b)(a-b) with the square of a difference (a-b)²=a²-2ab+b².",
        hint="a² - b² = (a+b)(a-b), but (a-b)² = a² - 2ab + b². These are different!",
        grade_range=[8, 10]
    ),
    MisconceptionEntry(
        id=MisconceptionId.MC_010,
        name="arithmetic_slip",
        detector_expr="7 + 8 = 14",  # Simple arithmetic error
        explanation="You made a small arithmetic error. Double-check your calculations.",
        hint="Take your time with arithmetic. A small slip can change the whole answer.",
        grade_range=[4, 10]
    ),
]


def check_misconception(entry: MisconceptionEntry, student_expr, expected_expr) -> bool:
    """Check if a student's expression matches a misconception pattern."""
    try:
        student = sp.sympify(str(student_expr))
        expected = sp.sympify(str(expected_expr))
        detector = sp.sympify(entry.detector_expr)
        
        # Check if the misconception pattern matches the student's work
        # We compare the difference between student and expected work
        diff = sp.simplify(student - expected)
        
        # Check if the detector pattern is present in the student's work
        # This is a simplified check - in practice we'd need more sophisticated pattern matching
        return sp.simplify(detector - diff) == 0
    except Exception:
        return False


def detect_misconception(student_expr, expected_expr, grade: int) -> Optional[MisconceptionEntry]:
    """Check all misconceptions and return the first match."""
    for entry in MISCONCEPTION_CATALOGUE:
        if grade in range(entry.grade_range[0], entry.grade_range[1] + 1):
            if check_misconception(entry, student_expr, expected_expr):
                return entry
    return None


def classify_attempt(student_ast, expected_ast, grade: int) -> AttemptResult:
    """Classify a student's attempt against the expected step."""
    try:
        student = sp.sympify(str(student_ast))
        expected = sp.sympify(str(expected_ast))
        
        if sp.simplify(student - expected) == 0:
            # Check if it matches the expected step exactly
            # For now, assume it matches expected path
            return AttemptResult(
                classification=AttemptClassification.CORRECT_EXPECTED,
                misconception_id=None,
                divergence_step=None,
                feedback="Correct! That matches the expected step.",
                hint_level=1,
                hint_text="Try checking your algebra.",
                show_step_allowed=True
            )
        else:
            # Check for misconceptions
            mc = detect_misconception(student, expected, grade)
            if mc:
                return AttemptResult(
                    classification=AttemptClassification.NOT_EQUIVALENT,
                    misconception_id=mc.id,
                    divergence_step=None,
                    feedback=mc.explanation,
                    hint_level=2,
                    hint_text=mc.hint,
                    show_step_allowed=True
                )
            else:
                return AttemptResult(
                    classification=AttemptClassification.NOT_EQUIVALENT,
                    misconception_id=None,
                    divergence_step=None,
                    feedback="That step isn't equivalent. Check your algebra.",
                    hint_level=1,
                    hint_text="Try checking your algebra.",
                    show_step_allowed=True
                )
    except Exception:
        return AttemptResult(
            classification=AttemptClassification.UNREADABLE,
            misconception_id=None,
            divergence_step=None,
            feedback="Could not read your attempt. Please try again.",
            hint_level=1,
            hint_text="Make sure your input is clear.",
            show_step_allowed=True
        )


def generate_hint_ladder(step: int, max_hints: int = 4) -> List[str]:
    """Generate progressive hints for a step without revealing the answer."""
    hints = [
        "Look at the operation you applied to the left side — did you do the same to the right?",
        "When you move a term across the equals sign, what happens to its sign?",
        "When you move a term across the equals sign, you must change its sign.",
        f"Step {step}: We subtract 3 from both sides to keep the equation balanced."
    ]
    return hints[:max_hints]