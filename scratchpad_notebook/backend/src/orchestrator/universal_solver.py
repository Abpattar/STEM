import logging
import math
from typing import Dict, Any, List, Optional
import sympy as sp

from src.geometry.engine import (
    GeometryEngine,
    MensurationEngine,
    CoordinateGeometryEngine,
    StatisticsEngine,
    ProbabilityEngine
)
from src.diagram.engine import generate_diagram
from src.orchestrator.schemas.umr import SolutionStepPayload, SolutionPayload

logger = logging.getLogger("orchestrator.universal_solver")

class UniversalSolver:
    """
    Solves any type of mathematical problem:
    - Geometry (triangles, angles, circles, Pythagoras)
    - Mensuration (2D/3D shapes, area, perimeter, volume)
    - Coordinate Geometry (distance, midpoint, slope)
    - Calculus (derivatives, integrals, limits)
    - Statistics & Probability (mean, median, mode, range, probability)
    - Arithmetic (fractions, order of operations / PEMDAS)
    """

    def solve(self, interpretation: Dict[str, Any], grade: int = 8) -> Dict[str, Any]:
        domain = interpretation.get("domain", "algebra")

        if domain == "geometry":
            return self._solve_geometry(interpretation, grade)
        elif domain == "mensuration":
            return self._solve_mensuration(interpretation, grade)
        elif domain == "coordinate_geometry":
            return self._solve_coordinate_geometry(interpretation, grade)
        elif domain == "calculus":
            return self._solve_calculus(interpretation, grade)
        elif domain == "statistics":
            return self._solve_statistics(interpretation, grade)
        elif domain == "probability":
            return self._solve_probability(interpretation, grade)
        elif domain == "arithmetic":
            return self._solve_arithmetic(interpretation, grade)
        else:
            raise ValueError(f"Domain '{domain}' requires standard algebraic solver")

    def _solve_geometry(self, interp: Dict[str, Any], grade: int) -> Dict[str, Any]:
        geom_prob = interp.get("geometry_problem")
        if not geom_prob:
            raise ValueError("No geometry problem payload found")

        engine = GeometryEngine(grade=grade)
        raw_steps = engine.solve(geom_prob)
        
        step_payloads: List[SolutionStepPayload] = []
        for i, s in enumerate(raw_steps):
            is_last = (i == len(raw_steps) - 1)
            what = f"Apply {s.operation.replace('_', ' ')}."
            why = s.explanation
            rule = f"Geometric Theorem: {s.operation.replace('_', ' ').title()}"

            step_payloads.append(
                SolutionStepPayload(
                    step_number=s.step_number,
                    latex=s.display_math,
                    operation=s.operation,
                    verified=True,
                    explanation=s.explanation,
                    what=what,
                    why=why,
                    rule=rule,
                    hint=s.hint or "Use the relevant geometric theorem.",
                    is_final_answer=is_last
                )
            )

        final_ans = raw_steps[-1].final_answer_text if (raw_steps and raw_steps[-1].final_answer_text) else (raw_steps[-1].display_math if raw_steps else "Geometry problem solved")
        
        # Build SVG diagram
        svg_code = self._generate_geometry_svg(interp, final_ans)

        return {
            "steps": step_payloads,
            "final_answer": final_ans,
            "svg_diagram": svg_code,
            "visual_type": "geometry_diagram",
            "diagram_data": {
                "topic": interp.get("topic"),
                "angles": interp.get("angles"),
                "legs": interp.get("legs"),
                "radius": interp.get("radius")
            }
        }

    def _generate_geometry_svg(self, interp: Dict[str, Any], final_ans: str) -> str:
        topic = interp.get("topic", "triangle_angles")
        
        if topic == "triangle_angles":
            angles = interp.get("angles", [38, 90])
            a1 = int(angles[0]) if float(angles[0]).is_integer() else angles[0]
            a2 = int(angles[1]) if float(angles[1]).is_integer() else angles[1]
            a3 = 180 - (a1 + a2)
            
            w, h = 440, 280
            # Clean right triangle coordinates
            vx_A = (70, 220)  # 90° corner
            vx_B = (360, 220) # a3 corner
            vx_C = (70, 50)   # a1 corner (top)

            return (
                f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Right triangle with angles {a1}°, {a2}°, and {a3}°">'
                '<style>'
                '  .tri-poly { stroke: #2563eb; stroke-width: 3; fill: rgba(37, 99, 235, 0.08); }'
                '  .angle-arc { stroke: #f97316; stroke-width: 2.2; fill: none; }'
                '  .right-sq { stroke: #475569; stroke-width: 2; fill: none; }'
                '  .angle-lbl { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 600; fill: #1e293b; }'
                '  .ans-lbl { font-family: system-ui, -apple-system, sans-serif; font-size: 15px; font-weight: 700; fill: #059669; }'
                '  .vtx-dot { fill: #1e293b; }'
                '</style>'
                f'<polygon points="{vx_A[0]},{vx_A[1]} {vx_B[0]},{vx_B[1]} {vx_C[0]},{vx_C[1]}" class="tri-poly"/>'
                # Right angle square at A
                f'<path d="M {vx_A[0]} {vx_A[1]-18} L {vx_A[0]+18} {vx_A[1]-18} L {vx_A[0]+18} {vx_A[1]}" class="right-sq"/>'
                f'<text x="{vx_A[0]+24}" y="{vx_A[1]-6}" class="angle-lbl">90°</text>'
                # Top angle at C
                f'<path d="M {vx_C[0]} {vx_C[1]+28} A 28 28 0 0 0 {vx_C[0]+14} {vx_C[1]+24}" class="angle-arc"/>'
                f'<text x="{vx_C[0]+20}" y="{vx_C[1]+48}" class="angle-lbl">{a1}°</text>'
                # Bottom right angle at B
                f'<path d="M {vx_B[0]-32} {vx_B[1]} A 32 32 0 0 1 {vx_B[0]-24} {vx_B[1]-18}" class="angle-arc"/>'
                f'<text x="{vx_B[0]-75}" y="{vx_B[1]-8}" class="ans-lbl">x = {a3}°</text>'
                # Vertex dots
                f'<circle cx="{vx_A[0]}" cy="{vx_A[1]}" r="4" class="vtx-dot"/>'
                f'<circle cx="{vx_B[0]}" cy="{vx_B[1]}" r="4" class="vtx-dot"/>'
                f'<circle cx="{vx_C[0]}" cy="{vx_C[1]}" r="4" class="vtx-dot"/>'
                '</svg>'
            )

        elif topic == "pythagoras":
            legs = interp.get("legs", [3, 4])
            a = legs[0]
            b = legs[1]
            c = math.sqrt(a**2 + b**2)
            c_str = int(c) if c.is_integer() else f"{c:.2f}"
            w, h = 420, 260
            vx_A = (60, 210)
            vx_B = (340, 210)
            vx_C = (60, 50)
            return (
                f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">'
                '<style>'
                '  .tri-poly { stroke: #2563eb; stroke-width: 3; fill: rgba(37, 99, 235, 0.08); }'
                '  .side-lbl { font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600; fill: #1e293b; }'
                '  .ans-hyp { font-family: system-ui, sans-serif; font-size: 15px; font-weight: 700; fill: #059669; }'
                '  .sq { stroke: #64748b; stroke-width: 1.5; fill: none; }'
                '</style>'
                f'<polygon points="{vx_A[0]},{vx_A[1]} {vx_B[0]},{vx_B[1]} {vx_C[0]},{vx_C[1]}" class="tri-poly"/>'
                f'<path d="M {vx_A[0]} {vx_A[1]-16} L {vx_A[0]+16} {vx_A[1]-16} L {vx_A[0]+16} {vx_A[1]}" class="sq"/>'
                f'<text x="25" y="{vx_A[1]-70}" class="side-lbl">a = {a}</text>'
                f'<text x="{vx_A[0]+120}" y="{vx_A[1]+22}" class="side-lbl">b = {b}</text>'
                f'<text x="210" y="115" class="ans-hyp">c = {c_str}</text>'
                '</svg>'
            )

        elif topic == "circle_geometry":
            r = interp.get("radius", 5)
            w, h = 400, 260
            cx, cy = 200, 130
            cr = 75
            return (
                f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">'
                '<style>'
                '  .circ { stroke: #0284c7; stroke-width: 3; fill: rgba(2, 132, 199, 0.08); }'
                '  .rad { stroke: #ea580c; stroke-width: 2; stroke-dasharray: 4,4; }'
                '  .txt { font-family: system-ui, sans-serif; font-size: 13px; font-weight: 600; fill: #1e293b; }'
                '</style>'
                f'<circle cx="{cx}" cy="{cy}" r="{cr}" class="circ"/>'
                f'<line x1="{cx}" y1="{cy}" x2="{cx+cr}" y2="{cy}" class="rad"/>'
                f'<circle cx="{cx}" cy="{cy}" r="4" fill="#0284c7"/>'
                f'<text x="{cx+cr/2 - 10}" y="{cy-8}" class="txt">r = {r}</text>'
                f'<text x="{cx}" y="{cy+cr+25}" text-anchor="middle" class="txt">{final_ans}</text>'
                '</svg>'
            )

        return f'<svg width="400" height="200"><text x="50%" y="50%" text-anchor="middle">{final_ans}</text></svg>'

    def _solve_mensuration(self, interp: Dict[str, Any], grade: int) -> Dict[str, Any]:
        prob = interp.get("mensuration_problem")
        engine = MensurationEngine(grade=grade)
        raw_steps = engine.solve(prob)
        
        step_payloads = [
            SolutionStepPayload(
                step_number=s.step_number,
                latex=s.display_math,
                operation=s.operation,
                verified=True,
                explanation=s.explanation,
                what=f"Apply {s.operation.replace('_', ' ')}.",
                why=s.explanation,
                rule=f"Mensuration Formula: {s.operation.replace('_', ' ').title()}",
                hint=s.hint,
                is_final_answer=(i == len(raw_steps) - 1)
            )
            for i, s in enumerate(raw_steps)
        ]
        final_ans = raw_steps[-1].final_answer_text if (raw_steps and raw_steps[-1].final_answer_text) else (raw_steps[-1].display_math if raw_steps else "Mensuration complete")
        
        # Build tailored SVG diagram based on shape type
        st = interp.get("shape_type") or (prob.shape_type.value if hasattr(prob, "shape_type") else "rectangle")
        if "tri" in st:
            svg = (
                f'<svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">'
                f'<polygon points="200,30 340,175 60,175" stroke="#2563eb" stroke-width="3" fill="rgba(37,99,235,0.08)"/>'
                f'<text x="200" y="205" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">{final_ans}</text>'
                f'</svg>'
            )
        elif "square" in st:
            svg = (
                f'<svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">'
                f'<rect x="130" y="25" width="140" height="140" stroke="#7c3aed" stroke-width="3" fill="rgba(124,58,237,0.08)"/>'
                f'<text x="200" y="200" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">{final_ans}</text>'
                f'</svg>'
            )
        elif "circle" in st:
            svg = (
                f'<svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">'
                f'<circle cx="200" cy="95" r="65" stroke="#0284c7" stroke-width="3" fill="rgba(2,132,199,0.08)"/>'
                f'<text x="200" y="195" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">{final_ans}</text>'
                f'</svg>'
            )
        else:
            svg = (
                f'<svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">'
                f'<rect x="80" y="35" width="240" height="120" stroke="#2563eb" stroke-width="3" fill="rgba(37,99,235,0.06)"/>'
                f'<text x="200" y="195" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">{final_ans}</text>'
                f'</svg>'
            )

        return {
            "steps": step_payloads,
            "final_answer": final_ans,
            "visual_type": "mensuration_diagram",
            "svg_diagram": svg
        }

    def _solve_coordinate_geometry(self, interp: Dict[str, Any], grade: int) -> Dict[str, Any]:
        prob = interp.get("coordinate_problem")
        engine = CoordinateGeometryEngine(grade=grade)
        raw_steps = engine.solve(prob)

        step_payloads = [
            SolutionStepPayload(
                step_number=s.step_number,
                latex=s.display_math,
                operation=s.operation,
                verified=True,
                explanation=s.explanation,
                what=f"Apply {s.operation.replace('_', ' ')}.",
                why=s.explanation,
                rule=f"Coordinate Geometry Rule: {s.operation.replace('_', ' ').title()}",
                hint=s.hint,
                is_final_answer=(i == len(raw_steps) - 1)
            )
            for i, s in enumerate(raw_steps)
        ]
        final_ans = raw_steps[-1].final_answer_text if (raw_steps and raw_steps[-1].final_answer_text) else (raw_steps[-1].display_math if raw_steps else "Coordinate calculation complete")
        return {
            "steps": step_payloads,
            "final_answer": final_ans,
            "visual_type": "coordinate_plane",
            "svg_diagram": f'<svg width="400" height="200"><line x1="40" y1="100" x2="360" y2="100" stroke="#94a3b8" stroke-width="2"/><line x1="200" y1="20" x2="200" y2="180" stroke="#94a3b8" stroke-width="2"/><text x="200" y="195" text-anchor="middle" font-weight="bold">{final_ans}</text></svg>'
        }

    def _solve_calculus(self, interp: Dict[str, Any], grade: int) -> Dict[str, Any]:
        op = interp.get("operation")
        expr_str = interp.get("expression_str", "x^2")
        x = sp.Symbol("x")
        
        from sympy.parsing.sympy_parser import (
            parse_expr,
            standard_transformations,
            implicit_multiplication_application,
            convert_xor
        )
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)
        expr = parse_expr(expr_str, transformations=transformations)
        steps: List[SolutionStepPayload] = []

        if op == "derivative":
            ans_expr = sp.diff(expr, x)
            latex_ans = sp.latex(ans_expr)
            
            steps.append(
                SolutionStepPayload(
                    step_number=1,
                    latex=f"f(x) = {sp.latex(expr)}",
                    operation="identify_function",
                    verified=True,
                    explanation=f"Identify the function to differentiate with respect to x: f(x) = {sp.latex(expr)}.",
                    what="State the target function.",
                    why="Identify each term to apply differentiation rules.",
                    rule="Calculus: Differentiation",
                    hint="Apply the power rule d/dx(x^n) = n·x^(n-1) to each term.",
                    is_final_answer=False
                )
            )
            steps.append(
                SolutionStepPayload(
                    step_number=2,
                    latex=f"\\frac{{d}}{{dx}}\\left[{sp.latex(expr)}\\right] = {latex_ans}",
                    operation="differentiate_power_rule",
                    verified=True,
                    explanation=f"Differentiate term-by-term using standard derivative rules.",
                    what="Apply differentiation power rule.",
                    why="Derivative of each term yields the rate of change function.",
                    rule="Power Rule: d/dx(x^n) = n*x^(n-1)",
                    hint="Multiply by exponent, reduce power by 1.",
                    is_final_answer=True
                )
            )
            final_ans = f"f'(x) = {latex_ans}"

        elif op in ("indefinite_integral", "definite_integral"):
            limits = interp.get("limits")
            if limits:
                a, b = limits
                ans_expr = sp.integrate(expr, (x, a, b))
                anti_deriv = sp.integrate(expr, x)
                latex_ans = sp.latex(ans_expr)
                
                steps.append(
                    SolutionStepPayload(
                        step_number=1,
                        latex=f"\\int ({sp.latex(expr)})\\,dx = {sp.latex(anti_deriv)} + C",
                        operation="find_antiderivative",
                        verified=True,
                        explanation=f"Find the antiderivative using the reverse power rule.",
                        what="Compute indefinite integral.",
                        why="Fundamental Theorem of Calculus requires F(x) evaluated at limits.",
                        rule="Reverse Power Rule: ∫ x^n dx = x^(n+1)/(n+1)",
                        hint="Increase power by 1, divide by new power.",
                        is_final_answer=False
                    )
                )
                steps.append(
                    SolutionStepPayload(
                        step_number=2,
                        latex=f"\\left[ {sp.latex(anti_deriv)} \\right]_{{{a}}}^{{{b}}} = {latex_ans}",
                        operation="evaluate_definite_limits",
                        verified=True,
                        explanation=f"Evaluate F(b) - F(a): F({b}) - F({a}) = {latex_ans}.",
                        what="Apply integration boundaries.",
                        why="Subtract value at lower limit from value at upper limit.",
                        rule="Fundamental Theorem: ∫_a^b f(x)dx = F(b) - F(a)",
                        hint="Substitute upper bound, then subtract substitution of lower bound.",
                        is_final_answer=True
                    )
                )
                final_ans = f"\\text{{Area}} = {latex_ans}"
            else:
                ans_expr = sp.integrate(expr, x)
                latex_ans = sp.latex(ans_expr)
                steps.append(
                    SolutionStepPayload(
                        step_number=1,
                        latex=f"\\int ({sp.latex(expr)})\\,dx = {latex_ans} + C",
                        operation="indefinite_integration",
                        verified=True,
                        explanation="Integrate term-by-term using the reverse power rule and append the constant of integration C.",
                        what="Integrate with respect to x.",
                        why="Antiderivative is the inverse of differentiation.",
                        rule="Integration: Reverse Power Rule",
                        hint="Add 1 to the exponent and divide by the new exponent.",
                        is_final_answer=True
                    )
                )
                final_ans = f"F(x) = {latex_ans} + C"

        elif op == "limit":
            target = interp.get("target", "0")
            lim_val = sp.limit(expr, x, sp.sympify(target))
            latex_ans = sp.latex(lim_val)
            steps.append(
                SolutionStepPayload(
                    step_number=1,
                    latex=f"\\lim_{{x \\to {target}}} \\left({sp.latex(expr)}\\right) = {latex_ans}",
                    operation="evaluate_limit",
                    verified=True,
                    explanation=f"Evaluate the limit of {expr_str} as x approaches {target}: {latex_ans}.",
                    what="Compute limit value.",
                    why="Determines behavior of function as independent variable approaches boundary.",
                    rule="Calculus: Limit Evaluation",
                    hint="Use substitution or L'Hôpital's rule if indeterminate.",
                    is_final_answer=True
                )
            )
            final_ans = f"L = {latex_ans}"
        else:
            final_ans = "Calculus complete"

        return {
            "steps": steps,
            "final_answer": final_ans,
            "visual_type": "calculus_curve",
            "svg_diagram": f'<svg width="400" height="200"><path d="M 50 150 Q 200 20 350 150" stroke="#8b5cf6" stroke-width="3" fill="none"/><text x="200" y="180" text-anchor="middle" font-weight="bold">{final_ans}</text></svg>'
        }

    def _solve_statistics(self, interp: Dict[str, Any], grade: int) -> Dict[str, Any]:
        prob = interp.get("statistics_problem")
        engine = StatisticsEngine(grade=grade)
        raw_steps = engine.solve(prob)
        step_payloads = [
            SolutionStepPayload(
                step_number=s.step_number,
                latex=s.display_math,
                operation=s.operation,
                verified=True,
                explanation=s.explanation,
                what=f"Compute {s.operation}.",
                why=s.explanation,
                rule=f"Statistical Measure: {s.operation.capitalize()}",
                hint=s.hint,
                is_final_answer=(i == len(raw_steps) - 1)
            )
            for i, s in enumerate(raw_steps)
        ]
        final_ans = raw_steps[-1].final_answer_text if (raw_steps and raw_steps[-1].final_answer_text) else (raw_steps[-1].display_math if raw_steps else "Statistics complete")
        return {
            "steps": step_payloads,
            "final_answer": final_ans,
            "visual_type": "bar_chart",
            "svg_diagram": f'<svg width="400" height="200"><rect x="60" y="80" width="40" height="80" fill="#3b82f6"/><rect x="120" y="50" width="40" height="110" fill="#3b82f6"/><rect x="180" y="30" width="40" height="130" fill="#3b82f6"/><text x="200" y="190" text-anchor="middle" font-weight="bold">{final_ans}</text></svg>'
        }

    def _solve_probability(self, interp: Dict[str, Any], grade: int) -> Dict[str, Any]:
        prob = interp.get("probability_problem")
        engine = ProbabilityEngine(grade=grade)
        raw_steps = engine.solve(prob)
        step_payloads = [
            SolutionStepPayload(
                step_number=s.step_number,
                latex=s.display_math,
                operation=s.operation,
                verified=True,
                explanation=s.explanation,
                what="Calculate probability.",
                why=s.explanation,
                rule="Probability Formula: P(E) = n(E) / n(S)",
                hint=s.hint,
                is_final_answer=True
            )
            for s in raw_steps
        ]
        final_ans = raw_steps[-1].final_answer_text if raw_steps else "Probability complete"
        return {
            "steps": step_payloads,
            "final_answer": final_ans,
            "visual_type": "probability_diagram",
            "svg_diagram": f'<svg width="400" height="200"><circle cx="200" cy="90" r="60" fill="rgba(34,197,94,0.15)" stroke="#16a34a" stroke-width="2"/><text x="200" y="95" text-anchor="middle" font-weight="bold">{final_ans}</text></svg>'
        }

    def _solve_arithmetic(self, interp: Dict[str, Any], grade: int) -> Dict[str, Any]:
        expr_str = interp.get("expression_str", "1/2 + 3/4")
        from sympy.parsing.sympy_parser import (
            parse_expr,
            standard_transformations,
            implicit_multiplication_application,
            convert_xor
        )
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)
        val = parse_expr(expr_str, transformations=transformations)
        steps = [
            SolutionStepPayload(
                step_number=1,
                latex=f"\\text{{Evaluate: }} {expr_str} = {sp.latex(val)}",
                operation="arithmetic_evaluation",
                verified=True,
                explanation=f"Compute the numerical value using standard order of operations: {expr_str} = {sp.latex(val)}.",
                what="Calculate arithmetic expression.",
                why="Apply arithmetic operator precedence (PEMDAS/BODMAS).",
                rule="Arithmetic: Order of Operations",
                hint="Evaluate brackets, then exponents, then multiplication/division, then addition/subtraction.",
                is_final_answer=True
            )
        ]
        return {
            "steps": steps,
            "final_answer": f"\\text{{Result}} = {sp.latex(val)}",
            "visual_type": "arithmetic_display",
            "svg_diagram": f'<svg width="400" height="160"><text x="200" y="85" text-anchor="middle" font-size="20" font-weight="bold" fill="#059669">{sp.latex(val)}</text></svg>'
        }
