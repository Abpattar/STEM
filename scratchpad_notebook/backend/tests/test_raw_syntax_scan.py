import sys
import asyncio
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.solver import solve, enrich_steps
from src.solver.schemas import StructuredProblem
from src.teaching import TeachingProviderConfig


FORBIDDEN_PATTERNS = [
    r'\^',           # caret powers
    r'\\frac',       # raw LaTeX fraction
    r'sqrt\(',       # raw sqrt function
    r'\\sqrt',       # raw LaTeX sqrt
    r'\\int',        # raw LaTeX integral
    r'\\sum',        # raw LaTeX summation
    r'_\{',          # raw subscript
]


def scan_for_raw_syntax(text: str) -> list[str]:
    """Scan text for forbidden raw syntax patterns."""
    import re
    violations = []
    for pattern in FORBIDDEN_PATTERNS:
        matches = re.findall(pattern, text)
        if matches:
            violations.append(f"Pattern '{pattern}' found: {matches}")
    return violations


def test_solver_output_no_raw_syntax():
    """Test that solver output contains no raw syntax."""
    # Test linear equation
    problem = StructuredProblem(
        problem_type="equation",
        expressions=[{
            "ast_json": {
                "type": "eq",
                "left": {"type": "add", "args": [{"type": "symbol", "name": "x"}, {"type": "number", "value": 3}]},
                "right": {"type": "number", "value": 7}
            },
            "latex": "x + 3 = 7"
        }],
        unknowns=["x"],
        given_values={},
        constraints=[],
        requested_operation="solve",
        topic="linear_equations",
        units={},
        grade_hint=7,
        source="typed"
    )
    
    from src.solver import solve
    raw_steps = solve(problem, grade=7)
    
    # Enrich steps with display_math
    from src.teaching import TeachingProviderConfig
    teaching_config = TeachingProviderConfig()
    import asyncio
    steps = asyncio.run(enrich_steps(problem, raw_steps, 7, teaching_config))
    
    # Check each step's explanation for raw syntax (display_math contains raw LaTeX rendered by KaTeX)
    for step in steps:
        # display_math contains raw LaTeX rendered by KaTeX on frontend - not checked for raw syntax
        # Only check explanation which is shown as plain text
        violations = scan_for_raw_syntax(step.explanation)
        assert not violations, f"Raw syntax found in explanation: {violations}"
    
    # Test quadratic equation
    problem = StructuredProblem(
        problem_type="equation",
        expressions=[{
            "ast_json": {
                "type": "eq",
                "left": {
                    "type": "add",
                    "args": [
                        {"type": "pow", "base": {"type": "symbol", "name": "x"}, "exp": {"type": "number", "value": 2}},
                        {"type": "mul", "args": [{"type": "number", "value": 5}, {"type": "symbol", "name": "x"}]},
                        {"type": "number", "value": 6}
                    ]
                },
                "right": {"type": "number", "value": 0}
            },
            "latex": "x^2 + 5x + 6 = 0"
        }],
        unknowns=["x"],
        given_values={},
        constraints=[],
        requested_operation="solve",
        topic="quadratic_equations",
        units={},
        grade_hint=9,
        source="typed"
    )
    
    raw_steps = solve(problem, grade=9)
    steps = asyncio.run(enrich_steps(problem, raw_steps, 9, teaching_config))
    
    for step in steps:
        # display_math contains raw LaTeX rendered by KaTeX on frontend - not checked for raw syntax
        violations = scan_for_raw_syntax(step.explanation)
        assert not violations, f"Raw syntax found in explanation: {violations}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])