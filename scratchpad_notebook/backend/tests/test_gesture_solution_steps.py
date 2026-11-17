import pytest
import json
from pathlib import Path
from src.orchestrator.adapters.sixth_sense_adapter import SixthSenseAdapter, SUPPORTED_TEMPLATE_SIGNS, MATH_OPERATOR_GLOSS
from src.orchestrator.schemas.umr import SolutionStepPayload, UnifiedMathematicalRepresentation, InputPayload, SolutionPayload
from src.orchestrator.schemas.profile import StudentProfile, StudentPreferences
from src.orchestrator.orchestrator import Orchestrator

def test_preset_references_contain_mathematical_operators():
    """Verify that preset-references.json includes 3D landmark presets for all math operators."""
    paths = [
        Path("./Sixth-Sense/data/preset-references.json"),
        Path("./MathAI/frontend/public/models/sixth-sense/preset-references.json"),
        Path("./MathAI/frontend/dist/models/sixth-sense/preset-references.json")
    ]
    required_operators = [
        '+', '-', '*', '/', '=', '^', '(', ')',
        'PLUS', 'MINUS', 'TIMES', 'DIVIDE', 'EQUALS', 'POWER', 'LPAREN', 'RPAREN',
        'SQRT', 'CUBED', 'LESS_THAN', 'GREATER_THAN', 'PLUS_MINUS', 'PI', 'DEGREES', 'PERCENT', 'QUESTION'
    ]
    
    for p in paths:
        if p.exists():
            with open(p, "r") as f:
                data = json.load(f)
            for op in required_operators:
                assert op in data, f"Operator {op} missing from {p}"
                take = data[op][0]
                assert "meta" in take
                assert "frames" in take
                assert len(take["frames"]) >= 15
                # Verify frame contents
                f0 = take["frames"][0]
                assert "pose" in f0
                if take["meta"]["right"]:
                    assert f0["right"] is not None
                    assert len(f0["right"]) == 63
                if take["meta"]["left"]:
                    assert f0["left"] is not None
                    assert len(f0["left"]) == 63

def test_operator_tokens_have_3d_templates():
    """Verify that +, -, *, /, =, ^, (, ) have has_3d_template=True and zero unsupported warnings."""
    adapter = SixthSenseAdapter()
    test_expressions = [
        "2 + 3 = 5",
        "4 * x - 8 = 0",
        "x / 2 + 3 = 10",
        "x^2 - 4 = 0",
        "(x + 1) * 2 = 6",
        "x^2 + 5 = 10",
        "38°; 90°; ?",
        "x <= 15"
    ]

    for expr in test_expressions:
        analysis = adapter.analyze_expression_for_isl(expr)
        assert len(analysis["unsupported_tokens"]) == 0, f"Unsupported tokens found in '{expr}': {analysis['unsupported_tokens']}"
        assert analysis["has_warnings"] is False, f"Unexpected warnings for '{expr}'"
        for item in analysis["sign_sequence"]:
            assert item["has_3d_template"] is True, f"Token {item['display']} ({item['sign']}) in '{expr}' marked has_3d_template=False"

@pytest.mark.asyncio
async def test_multi_layer_solution_step_gestures():
    """Verify multi-layer solution step gestures generated across layers."""
    adapter = SixthSenseAdapter()
    steps = [
        SolutionStepPayload(
            step_number=1,
            latex="2x + 5 = 15",
            operation="subtract_constant",
            explanation="Subtract 5 from both sides of the equation."
        ),
        SolutionStepPayload(
            step_number=2,
            latex="2x = 10",
            operation="divide_coefficient",
            explanation="Divide both sides by 2."
        ),
        SolutionStepPayload(
            step_number=3,
            latex="x = 5",
            operation="simplify",
            explanation="Solution is complete."
        )
    ]

    gestures = await adapter.generate_solution_step_gestures(steps)
    assert len(gestures) == 3

    # Step 1: subtraction
    g1 = gestures[0]
    assert g1["step_number"] == 1
    assert "layers" in g1
    layers1 = g1["layers"]
    assert "layer_1_state" in layers1
    assert "layer_2_action" in layers1
    assert "layer_3_pedagogy" in layers1

    assert layers1["layer_2_action"]["action_sign"] == "MINUS"
    assert any(k in layers1["layer_2_action"]["spatial_direction"].lower() for k in ["subtract", "minus", "remov", "cutting", "outward", "slide"])
    assert len(layers1["layer_1_state"]["tokens"]) > 0

    # Step 2: division
    g2 = gestures[1]
    assert g2["step_number"] == 2
    assert g2["layers"]["layer_2_action"]["action_sign"] == "DIVIDE"
    assert any(k in g2["layers"]["layer_2_action"]["spatial_direction"].lower() for k in ["divide", "slice", "bar", "split", "downward"])

    # Step 3: simplify
    g3 = gestures[2]
    assert g3["step_number"] == 3
    assert g3["layers"]["layer_2_action"]["action_sign"] == "SIMPLIFY"

@pytest.mark.asyncio
async def test_full_orchestrator_pipeline_step_gestures():
    """Verify that full orchestrator pipeline enriches solution steps with 3D gesture sequences."""
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(
        preferences=StudentPreferences(
            sign_language_enabled=True
        )
    )

    umr = await orchestrator.process_problem(
        raw_content="3x - 4 = 11",
        input_type="typed",
        profile=profile
    )

    assert umr.solution.status == "solved"
    assert len(umr.solution.steps) > 0
    assert umr.accessibility.sign_language is not None
    assert "step_gestures" in umr.accessibility.sign_language
    assert len(umr.accessibility.sign_language["step_gestures"]) == len(umr.solution.steps)

    for step_payload in umr.solution.steps:
        assert step_payload.step_gestures is not None
        assert "layers" in step_payload.step_gestures
        assert "layer_1_state" in step_payload.step_gestures["layers"]
        assert "layer_2_action" in step_payload.step_gestures["layers"]
        assert "layer_3_pedagogy" in step_payload.step_gestures["layers"]

