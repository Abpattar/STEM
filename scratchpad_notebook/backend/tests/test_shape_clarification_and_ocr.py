import pytest
from src.orchestrator.universal_interpreter import UniversalMathInterpreter
from src.orchestrator.universal_solver import UniversalSolver
from src.orchestrator import Orchestrator

@pytest.fixture
def interpreter():
    return UniversalMathInterpreter()

@pytest.fixture
def solver():
    return UniversalSolver()

def test_triangle_shortest_length(interpreter, solver):
    text = "Triangle with sides 3, 4, 5, find shortest length"
    interp = interpreter.interpret(text)
    assert not interp.get("is_ambiguous")
    assert interp.get("domain") == "mensuration"
    assert "shortest_length" in interp.get("unknowns", [])

    res = solver.solve(interp)
    assert len(res["steps"]) >= 2
    assert "Shortest length" in res["final_answer"]
    assert "3" in res["final_answer"]

def test_triangle_area_heron(interpreter, solver):
    text = "Triangle with sides 3, 4, 5, find Area"
    interp = interpreter.interpret(text)
    assert not interp.get("is_ambiguous")
    assert interp.get("domain") == "mensuration"

    res = solver.solve(interp)
    assert len(res["steps"]) >= 2
    # Area of 3-4-5 triangle is 6
    assert "6" in res["final_answer"]

def test_right_triangle_area(interpreter, solver):
    text = "Right triangle with legs 3 and 4, find Area"
    interp = interpreter.interpret(text)
    assert not interp.get("is_ambiguous")
    assert interp.get("domain") == "mensuration"

    res = solver.solve(interp)
    assert len(res["steps"]) >= 1
    # 0.5 * 3 * 4 = 6
    assert "6" in res["final_answer"]

def test_square_mensuration(interpreter, solver):
    # Area
    interp_area = interpreter.interpret("Square with side 6, find Area")
    res_area = solver.solve(interp_area)
    assert "36" in res_area["final_answer"]

    # Diagonal
    interp_diag = interpreter.interpret("Square with side 6, find diagonal")
    res_diag = solver.solve(interp_diag)
    assert "8.49" in res_diag["final_answer"]

def test_rectangle_diagonal(interpreter, solver):
    interp = interpreter.interpret("Rectangle with length 8 and width 6, find diagonal")
    res = solver.solve(interp)
    assert "10" in res["final_answer"]

def test_circle_circumference(interpreter, solver):
    interp = interpreter.interpret("Circle with radius 7, find circumference")
    res = solver.solve(interp)
    assert "43.98" in res["final_answer"] or "44" in res["final_answer"]

def test_pedagogical_clarification_right_triangle(interpreter):
    # No target given
    text = "Right triangle with legs 3 and 4"
    interp = interpreter.interpret(text)
    assert interp.get("is_ambiguous") is True
    assert "I see a right triangle with legs 3 and 4" in interp.get("clarification_question", "")
    assert len(interp.get("clarification_options", [])) == 3
    assert any("hypotenuse" in opt.lower() for opt in interp["clarification_options"])
    assert any("area" in opt.lower() for opt in interp["clarification_options"])

def test_pedagogical_clarification_triangle_sides(interpreter):
    text = "Triangle with sides 3, 4, 5"
    interp = interpreter.interpret(text)
    assert interp.get("is_ambiguous") is True
    assert "I see a triangle with sides 3, 4, and 5" in interp.get("clarification_question", "")
    assert len(interp.get("clarification_options", [])) >= 3
    assert any("area" in opt.lower() for opt in interp["clarification_options"])
    assert any("shortest" in opt.lower() for opt in interp["clarification_options"])

def test_pedagogical_clarification_rectangle(interpreter):
    text = "Rectangle with length 8 and width 5"
    interp = interpreter.interpret(text)
    assert interp.get("is_ambiguous") is True
    assert "I see a rectangle with length 8 and width 5" in interp.get("clarification_question", "")
    assert len(interp.get("clarification_options", [])) == 3

def test_pedagogical_clarification_square(interpreter):
    text = "Square with side 6"
    interp = interpreter.interpret(text)
    assert interp.get("is_ambiguous") is True
    assert "I see a square with side 6" in interp.get("clarification_question", "")
    assert len(interp.get("clarification_options", [])) == 3

@pytest.mark.asyncio
async def test_orchestrator_handles_clarification_gracefully():
    orchestrator = Orchestrator.get_instance()
    umr = await orchestrator.process_problem(
        raw_content="Triangle with sides 3, 4, 5",
        input_type="typed"
    )
    assert umr.understanding.is_ambiguous is True
    assert "I see a triangle with sides 3, 4, and 5" in umr.understanding.clarification_question
    assert len(umr.understanding.clarification_options) >= 3

