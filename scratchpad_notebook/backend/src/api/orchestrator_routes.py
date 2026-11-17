from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from src.orchestrator import (
    Orchestrator,
    UnifiedMathematicalRepresentation,
    StudentProfile,
    InputType,
)

router = APIRouter(prefix="/api/orchestrate", tags=["orchestrator"])

class OrchestrateProcessRequest(BaseModel):
    raw_content: str
    input_type: InputType = "typed"
    strokes: Optional[List[Dict[str, Any]]] = None
    image_b64: Optional[str] = None
    recognized_latex: Optional[str] = None
    instruction: Optional[str] = None
    profile: Optional[StudentProfile] = None

@router.post("/process", response_model=UnifiedMathematicalRepresentation)
async def process_mathematical_problem(request: OrchestrateProcessRequest):
    """
    Central Orchestrator endpoint: takes student input (typed, handwriting, ISL)
    along with student profile, and coordinates the 8-step pipeline across all
    specialist capabilities.
    """
    orchestrator = Orchestrator.get_instance()
    try:
        umr = await orchestrator.process_problem(
            raw_content=request.raw_content,
            input_type=request.input_type,
            strokes=request.strokes,
            image_b64=request.image_b64,
            recognized_latex=request.recognized_latex,
            instruction=request.instruction,
            profile=request.profile
        )
        return umr
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {str(e)}")

@router.get("/capabilities")
async def get_capabilities():
    """List all registered capability adapters, metadata, and active status."""
    orchestrator = Orchestrator.get_instance()
    return orchestrator.workflow_manager.registry.list_capabilities()

@router.get("/health")
async def get_orchestrator_health():
    """Get diagnostic health report for central orchestrator and all adapters."""
    orchestrator = Orchestrator.get_instance()
    return orchestrator.get_health()
