import pytest
import re
import asyncio
from src.geometry import solve as geometry_solve
from src.geometry.schemas import GeometryProblem, MensurationProblem, CoordinateGeometryProblem, StatisticsProblem, ProbabilityProblem

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
    violations = []
    for pattern in FORBIDDEN_PATTERNS:
        matches = re.findall(pattern, text)
        if matches:
            violations.append(f"Pattern '{pattern}' found: {matches}")
    return violations


def test_geometry_output_no_raw_syntax():
    """Test that geometry solver output contains no raw syntax."""
    # Test Pythagoras
    problem = GeometryProblem(
        shapes=[{
            "type": "right_triangle",
            "id": "triangle1",
            "vertices": [
                {"label": "A", "x": 50, "y": 250},
                {"label": "B", "x": 200, "y": 250},
                {"label": "C", "x": 50, "y": 100}
            ],
            "measurements": [
                {"label": "AB", "value": 3, "unit": "cm", "measurement_type": "length"},
                {"label": "AC", "value": 4, "unit": "cm", "measurement_type": "length"}
            ],
            "relationships": [{"type": "right_angle", "elements": ["angle C"]}],
            "requested_quantity": {"type": "length", "target": "BC"},
            "topic": "pythagoras"
        }],
        requested_quantity={"type": "length", "target": "BC"},
        topic="pythagoras"
    )
    
    from src.geometry import solve
    steps = solve(problem, grade=8)
    
    for step in steps:
        # display_math contains raw LaTeX rendered by KaTeX on frontend - not checked for raw syntax
        # Only check explanation which is shown as plain text
        violations = scan_for_raw_syntax(step.explanation)
        assert not violations, f"Raw syntax found in explanation: {violations}"
    
    # Test mensuration
    from src.geometry.schemas import MensurationProblem
    from src.geometry.engine import MensurationEngine
    
    problem = MensurationProblem(
        shape_type="rectangle",
        measurements=[
            {"label": "length", "value": 8, "unit": "cm", "measurement_type": "length"},
            {"label": "width", "value": 5, "unit": "cm", "measurement_type": "length"}
        ],
        requested_quantity={"type": "area", "target": "area"},
        topic="mensuration_2d"
    )
    
    engine = MensurationEngine(grade=5)
    steps = engine.solve(problem)
    
    for step in steps:
        violations = scan_for_raw_syntax(step.explanation)
        assert not violations, f"Raw syntax found in explanation: {violations}"


def test_statistics_output_no_raw_syntax():
    """Test that statistics solver output contains no raw syntax."""
    from src.geometry.schemas import StatisticsProblem
    from src.geometry.engine import StatisticsEngine
    
    problem = StatisticsProblem(
        data=[5, 8, 12, 15, 20],
        requested_quantity="mean",
        topic="statistics"
    )
    
    engine = StatisticsEngine(grade=6)
    steps = engine.solve(problem)
    
    for step in steps:
        violations = scan_for_raw_syntax(step.explanation)
        assert not violations, f"Raw syntax found in explanation: {violations}"


def test_probability_output_no_raw_syntax():
    """Test that probability solver output contains no raw syntax."""
    from src.geometry.schemas import ProbabilityProblem
    from src.geometry.engine import ProbabilityEngine
    
    problem = ProbabilityProblem(
        experiment="rolling a fair six-sided die",
        outcomes=["1", "2", "3", "4", "5", "6"],
        favorable_outcomes=["4", "5", "6"],
        requested_quantity="probability",
        topic="probability"
    )
    
    engine = ProbabilityEngine(grade=7)
    steps = engine.solve(problem)
    
    for step in steps:
        violations = scan_for_raw_syntax(step.explanation)
        assert not violations, f"Raw syntax found in explanation: {violations}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])