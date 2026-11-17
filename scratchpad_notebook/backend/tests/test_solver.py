import sys
from pathlib import Path
import pytest

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.solver import solve, verify_step, OperationType
from src.solver.schemas import StructuredProblem, Validation


def create_linear_problem():
    """Create a simple linear equation problem: x + 3 = 7"""
    return StructuredProblem(
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


def create_quadratic_problem():
    """Create a quadratic equation: x^2 + 5x + 6 = 0"""
    return StructuredProblem(
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


def test_solve_linear_equation():
    problem = create_linear_problem()
    steps = solve(problem, grade=7)
    
    assert len(steps) > 0
    assert steps[0].operation in ["subtract_both_sides", "isolate_variable"]
    assert steps[-1].validation.is_valid
    assert steps[-1].result_ast.get("type") == "eq"


def test_solve_quadratic_equation():
    problem = create_quadratic_problem()
    steps = solve(problem, grade=9)
    
    assert len(steps) > 0
    assert any(s.operation in ["factorise", "quadratic_formula", "completing_square"] for s in steps)
    assert steps[-1].validation.is_valid


def test_verify_equivalence():
    from src.solver import verify_step, OperationType
    
    before = {
        "type": "eq",
        "left": {"type": "add", "args": [{"type": "symbol", "name": "x"}, {"type": "number", "value": 3}]},
        "right": {"type": "number", "value": 7}
    }
    after = {
        "type": "eq",
        "left": {"type": "symbol", "name": "x"},
        "right": {"type": "number", "value": 4}
    }
    
    validation = verify_step(before, after, OperationType.SUBTRACT_BOTH_SIDES)
    assert validation.is_valid
    assert validation.method == "equivalence_check"


def test_verify_false_equivalence():
    from src.solver import verify_step, OperationType
    
    before = {
        "type": "eq",
        "left": {"type": "symbol", "name": "x"},
        "right": {"type": "number", "value": 4}
    }
    after = {
        "type": "eq",
        "left": {"type": "symbol", "name": "x"},
        "right": {"type": "number", "value": 5}
    }
    
    validation = verify_step(before, after, OperationType.ISOLATE_VARIABLE)
    assert not validation.is_valid


def test_solver_engine_direct():
    from src.solver.engine import SolverEngine
    
    engine = SolverEngine(grade=7)
    problem = create_linear_problem()
    steps = engine.solve(problem)
    
    assert len(steps) > 0
    assert steps[-1].validation.is_valid


@pytest.mark.asyncio
async def test_target_variable_quadratic():
    from src.api.routes import recognize_typed, RecognizeTypedRequest, interpret_problem, InterpretRequest, solve_problem, SolveRequest
    rec = await recognize_typed(RecognizeTypedRequest(text="x^2 + y = 30; x = ?"))
    interp = await interpret_problem(InterpretRequest(candidates=rec.candidates, instruction=rec.instruction))
    assert interp.unknowns[0] == "x"
    sol = await solve_problem(SolveRequest(problem=interp, grade=7))
    assert len(sol.steps) >= 2
    assert "30 - y" in sol.steps[-1].final_answer_text


@pytest.mark.asyncio
async def test_nonlinear_system_solve():
    from src.api.routes import recognize_typed, RecognizeTypedRequest, interpret_problem, InterpretRequest, solve_problem, SolveRequest
    rec = await recognize_typed(RecognizeTypedRequest(text="x^2 + y = 30; y = 5"))
    interp = await interpret_problem(InterpretRequest(candidates=rec.candidates))
    assert interp.problem_type == "system"
    sol = await solve_problem(SolveRequest(problem=interp, grade=7))
    assert len(sol.steps) >= 3
    final_text = sol.steps[-1].final_answer_text
    assert "5" in final_text and "-5" in final_text


@pytest.mark.asyncio
async def test_linear_system_solve():
    from src.api.routes import recognize_typed, RecognizeTypedRequest, interpret_problem, InterpretRequest, solve_problem, SolveRequest
    rec = await recognize_typed(RecognizeTypedRequest(text="x + y = 30; x - y = 10"))
    interp = await interpret_problem(InterpretRequest(candidates=rec.candidates))
    assert interp.problem_type == "system"
    sol = await solve_problem(SolveRequest(problem=interp, grade=7))
    assert len(sol.steps) >= 3
    final_text = sol.steps[-1].final_answer_text
    assert "20" in final_text and "10" in final_text


@pytest.mark.asyncio
async def test_radical_equation_solve():
    from src.api.routes import recognize_typed, RecognizeTypedRequest, interpret_problem, InterpretRequest, solve_problem, SolveRequest
    rec = await recognize_typed(RecognizeTypedRequest(text="sqrt(x + 4) = 3"))
    interp = await interpret_problem(InterpretRequest(candidates=rec.candidates))
    sol = await solve_problem(SolveRequest(problem=interp, grade=7))
    assert len(sol.steps) >= 2
    assert "5" in sol.steps[-1].final_answer_text


if __name__ == "__main__":
    pytest.main([__file__, "-v"])