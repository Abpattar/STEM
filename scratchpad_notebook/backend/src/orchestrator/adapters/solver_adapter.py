import logging
from typing import Dict, Any, List
import sympy as sp
import uuid

from .base import BaseAdapter
from ..schemas.umr import (
    UnifiedMathematicalRepresentation,
    SolutionPayload,
    SolutionStepPayload,
)
from ..schemas.profile import StudentProfile
from src.solver.schemas import StructuredProblem
from src.solver import solve
from src.solver.engine import SolverEngine
from src.utils.topic_registry import is_topic_supported
from src.teaching import enrich_steps, TeachingProviderConfig

logger = logging.getLogger("orchestrator.adapters.solver")

class SolverAdapter(BaseAdapter):
    capability_name: str = "solver"
    is_available: bool = True

    async def initialize(self) -> bool:
        self.is_available = True
        return True

    def _ast_to_structured_problem(self, umr: UnifiedMathematicalRepresentation, grade: int) -> StructuredProblem:
        und = umr.understanding
        topic = und.topic if und.topic != "unknown" else "linear_equations"
        
        # Verify topic support
        if not is_topic_supported(topic):
            topic = "linear_equations"  # Graceful fallback to general linear

        math_expr = {
            "ast_json": und.ast,
            "latex": umr.input.recognized_latex or ""
        }

        prob_type = und.problem_type
        if prob_type not in ("equation", "system", "expression", "word_problem", "inequality"):
            prob_type = "equation"

        return StructuredProblem(
            problem_type=prob_type,
            expressions=[math_expr],
            unknowns=und.unknowns or ["x"],
            given_values={},
            constraints=[],
            requested_operation="solve",
            topic=topic,
            units={},
            grade_hint=grade,
            source=umr.input.type if umr.input.type in ("handwriting", "typed") else "typed"
        )

    def _format_solution(self, expr) -> str:
        if isinstance(expr, sp.Eq):
            return f"{sp.latex(expr.lhs)} = {sp.latex(expr.rhs)}"
        elif isinstance(expr, sp.And):
            return ", ".join(self._format_solution(arg) for arg in expr.args)
        elif isinstance(expr, sp.Or):
            return " \\quad\\text{or}\\quad ".join(self._format_solution(arg) for arg in expr.args)
        elif expr is not None:
            return sp.latex(expr)
        return "Solution complete"

    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        interpretation = umr.metadata.get("interpretation")
        domain = interpretation.get("domain") if interpretation else None
        grade = profile.grade

        # Handle non-algebra domains (Geometry, Mensuration, Coordinate, Calculus, Statistics, Probability, Arithmetic)
        if domain and domain in ("geometry", "mensuration", "coordinate_geometry", "calculus", "statistics", "probability", "arithmetic"):
            try:
                from ..universal_solver import UniversalSolver
                solver = UniversalSolver()
                res = solver.solve(interpretation, grade=grade)

                umr.solution = SolutionPayload(
                    status="solved",
                    verified=True,
                    steps=res["steps"],
                    final_answer_text=res["final_answer"]
                )

                if res.get("svg_diagram"):
                    umr.visualisation.type = "svg_diagram"
                    umr.visualisation.component_id = "GeometryDiagramVisualizer"
                    umr.visualisation.initial_params = {
                        "svg_code": res["svg_diagram"],
                        "topic": interpretation.get("topic"),
                        "domain": domain
                    }
                    umr.visualisation.description = f"Interactive visual diagram for {interpretation.get('topic')}"
                return umr
            except Exception as e:
                logger.error(f"Universal solver error: {e}", exc_info=True)
                umr.solution = SolutionPayload(
                    status="error",
                    verified=False,
                    error_message=f"Mathematical solver error: {str(e)}"
                )
                return umr

        if not umr.understanding.ast:
            umr.solution = SolutionPayload(
                status="error",
                verified=False,
                error_message="No mathematical AST present to solve"
            )
            return umr

        grade = profile.grade
        try:
            problem = self._ast_to_structured_problem(umr, grade)
            raw_steps = solve(problem, grade=grade)

            if not raw_steps:
                umr.solution = SolutionPayload(
                    status="unsupported",
                    verified=False,
                    error_message=f"Could not generate verified steps for topic: {problem.topic}"
                )
                return umr

            teaching_config = TeachingProviderConfig()
            enriched_steps = await enrich_steps(problem, raw_steps, grade, teaching_config)

            solver_engine = SolverEngine(grade=grade)
            step_payloads: List[SolutionStepPayload] = []
            final_text = "Solution complete"

            for i, step in enumerate(enriched_steps):
                is_last = (i == len(enriched_steps) - 1)
                final_answer_text = None

                if is_last:
                    try:
                        last_ast = getattr(raw_steps[-1], 'result_ast', None) or step.equation_ast
                        final_expr = solver_engine._ast_to_sympy(last_ast)
                        final_text = self._format_solution(final_expr)
                        final_answer_text = final_text
                    except Exception:
                        final_text = "Solution complete"
                        final_answer_text = final_text

                # Generate structured pedagogical 'what' and 'why'
                what_text = f"Apply {step.operation.replace('_', ' ')}."
                why_text = step.explanation if step.explanation else "To simplify and isolate the unknown variable."
                rule_text = f"Mathematical Rule: {step.operation.replace('_', ' ').title()}"

                step_payloads.append(
                    SolutionStepPayload(
                        step_number=step.step_number,
                        latex=step.display_math,
                        operation=step.operation,
                        verified=step.validation.is_valid if hasattr(step, 'validation') else True,
                        explanation=step.explanation,
                        what=what_text,
                        why=why_text,
                        rule=rule_text,
                        hint=step.hint if hasattr(step, 'hint') else None,
                        is_final_answer=is_last
                    )
                )

            umr.solution = SolutionPayload(
                status="solved",
                verified=all(s.verified for s in step_payloads),
                steps=step_payloads,
                final_answer_text=final_text
            )

        except Exception as e:
            logger.error(f"Solver adapter processing error: {e}", exc_info=True)
            umr.solution = SolutionPayload(
                status="error",
                verified=False,
                error_message=f"Mathematical solver error: {str(e)}"
            )

        return umr

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy" if self.is_available else "unavailable",
            "backend": "SymPy CAS + Equivalence Verifier",
            "source_of_truth": True
        }
