import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.voice.math_normalizer import normalize_voice_transcript
from src.learning.fsrs import FSRS6Engine, FSRSRating

@pytest.mark.asyncio
async def test_voice_normalizer_direct():
    res = normalize_voice_transcript("three x squared plus five x plus six equals zero")
    assert res["is_equation"] is True
    assert "x^2" in res["normalized"]
    assert "5x" in res["normalized"]
    assert "=" in res["normalized"]

@pytest.mark.asyncio
async def test_voice_normalizer_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/voice/normalize", json={
            "transcript": "two x plus five equals fifteen"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_equation"] is True
        assert data["normalized"] == "2x + 5 = 15"

@pytest.mark.asyncio
async def test_fsrs6_learning_review_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First attempt: Good
        resp1 = await client.post("/api/learning/review", json={
            "concept_id": "alg.quad.solve_factor",
            "is_correct": True,
            "elapsed_days": 1.0
        })
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["stability"] > 0
        assert data1["streak"] == 1
        assert data1["status"] == "learning"

        # Second attempt: Again (failure)
        resp2 = await client.post("/api/learning/review", json={
            "concept_id": "alg.quad.solve_factor",
            "is_correct": False,
            "elapsed_days": 1.0,
            "current_state": data1
        })
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["streak"] == 0
        assert data2["status"] == "review_needed"

