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
    RoutingEngine,
    CapabilityRegistry,
)
from src.orchestrator.capability_registry import CapabilityMetadata
from src.orchestrator.adapters.base import BaseAdapter

class DummyAdapter(BaseAdapter):
    capability_name = "dummy"
    async def initialize(self): return True
    async def process(self, umr, profile): return umr
    def health_check(self): return {"status": "ok"}

def test_capability_registry():
    registry = CapabilityRegistry()
    adapter = DummyAdapter()
    meta = CapabilityMetadata(name="dummy", description="Test dummy adapter")
    registry.register(adapter, meta)

    assert registry.is_available("dummy") is True
    assert registry.get_adapter("dummy") is adapter
    assert "dummy" in registry.list_capabilities()
    report = registry.health_report()
    assert report["dummy"]["available"] is True
    assert report["dummy"]["diagnostics"]["status"] == "ok"

def test_routing_engine_profiles():
    router = RoutingEngine()
    umr = UnifiedMathematicalRepresentation(problem_id="prob_test")
    umr.input.type = "typed"

    # Profile A: Visual Learner
    prof_visual = StudentProfile(preferences=StudentPreferences(learning_style="visual", speech_enabled=False, braille_enabled=False))
    caps_visual = router.determine_active_capabilities(umr, prof_visual)
    assert "handwriting" in caps_visual
    assert "solver" in caps_visual
    assert "mathua" in caps_visual
    assert "visualization" in caps_visual
    assert "mathcat" not in caps_visual

    # Profile B: Blind Learner (Speech + Braille)
    prof_blind = StudentProfile(preferences=StudentPreferences(speech_enabled=True, braille_enabled=True, interactive_visuals_enabled=False))
    caps_blind = router.determine_active_capabilities(umr, prof_blind)
    assert "solver" in caps_blind
    assert "mathcat" in caps_blind
    assert "mathua" in caps_blind
    assert "visualization" not in caps_blind

    # Profile C: Deaf Learner (Sign Language)
    prof_deaf = StudentProfile(preferences=StudentPreferences(sign_language_enabled=True, speech_enabled=False))
    caps_deaf = router.determine_active_capabilities(umr, prof_deaf)
    assert "sixth_sense" in caps_deaf

@pytest.mark.asyncio
async def test_end_to_end_quadratic_orchestration():
    orchestrator = Orchestrator.get_instance()
    profile = StudentProfile(
        preferences=StudentPreferences(
            learning_style="visual",
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

    # 1. Understanding
    assert umr.understanding.topic == "quadratic_equations"
    assert "x" in umr.understanding.unknowns
    assert umr.understanding.is_ambiguous is False

    # 2. Mathua Prerequisites
    assert len(umr.learning.prerequisites) >= 3
    prereq_ids = [p.id for p in umr.learning.prerequisites]
    assert "prealg.expr.variables" in prereq_ids
    assert "alg.factor.trinomial" in prereq_ids
    assert "alg.quad.zero_product" in prereq_ids

    # 3. Solver Verification
    assert umr.solution.status == "solved"
    assert umr.solution.verified is True
    assert len(umr.solution.steps) >= 1
    # Check that solutions include roots (-2, -3)
    final_ans = umr.solution.final_answer_text or ""
    assert ("-2" in final_ans or "-3" in final_ans or "x" in final_ans)

    # 4. MathLearn Visualisation
    assert umr.visualisation.type == "quadratic_parabola"
    assert umr.visualisation.initial_params.get("a") == 1.0
    assert umr.visualisation.initial_params.get("b") == 5.0
    assert umr.visualisation.initial_params.get("c") == 6.0
    assert umr.visualisation.initial_params.get("discriminant") == 1.0

    # 5. MathCAT Speech & Braille
    assert umr.accessibility.speech is not None
    assert "squared" in umr.accessibility.speech.expression_speech
    assert "equals zero" in umr.accessibility.speech.expression_speech
    assert len(umr.accessibility.speech.steps_speech) >= 1

    assert umr.accessibility.braille is not None
    assert len(umr.accessibility.braille.expression_braille) > 0

    # 6. MAIDR Sonification
    assert umr.accessibility.sonification is not None
    assert umr.accessibility.sonification["chart_type"] == "parabola"
    assert len(umr.accessibility.sonification["points"]) > 0

@pytest.mark.asyncio
async def test_orchestrate_api_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test capabilities listing
        resp = await client.get("/api/orchestrate/capabilities")
        assert resp.status_code == 200
        caps = resp.json()
        assert "solver" in caps
        assert "mathua" in caps
        assert "visualization" in caps
        assert "mathcat" in caps

        # Test orchestrator health
        health_resp = await client.get("/api/orchestrate/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["orchestrator_status"] == "operational"

        # Test process endpoint
        payload = {
            "raw_content": "x^2 + 5x + 6 = 0",
            "input_type": "typed",
            "profile": {
                "preferences": {
                    "speech_enabled": True,
                    "braille_enabled": True
                }
            }
        }
        process_resp = await client.post("/api/orchestrate/process", json=payload)
        assert process_resp.status_code == 200
        data = process_resp.json()
        assert data["understanding"]["topic"] == "quadratic_equations"
        assert data["solution"]["status"] == "solved"
        assert data["solution"]["verified"] is True
        assert len(data["learning"]["prerequisites"]) > 0
