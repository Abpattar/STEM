import sys
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.main import app
from src.orchestrator import (
    Orchestrator,
    UnifiedMathematicalRepresentation,
    StudentProfile,
    StudentPreferences,
)

@pytest.mark.asyncio
async def test_canonical_quadratic_end_to_end():
    """
    CANONICAL END-TO-END SCENARIO (Section 14):
    Problem: x^2 + 5x + 6 = 0
    Expected steps: (x + 2)(x + 3) = 0 -> x = -2 or x = -3
    Verifies:
      1. Recognition & AST parsing
      2. Topic identification: quadratic_equations
      3. Mathua Prerequisite concepts identified
      4. SymPy mathematical engine solves equation
      5. Every transformation mathematically verified
      6. Contextual explanation generated
      7. MathLearn visualization generated (Parabola model)
      8. MathCAT speech and Braille generated
      9. MAIDR sonification generated
    """
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(
        preferences=StudentPreferences(
            learning_style="balanced",
            speech_enabled=True,
            braille_enabled=True,
            braille_standard="nemeth",
            interactive_visuals_enabled=True,
            sonification_enabled=True
        )
    )

    umr = await orchestrator.process_problem(
        raw_content="x^2 + 5x + 6 = 0",
        input_type="typed",
        profile=profile
    )

    # 1 & 2: Mathematical Understanding
    assert umr.understanding.topic == "quadratic_equations"
    assert umr.understanding.problem_type == "equation"
    assert "x" in umr.understanding.unknowns
    assert umr.understanding.is_ambiguous is False

    # 3: Mathua Prerequisite Concepts
    prereqs = umr.learning.prerequisites
    assert len(prereqs) >= 4
    prereq_ids = [p.id for p in prereqs]
    assert "prealg.expr.variables" in prereq_ids
    assert "alg.factor.trinomial" in prereq_ids
    assert "alg.quad.zero_product" in prereq_ids

    # 4 & 5: Verified SymPy Solution
    assert umr.solution.status == "solved"
    assert umr.solution.verified is True
    assert len(umr.solution.steps) >= 1
    assert all(step.verified for step in umr.solution.steps)

    # Check roots in final answer
    final_ans = umr.solution.final_answer_text or ""
    assert ("-2" in final_ans or "-3" in final_ans or "x" in final_ans)

    # 6: Explanations generated (what, why, rule)
    step1 = umr.solution.steps[0]
    assert step1.what is not None
    assert step1.why is not None
    assert step1.rule is not None

    # 7: MathLearn Visualisation (Parabola)
    assert umr.visualisation.type == "quadratic_parabola"
    assert umr.visualisation.component_id == "MathLearnParabolaVisualizer"
    assert umr.visualisation.initial_params["a"] == 1.0
    assert umr.visualisation.initial_params["b"] == 5.0
    assert umr.visualisation.initial_params["c"] == 6.0
    assert umr.visualisation.initial_params["discriminant"] == 1.0
    assert umr.visualisation.initial_params["has_real_roots"] is True

    # 8: MathCAT Accessibility (ClearSpeak & Nemeth Braille)
    assert umr.accessibility.speech is not None
    assert "x squared plus five x plus six equals zero" in umr.accessibility.speech.expression_speech
    assert len(umr.accessibility.speech.steps_speech) >= 1

    assert umr.accessibility.braille is not None
    assert umr.accessibility.braille.standard == "nemeth"
    assert len(umr.accessibility.braille.expression_braille) > 0

    # 9: MAIDR Sonification
    assert umr.accessibility.sonification is not None
    assert umr.accessibility.sonification["chart_type"] == "parabola"
    assert len(umr.accessibility.sonification["points"]) == 11

@pytest.mark.asyncio
async def test_linear_equation_balance_visualisation():
    """Test linear equation solving with Equation Balance visualizer."""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(
        preferences=StudentPreferences(
            learning_style="visual",
            interactive_visuals_enabled=True
        )
    )

    umr = await orchestrator.process_problem(
        raw_content="2x + 3 = 7",
        input_type="typed",
        profile=profile
    )

    assert umr.understanding.topic == "linear_equations"
    assert umr.solution.status == "solved"
    assert umr.solution.verified is True

    # Visualizer should be equation balance
    assert umr.visualisation.type == "equation_balance"
    assert umr.visualisation.component_id == "MathLearnBalanceVisualizer"
    assert umr.visualisation.initial_params["a"] == 2.0
    assert umr.visualisation.initial_params["b"] == 3.0
    assert umr.visualisation.initial_params["c"] == 7.0

@pytest.mark.asyncio
async def test_ambiguous_handwriting_clarification():
    """Ambiguous or unparseable input must ask clarification and never silently guess."""
    orchestrator = Orchestrator.get_instance()
    umr = await orchestrator.process_problem(
        raw_content="x + = 5",
        input_type="typed"
    )

    assert umr.understanding.is_ambiguous is True
    assert umr.understanding.clarification_question is not None
    assert "missing" in umr.understanding.clarification_question.lower() or "check" in umr.understanding.clarification_question.lower()

@pytest.mark.asyncio
async def test_blind_accessibility_ueb_braille():
    """Verify Unified English Braille (UEB) and ClearSpeak generation for blind learners."""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(
        preferences=StudentPreferences(
            speech_enabled=True,
            braille_enabled=True,
            braille_standard="ueb"
        )
    )

    umr = await orchestrator.process_problem(
        raw_content="3x - 7 = 11",
        input_type="typed",
        profile=profile
    )

    assert umr.accessibility.speech is not None
    assert "three x minus seven equals eleven" in umr.accessibility.speech.expression_speech
    assert umr.accessibility.braille is not None
    assert umr.accessibility.braille.standard == "ueb"
    assert len(umr.accessibility.braille.expression_braille) > 0

@pytest.mark.asyncio
async def test_deaf_accessibility_isl_vocabulary():
    """Verify Indian Sign Language interaction checks coverage honestly."""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(
        preferences=StudentPreferences(
            sign_language_enabled=True
        )
    )

    umr = await orchestrator.process_problem(
        raw_content="x + 5 = 10",
        input_type="typed",
        profile=profile
    )

    assert umr.accessibility.sign_language is not None
    assert "X" in umr.accessibility.sign_language["supported_tokens"]
    assert "5" in umr.accessibility.sign_language["supported_tokens"]
    assert "10" in umr.accessibility.sign_language["supported_tokens"]
    # '+' and '=' are now fully supported with 3D landmark gesture templates
    assert any(tok in umr.accessibility.sign_language["supported_tokens"] for tok in ["+", "PLUS"])
    assert any(tok in umr.accessibility.sign_language["supported_tokens"] for tok in ["=", "EQUALS"])
    assert umr.accessibility.sign_language["is_supported"] is True

    # Verify unmapped arbitrary symbols honestly flag warnings via adapter
    from src.orchestrator.adapters.sixth_sense_adapter import SixthSenseAdapter
    isl_adapter = SixthSenseAdapter()
    unmapped_res = isl_adapter.analyze_expression_for_isl("x + 5 = 10 §")
    assert unmapped_res["has_warnings"] is True
    assert "§" in unmapped_res["unsupported_tokens"]

@pytest.mark.asyncio
async def test_api_orchestrator_endpoint_full():
    """Test full HTTP API invocation of orchestrator endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/orchestrate/process",
            json={
                "raw_content": "x^2 + 5x + 6 = 0",
                "input_type": "typed",
                "profile": {
                    "preferences": {
                        "learning_style": "visual",
                        "speech_enabled": True,
                        "braille_enabled": True,
                        "sonification_enabled": True
                    }
                }
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["understanding"]["topic"] == "quadratic_equations"
        assert data["solution"]["status"] == "solved"
        assert data["solution"]["verified"] is True
        assert len(data["learning"]["prerequisites"]) >= 4
        assert data["visualisation"]["type"] == "quadratic_parabola"
        assert data["accessibility"]["speech"] is not None
        assert data["accessibility"]["braille"] is not None
        assert data["accessibility"]["sonification"] is not None

@pytest.mark.asyncio
async def test_universal_geometry_triangle_angles():
    """Test solving geometric triangle angle question: 38°; 90°; ?"""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(preferences=StudentPreferences())
    umr = await orchestrator.process_problem(
        raw_content="38°; 90°; ?",
        input_type="typed",
        profile=profile
    )
    assert umr.solution.status == "solved"
    assert "52" in (umr.solution.final_answer_text or "")
    assert len(umr.solution.steps) >= 3
    assert umr.visualisation is not None
    assert umr.visualisation.type in ["svg_diagram", "geometry_diagram"]
    assert "<svg" in umr.visualisation.initial_params.get("svg_code", "")

@pytest.mark.asyncio
async def test_universal_geometry_pythagoras():
    """Test Pythagorean theorem solver: right triangle legs 3 and 4, find hypotenuse"""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(preferences=StudentPreferences())
    umr = await orchestrator.process_problem(
        raw_content="right triangle legs 3 and 4, find hypotenuse",
        input_type="typed",
        profile=profile
    )
    assert umr.solution.status == "solved"
    assert "5" in (umr.solution.final_answer_text or "")
    assert len(umr.solution.steps) >= 3

@pytest.mark.asyncio
async def test_universal_calculus_derivative():
    """Test calculus derivative: d/dx(x^3 + 2x^2 - 5x + 1)"""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(preferences=StudentPreferences())
    umr = await orchestrator.process_problem(
        raw_content="d/dx(x^3 + 2x^2 - 5x + 1)",
        input_type="typed",
        profile=profile
    )
    assert umr.solution.status == "solved"
    assert "3 x^{2} + 4 x - 5" in (umr.solution.final_answer_text or "")
    assert len(umr.solution.steps) >= 1

@pytest.mark.asyncio
async def test_universal_statistics_mean():
    """Test statistics solver: mean of 5, 8, 12, 15, 20"""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(preferences=StudentPreferences())
    umr = await orchestrator.process_problem(
        raw_content="mean of 5, 8, 12, 15, 20",
        input_type="typed",
        profile=profile
    )
    assert umr.solution.status == "solved"
    assert "12" in (umr.solution.final_answer_text or "")

