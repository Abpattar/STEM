import logging
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

from .base import BaseAdapter
from ..schemas.umr import (
    UnifiedMathematicalRepresentation,
    LearningPayload,
    PrerequisiteConcept,
)
from ..schemas.profile import StudentProfile

logger = logging.getLogger("orchestrator.adapters.mathua")

TOPIC_TO_CONCEPT_MAP: Dict[str, str] = {
    "quadratic_equations": "alg.quad.solve_factor",
    "linear_equations": "prealg.eq.two_step",
    "systems_2var": "alg.sys.sub",
    "radicals": "alg.rad.solve",
    "fractions": "arith.frac.add",
    "expressions": "prealg.expr.like_terms",
    "geometry": "geo.tri.pythagoras",
    "statistics": "stat.summary.mean"
}

# Educational explanations for key prerequisite concepts
CONCEPT_DETAILS: Dict[str, Dict[str, str]] = {
    "prealg.expr.variables": {
        "label": "Variables and Coefficients",
        "domain": "prealgebra",
        "description": "Understanding letters that represent unknown numbers (e.g., x) and the numbers multiplied by them (e.g., 5 in 5x)."
    },
    "alg.poly.foil": {
        "label": "Multiplying Binomials (FOIL)",
        "domain": "algebra",
        "description": "Multiplying two binomial expressions: First, Outer, Inner, Last (e.g. (x+2)(x+3) = x² + 5x + 6)."
    },
    "alg.factor.trinomial": {
        "label": "Factoring Quadratic Trinomials",
        "domain": "algebra",
        "description": "Finding two numbers that multiply to the constant term 'c' and add up to the linear coefficient 'b'."
    },
    "alg.quad.zero_product": {
        "label": "Zero-Product Property",
        "domain": "algebra",
        "description": "If the product of two factors is zero (A · B = 0), then at least one factor must be zero (A = 0 or B = 0)."
    },
    "prealg.eq.two_step": {
        "label": "Solving Linear Equations",
        "domain": "prealgebra",
        "description": "Using inverse operations to isolate a variable on one side of an equation."
    },
    "prealg.eq.one_step": {
        "label": "One-Step Inverse Operations",
        "domain": "prealgebra",
        "description": "Adding, subtracting, multiplying, or dividing on both sides to balance the equation."
    },
    "alg.sys.sub": {
        "label": "Substitution Method",
        "domain": "algebra",
        "description": "Isolating one variable in an equation and substituting it into the other equation."
    }
}

class MathuaAdapter(BaseAdapter):
    capability_name: str = "mathua"
    is_available: bool = True

    def __init__(self):
        self._concepts: Dict[str, Dict[str, Any]] = {}
        self._initialized = False

    async def initialize(self) -> bool:
        if self._initialized:
            return True

        try:
            # Locate Mathua/data/concepts relative to this repo
            repo_root = Path(__file__).resolve().parents[5]
            concepts_dir = repo_root / "Mathua" / "data" / "concepts"

            if not concepts_dir.exists():
                logger.warning(f"Mathua concepts directory not found at {concepts_dir}")
                self.is_available = False
                return False

            count = 0
            for f in concepts_dir.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8") as fp:
                        items = json.load(fp)
                        if isinstance(items, list):
                            for item in items:
                                if isinstance(item, dict) and "id" in item:
                                    self._concepts[item["id"]] = item
                                    count += 1
                except Exception as ex:
                    logger.debug(f"Failed parsing concept file {f.name}: {ex}")

            logger.info(f"MathuaAdapter loaded {count} concept nodes from {concepts_dir}")
            self._initialized = True
            self.is_available = True
            return True
        except Exception as e:
            logger.error(f"MathuaAdapter initialization error: {e}")
            self.is_available = False
            return False

    def get_prerequisites_for_topic(self, topic: str) -> List[PrerequisiteConcept]:
        primary_id = TOPIC_TO_CONCEPT_MAP.get(topic, "prealg.eq.two_step")
        prereqs: List[PrerequisiteConcept] = []

        if topic == "quadratic_equations":
            # Targeted pedagogical sequence for quadratic factorisation
            sequence_ids = [
                "prealg.expr.variables",
                "alg.poly.foil",
                "alg.factor.trinomial",
                "alg.quad.zero_product",
                "prealg.eq.two_step"
            ]
            for cid in sequence_ids:
                meta = CONCEPT_DETAILS.get(cid, {})
                prereqs.append(
                    PrerequisiteConcept(
                        id=cid,
                        label=meta.get("label", cid),
                        domain=meta.get("domain", "algebra"),
                        description=meta.get("description", ""),
                        mastered=False
                    )
                )
            return prereqs

        # For general topics, query loaded concept DAG
        concept_node = self._concepts.get(primary_id)
        if concept_node:
            prereq_ids = concept_node.get("prerequisites", []) + concept_node.get("key_prerequisites", [])
            for cid in prereq_ids[:5]:
                meta = CONCEPT_DETAILS.get(cid)
                label = meta["label"] if meta else self._concepts.get(cid, {}).get("label", cid)
                domain = meta["domain"] if meta else self._concepts.get(cid, {}).get("domain", "algebra")
                desc = meta["description"] if meta else ""
                prereqs.append(
                    PrerequisiteConcept(
                        id=cid,
                        label=label,
                        domain=domain,
                        description=desc,
                        mastered=False
                    )
                )

        if not prereqs:
            # Default fundamental prerequisites
            prereqs.append(
                PrerequisiteConcept(
                    id="prealg.expr.variables",
                    label=CONCEPT_DETAILS["prealg.expr.variables"]["label"],
                    domain="prealgebra",
                    description=CONCEPT_DETAILS["prealg.expr.variables"]["description"]
                )
            )

        return prereqs

    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        if not self._initialized:
            await self.initialize()

        topic = umr.understanding.topic
        primary_id = TOPIC_TO_CONCEPT_MAP.get(topic, "prealg.eq.two_step")
        prereq_list = self.get_prerequisites_for_topic(topic)

        umr.learning = LearningPayload(
            primary_concept_id=primary_id,
            prerequisites=prereq_list,
            mastery_status="assessing",
            recommended_sequence=[p.id for p in prereq_list]
        )

        return umr

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy" if self.is_available else "unavailable",
            "concept_nodes_loaded": len(self._concepts),
            "source": "Mathua/data/concepts DAG"
        }

