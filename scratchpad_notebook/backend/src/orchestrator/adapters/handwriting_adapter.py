import logging
import re
from typing import Dict, Any, Optional, List
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor
)

from .base import BaseAdapter
from ..schemas.umr import (
    UnifiedMathematicalRepresentation,
    InputPayload,
    UnderstandingPayload,
)
from ..schemas.profile import StudentProfile
from src.api.routes import expr_to_ast, _extract_equation_from_word_problem
from src.config import settings
from ..universal_interpreter import UniversalMathInterpreter

logger = logging.getLogger("orchestrator.adapters.handwriting")

class HandwritingAdapter(BaseAdapter):
    capability_name: str = "handwriting"
    is_available: bool = True

    def __init__(self):
        self.transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

    async def initialize(self) -> bool:
        self.is_available = True
        return True

    def _find_symbols(self, ast_dict: dict) -> set:
        symbols = set()
        if ast_dict.get("type") == "symbol":
            name = ast_dict.get("name")
            if name:
                symbols.add(name)
        for key, val in ast_dict.items():
            if isinstance(val, dict):
                symbols.update(self._find_symbols(val))
            elif isinstance(val, list):
                for item in val:
                    if isinstance(item, dict):
                        symbols.update(self._find_symbols(item))
        return symbols

    def _has_pow2(self, d: Any) -> bool:
        if isinstance(d, dict):
            if d.get("type") == "pow" and isinstance(d.get("exp"), dict) and d.get("exp", {}).get("value") == 2:
                return True
            return any(self._has_pow2(v) for v in d.values())
        elif isinstance(d, list):
            return any(self._has_pow2(v) for v in d)
        return False

    def parse_string_to_ast(self, text: str) -> Optional[Dict[str, Any]]:
        clean = text.strip()
        clean = re.sub(r'^(solve|calculate|evaluate|simplify|find)\s+', '', clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', clean)
        clean = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', clean)
        clean = clean.replace('\\times', '*').replace('\\div', '/').replace('^', '**')
        
        try:
            if "=" in clean and clean.count("=") == 1:
                left_str, right_str = clean.split("=")
                l_expr = parse_expr(left_str.strip(), transformations=self.transformations)
                r_expr = parse_expr(right_str.strip(), transformations=self.transformations)
                eq = sp.Eq(l_expr, r_expr)
                return {
                    "ast": {"type": "eq", "left": expr_to_ast(l_expr), "right": expr_to_ast(r_expr)},
                    "latex": sp.latex(eq),
                    "expr": eq
                }
            else:
                expr = parse_expr(clean, transformations=self.transformations)
                return {
                    "ast": expr_to_ast(expr),
                    "latex": sp.latex(expr),
                    "expr": expr
                }
        except Exception as e:
            logger.debug(f"Direct parse failed for '{text}': {e}")
            return None

    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        # If AST is already populated (e.g. from prior client-side Ink-On recognition), validate and classify
        if umr.understanding.ast:
            self._enrich_understanding(umr)
            return umr

        text_to_parse = umr.input.recognized_latex or umr.input.raw_content or ""
        clean = text_to_parse.strip()

        # Pre-clean conversational fillers and repeated verbs
        filler_pattern = r'\b(calculate\s+value\s+of|calculate\s+value|calculate|value\s+of|solve\s+for\s+\w+|solve|simplify|evaluate|find\s+the\s+value\s+of|find|for\s+[a-zA-Z]+|with\s+respect\s+to\s+[a-zA-Z]+|and|please|then|now|tell\s+me)\b'
        prev = None
        while clean != prev:
            prev = clean
            clean = re.sub(filler_pattern, ' ', clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r'\s+', ' ', clean).strip()

        # Step 0: Detect malformed or incomplete expressions (dangling operators, e.g. "x + = 5", "3 + * 2")
        # Do not flag degree symbol ° or question marks in geometry diagrams as dangling operators
        is_geom_syntax = any(k in clean.lower() for k in ["°", "deg", "triangle", "angle", "radius", "circle"])
        dangling_pattern = r'([+\-*/^]\s*(=|[+\-*/^]))|([+\-*/^]\s*$)|(^\s*[*/^])'
        if not is_geom_syntax and re.search(dangling_pattern, clean):
            umr.understanding.is_ambiguous = True
            umr.understanding.clarification_question = (
                f"Incomplete expression detected in '{clean}'. "
                "A mathematical symbol or number appears to be missing before or after an operator."
            )
            return umr

        clean = re.sub(r'^[+\-*/=\s]+', '', clean)
        clean = re.sub(r'[+\-*/\s]+$', '', clean)

        # Step 1: Universal Mathematical Interpreter (Geometry, Mensuration, Coordinate, Calculus, Stats, Arithmetic, Algebra)
        interpreter = UniversalMathInterpreter()
        interpretation = interpreter.interpret(text_to_parse)

        if interpretation.get("is_ambiguous"):
            umr.understanding.is_ambiguous = True
            umr.understanding.clarification_question = interpretation.get("clarification_question")
            umr.understanding.clarification_options = interpretation.get("clarification_options", [])
            umr.metadata["interpretation"] = interpretation
            return umr

        if interpretation.get("domain") != "unknown" and (
            interpretation.get("ast") or interpretation.get("geometry_problem") or interpretation.get("mensuration_problem") or interpretation.get("coordinate_problem")
        ):
            umr.understanding.topic = interpretation.get("topic", "general")
            umr.understanding.problem_type = interpretation.get("problem_type", "equation")
            umr.understanding.unknowns = interpretation.get("unknowns", ["x"])
            umr.understanding.ast = interpretation.get("ast", {"type": "universal", "domain": interpretation.get("domain")})
            umr.understanding.is_ambiguous = False
            umr.understanding.clarification_question = None
            umr.understanding.clarification_options = []

            if interpretation.get("latex"):
                umr.input.recognized_latex = interpretation["latex"]

            umr.understanding.mathml = f"<math xmlns='http://www.w3.org/1998/Math/MathML'><mrow><mtext>{umr.input.recognized_latex or text_to_parse}</mtext></mrow></math>"
            umr.metadata["interpretation"] = interpretation
            return umr

        # Step 2: If direct parse fails and input looks like a word problem, attempt LLM extraction
        if len(text_to_parse.split()) > 3:
            extracted_eq = await _extract_equation_from_word_problem(text_to_parse)
            if extracted_eq:
                parsed = self.parse_string_to_ast(extracted_eq)
                if parsed:
                    umr.understanding.ast = parsed["ast"]
                    umr.input.recognized_latex = parsed["latex"]
                    self._enrich_understanding(umr)
                    return umr

        # Clean repeated command words and conversational filler
        filler_pattern = r'\b(calculate\s+value\s+of|calculate\s+value|calculate|value\s+of|solve\s+for\s+\w+|solve|simplify|evaluate|find\s+the\s+value\s+of|find|for\s+[a-zA-Z]+|with\s+respect\s+to\s+[a-zA-Z]+|and|please|then|now|tell\s+me)\b'
        clean_text = text_to_parse
        prev = None
        while clean_text != prev:
            prev = clean_text
            clean_text = re.sub(filler_pattern, ' ', clean_text, flags=re.IGNORECASE).strip()
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        clean_text = re.sub(r'([+\-/])\s*([+\-/=])', r'\2', clean_text)
        clean_text = re.sub(r'(?<!\*)\*(?!\*)\s*([+\-/=])', r'\1', clean_text)
        clean_text = re.sub(r'\*{3,}', '**', clean_text)
        clean_text = re.sub(r'^[+\-*/=\s]+', '', clean_text)
        clean_text = re.sub(r'[+\-*/\s]+$', '', clean_text)

        # Retry parsing clean text first before falling back to ambiguity
        if clean_text and clean_text != text_to_parse:
            parsed_clean = self.parse_string_to_ast(clean_text)
            if parsed_clean:
                umr.understanding.ast = parsed_clean["ast"]
                umr.input.recognized_latex = parsed_clean["latex"]
                self._enrich_understanding(umr)
                return umr

        # Truly unparsable - provide guaranteed-solvable one-click clarification options
        clarification = interpreter.build_solvable_clarification(text_to_parse)
        umr.understanding.is_ambiguous = True
        umr.understanding.clarification_question = clarification.get("clarification_question")
        umr.understanding.clarification_options = clarification.get("clarification_options", [])

        return umr

    def _enrich_understanding(self, umr: UnifiedMathematicalRepresentation):
        ast = umr.understanding.ast
        all_symbols = self._find_symbols(ast)
        unknowns = sorted(list(all_symbols))
        umr.understanding.unknowns = unknowns

        # Detect topic
        is_eq = ast.get("type") == "eq" or "=" in (umr.input.recognized_latex or "")
        if is_eq:
            umr.understanding.problem_type = "equation"
            if self._has_pow2(ast):
                umr.understanding.topic = "quadratic_equations"
            else:
                umr.understanding.topic = "linear_equations"
        else:
            umr.understanding.problem_type = "expression"
            umr.understanding.topic = "expressions"

        # Generate MathML representation for accessibility
        try:
            expr_str = umr.input.recognized_latex or ""
            # Simple MathML wrapping or SymPy mathml
            if expr_str:
                umr.understanding.mathml = f"<math xmlns='http://www.w3.org/1998/Math/MathML'><mrow><mtext>{expr_str}</mtext></mrow></math>"
        except Exception:
            pass

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "providers": ["ink_on_client", "groq_vision_ocr", "sympy_parser"],
            "active_llm": bool(settings.vision_llm_api_key or settings.llm_api_key)
        }
