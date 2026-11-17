import logging
import asyncio
import uuid
import time
from typing import Dict, Any, Optional

from .schemas.umr import UnifiedMathematicalRepresentation, InputPayload, UnderstandingPayload
from .schemas.profile import StudentProfile
from .capability_registry import CapabilityRegistry, CapabilityMetadata
from .routing_engine import RoutingEngine
from .adapters import (
    HandwritingAdapter,
    SolverAdapter,
    MathuaAdapter,
    VisualizationAdapter,
    MathCATAdapter,
    MAIDRAdapter,
    SixthSenseAdapter,
)

logger = logging.getLogger("orchestrator.workflow_manager")

class WorkflowManager:
    def __init__(self):
        self.registry = CapabilityRegistry()
        self.routing_engine = RoutingEngine()
        self._register_default_capabilities()

    def _register_default_capabilities(self):
        # Register Handwriting
        self.registry.register(
            HandwritingAdapter(),
            CapabilityMetadata(
                name="handwriting",
                description="Client-side Ink-On ONNX + Vision OCR + SymPy parser",
                supported_inputs=["handwriting", "typed", "voice"],
                supported_outputs=["ast", "latex", "topic"]
            )
        )
        # Register Solver
        self.registry.register(
            SolverAdapter(),
            CapabilityMetadata(
                name="solver",
                description="SymPy Computer Algebra System with Formal Equivalence Verification",
                supported_inputs=["ast"],
                supported_outputs=["steps", "solution", "verification"]
            )
        )
        # Register Mathua
        self.registry.register(
            MathuaAdapter(),
            CapabilityMetadata(
                name="mathua",
                description="Mathua Concept Dependency DAG & Prerequisite Identification",
                supported_inputs=["topic"],
                supported_outputs=["prerequisites", "learning_sequence"]
            )
        )
        # Register Visualization
        self.registry.register(
            VisualizationAdapter(),
            CapabilityMetadata(
                name="visualization",
                description="MathLearn-Primary Interactive Visual Components",
                supported_inputs=["topic", "coefficients"],
                supported_outputs=["parabola", "balance", "tiles"]
            )
        )
        # Register MathCAT
        self.registry.register(
            MathCATAdapter(),
            CapabilityMetadata(
                name="mathcat",
                description="MathCAT ClearSpeak Speech & Nemeth/UEB Braille Generation",
                supported_inputs=["latex", "steps"],
                supported_outputs=["clearspeak", "nemeth_braille", "ueb_braille"]
            )
        )
        # Register MAIDR
        self.registry.register(
            MAIDRAdapter(),
            CapabilityMetadata(
                name="maidr",
                description="MAIDR Accessible Graph Sonification & Spatial Navigation",
                supported_inputs=["visualisation"],
                supported_outputs=["sonification_frequencies", "spatial_nav"]
            )
        )
        # Register Sixth-Sense
        self.registry.register(
            SixthSenseAdapter(),
            CapabilityMetadata(
                name="sixth_sense",
                description="Sixth-Sense Indian Sign Language (ISL) Interaction",
                supported_inputs=["latex", "tokens"],
                supported_outputs=["isl_tokens", "disclaimers"]
            )
        )

    async def initialize_all(self):
        """Initialize all registered adapters."""
        for name, meta in self.registry.list_capabilities().items():
            adapter = self.registry.get_adapter(name)
            if adapter:
                try:
                    await adapter.initialize()
                except Exception as e:
                    logger.warning(f"Failed to initialize adapter '{name}': {e}")

    async def execute_workflow(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: Optional[StudentProfile] = None
    ) -> UnifiedMathematicalRepresentation:
        start_time = time.time()
        if profile is None:
            profile = StudentProfile()

        # Step 1: Route active capabilities based on problem and profile
        active_caps = self.routing_engine.determine_active_capabilities(umr, profile)
        logger.info(f"Executing workflow for problem {umr.problem_id} with active capabilities: {active_caps}")

        # Step 2: Sequentially process each active capability adapter
        for cap_name in active_caps:
            adapter = self.registry.get_adapter(cap_name)
            if not adapter or not self.registry.is_available(cap_name):
                logger.warning(f"Capability '{cap_name}' requested but unavailable; skipping.")
                continue

            try:
                # Execute adapter with timeout
                umr = await asyncio.wait_for(adapter.process(umr, profile), timeout=8.0)

                # If handwriting step determined problem is ambiguous, stop early to ask clarification
                if cap_name == "handwriting" and umr.understanding.is_ambiguous:
                    logger.info("Problem is ambiguous after handwriting recognition; returning clarification request.")
                    break

            except asyncio.TimeoutError:
                logger.error(f"Capability '{cap_name}' timed out after 8.0s; applying fallback.")
            except Exception as e:
                logger.error(f"Capability '{cap_name}' raised an error: {e}", exc_info=True)

        elapsed = time.time() - start_time
        umr.metadata["execution_time_ms"] = round(elapsed * 1000, 2)
        umr.metadata["executed_capabilities"] = active_caps

        return umr

