import logging
import uuid
from typing import Optional, Dict, Any, List

from .schemas.umr import (
    UnifiedMathematicalRepresentation,
    InputPayload,
    UnderstandingPayload,
    InputType,
)
from .schemas.profile import StudentProfile
from .workflow_manager import WorkflowManager

logger = logging.getLogger("orchestrator.main")

class Orchestrator:
    _instance: Optional["Orchestrator"] = None

    def __init__(self):
        self.workflow_manager = WorkflowManager()

    @classmethod
    def get_instance(cls) -> "Orchestrator":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def initialize_all(self) -> None:
        await self.workflow_manager.registry.initialize_all()

    async def process_problem(
        self,
        raw_content: str,
        input_type: InputType = "typed",
        strokes: Optional[List[Dict[str, Any]]] = None,
        image_b64: Optional[str] = None,
        recognized_latex: Optional[str] = None,
        instruction: Optional[str] = None,
        profile: Optional[StudentProfile] = None
    ) -> UnifiedMathematicalRepresentation:
        problem_id = f"prob_{str(uuid.uuid4())[:8]}"

        umr = UnifiedMathematicalRepresentation(
            problem_id=problem_id,
            input=InputPayload(
                type=input_type,
                raw_content=raw_content,
                strokes=strokes,
                image_b64=image_b64,
                recognized_latex=recognized_latex or raw_content,
                instruction=instruction
            )
        )

        return await self.workflow_manager.execute_workflow(umr, profile)

    def get_health(self) -> Dict[str, Any]:
        return {
            "orchestrator_status": "operational",
            "capabilities": self.workflow_manager.registry.health_report()
        }

