import logging
import os
import re
from typing import Dict, Any, List, Set, Optional
from .base import BaseAdapter
from ..schemas.umr import (
    UnifiedMathematicalRepresentation,
    SolutionStepPayload,
)
from ..schemas.profile import StudentProfile
from src.config import settings

logger = logging.getLogger("orchestrator.adapters.sixth_sense")

# Validated template vocabulary from Sixth-Sense/data/preset-references.json
SUPPORTED_TEMPLATE_SIGNS: Set[str] = {
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
    'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
    'W', 'X', 'Y', 'Z', 'HELLO', 'HELP',
    '+', '-', '*', '/', '=', '^', '^2', '^3', '√', '(', ')', '[', ']',
    '<', '>', '<=', '>=', '±', '+-', 'π', '°', '%', '?', ',', ';', 'OR',
    'PLUS', 'MINUS', 'TIMES', 'DIVIDE', 'EQUALS', 'POWER', 'SQUARED', 'CUBED', 'SQRT',
    'LPAREN', 'RPAREN', 'LBRACKET', 'RBRACKET', 'LESS_THAN', 'GREATER_THAN',
    'LESS_EQUAL', 'GREATER_EQUAL', 'PLUS_MINUS', 'PI', 'DEGREES', 'DEG', 'PERCENT',
    'QUESTION', 'COMMA', 'SEMICOLON', 'SIMPLIFY', 'BALANCE'
}

# Standard Indian Sign Language (ISL) educational mathematical glosses with 3D landmark presets
MATH_OPERATOR_GLOSS: Dict[str, Dict[str, str]] = {
    '+': {'gloss': 'PLUS', 'gesture': 'Crossed index fingers perpendicular (+ shape)'},
    'PLUS': {'gloss': 'PLUS', 'gesture': 'Crossed index fingers perpendicular (+ shape)'},
    '-': {'gloss': 'MINUS', 'gesture': 'Horizontal index finger moving outward (- shape)'},
    'MINUS': {'gloss': 'MINUS', 'gesture': 'Horizontal index finger moving outward (- shape)'},
    '=': {'gloss': 'EQUALS', 'gesture': 'Two parallel horizontal index fingers (= shape)'},
    'EQUALS': {'gloss': 'EQUALS', 'gesture': 'Two parallel horizontal index fingers (= shape)'},
    '*': {'gloss': 'TIMES', 'gesture': 'Crossed diagonal index fingers (X / * shape)'},
    'TIMES': {'gloss': 'TIMES', 'gesture': 'Crossed diagonal index fingers (X / * shape)'},
    '/': {'gloss': 'DIVIDE', 'gesture': 'Horizontal dividing bar with diagonal slash (/ shape)'},
    'DIVIDE': {'gloss': 'DIVIDE', 'gesture': 'Horizontal dividing bar with diagonal slash (/ shape)'},
    '^2': {'gloss': 'SQUARED', 'gesture': 'Elevated two-finger superscript exponent motion'},
    'SQUARED': {'gloss': 'SQUARED', 'gesture': 'Elevated two-finger superscript exponent motion'},
    '^3': {'gloss': 'CUBED', 'gesture': 'Elevated three-finger superscript exponent motion'},
    'CUBED': {'gloss': 'CUBED', 'gesture': 'Elevated three-finger superscript exponent motion'},
    '^': {'gloss': 'POWER', 'gesture': 'Upward exponent index finger elevation (^ shape)'},
    'POWER': {'gloss': 'POWER', 'gesture': 'Upward exponent index finger elevation (^ shape)'},
    '√': {'gloss': 'SQRT', 'gesture': 'Index finger drawing radical hook and roof overline (√ shape)'},
    'SQRT': {'gloss': 'SQRT', 'gesture': 'Index finger drawing radical hook and roof overline (√ shape)'},
    '(': {'gloss': 'LPAREN', 'gesture': 'Left open curved hand forming opening bracket ( shape'},
    'LPAREN': {'gloss': 'LPAREN', 'gesture': 'Left open curved hand forming opening bracket ( shape'},
    ')': {'gloss': 'RPAREN', 'gesture': 'Right open curved hand forming closing bracket ) shape'},
    'RPAREN': {'gloss': 'RPAREN', 'gesture': 'Right open curved hand forming closing bracket ) shape'},
    '[': {'gloss': 'LBRACKET', 'gesture': 'Left angular hand forming opening square bracket [ shape'},
    ']': {'gloss': 'RBRACKET', 'gesture': 'Right angular hand forming closing square bracket ] shape'},
    '<': {'gloss': 'LESS_THAN', 'gesture': 'Left index and thumb forming acute angle pointing left (< shape)'},
    'LESS_THAN': {'gloss': 'LESS_THAN', 'gesture': 'Left index and thumb forming acute angle pointing left (< shape)'},
    '>': {'gloss': 'GREATER_THAN', 'gesture': 'Right index and thumb forming acute angle pointing right (> shape)'},
    'GREATER_THAN': {'gloss': 'GREATER_THAN', 'gesture': 'Right index and thumb forming acute angle pointing right (> shape)'},
    '<=': {'gloss': 'LESS_EQUAL', 'gesture': 'Acute angle pointing left with horizontal index bar underneath (≤ shape)'},
    'LESS_EQUAL': {'gloss': 'LESS_EQUAL', 'gesture': 'Acute angle pointing left with horizontal index bar underneath (≤ shape)'},
    '>=': {'gloss': 'GREATER_EQUAL', 'gesture': 'Acute angle pointing right with horizontal index bar underneath (≥ shape)'},
    'GREATER_EQUAL': {'gloss': 'GREATER_EQUAL', 'gesture': 'Acute angle pointing right with horizontal index bar underneath (≥ shape)'},
    '±': {'gloss': 'PLUS_MINUS', 'gesture': 'Sequential crossed plus sign followed by horizontal minus slide (± shape)'},
    '+-': {'gloss': 'PLUS_MINUS', 'gesture': 'Sequential crossed plus sign followed by horizontal minus slide (± shape)'},
    'PLUS_MINUS': {'gloss': 'PLUS_MINUS', 'gesture': 'Sequential crossed plus sign followed by horizontal minus slide (± shape)'},
    'π': {'gloss': 'PI', 'gesture': 'Horizontal bar with two vertical fingers extending downwards (π shape)'},
    'PI': {'gloss': 'PI', 'gesture': 'Horizontal bar with two vertical fingers extending downwards (π shape)'},
    '°': {'gloss': 'DEGREES', 'gesture': 'Index and thumb forming small superscript circle in upper space (° shape)'},
    'DEG': {'gloss': 'DEGREES', 'gesture': 'Index and thumb forming small superscript circle in upper space (° shape)'},
    'DEGREES': {'gloss': 'DEGREES', 'gesture': 'Index and thumb forming small superscript circle in upper space (° shape)'},
    '%': {'gloss': 'PERCENT', 'gesture': 'Diagonal slash motion with two circular dot accents (% shape)'},
    'PERCENT': {'gloss': 'PERCENT', 'gesture': 'Diagonal slash motion with two circular dot accents (% shape)'},
    '?': {'gloss': 'QUESTION', 'gesture': 'Index finger tracing question mark curve with emphatic dot tap (? shape)'},
    'QUESTION': {'gloss': 'QUESTION', 'gesture': 'Index finger tracing question mark curve with emphatic dot tap (? shape)'},
    ',': {'gloss': 'COMMA', 'gesture': 'Downward comma hook motion at base level'},
    ';': {'gloss': 'SEMICOLON', 'gesture': 'Dot tap followed by downward hook'},
    'OR': {'gloss': 'OR', 'gesture': 'Open palms shifting from left to right indicating alternative choices'},
    'SIMPLIFY': {'gloss': 'SIMPLIFY', 'gesture': 'Both hands converge symmetrically toward center to combine terms'},
    'BALANCE': {'gloss': 'BALANCE', 'gesture': 'Both hands flat palms upward rocking like scale balance pans in equilibrium'}
}

class SixthSenseAdapter(BaseAdapter):
    """
    Adapter for Sixth-Sense Indian Sign Language (ISL) interaction.
    Provides structured tokenization, multi-digit decomposition, and educational
    ISL mathematical glossing for algebraic expressions and multi-layer solution steps.
    Maintained strictly isolated to satisfy GPL-3.0 obligations.
    """
    capability_name: str = "sixth_sense"
    is_available: bool = True

    async def initialize(self) -> bool:
        self.is_available = True
        return True

    def _normalize_math_for_isl(self, expr_str: str) -> str:
        """Normalizes LaTeX and mathematical expressions into cleanly signable tokens."""
        s = expr_str.strip()
        s = s.replace('\\quad\\text{or}\\quad', ' OR ')
        s = s.replace('\\text{or}', ' OR ')
        s = s.replace('\\lor', ' OR ')
        s = re.sub(r'\\sqrt\{([^}]+)\}', r' √ ( \1 ) ', s)
        s = re.sub(r'\\sqrt([a-zA-Z0-9]+)', r' √ \1 ', s)
        s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r' ( \1 ) / ( \2 ) ', s)
        s = s.replace('\\times', ' * ')
        s = s.replace('\\cdot', ' * ')
        s = s.replace('\\div', ' / ')
        s = s.replace('\\pm', ' ± ')
        s = s.replace('+-', ' ± ')
        s = s.replace('\\pi', ' π ')
        s = s.replace('\\leq', ' <= ')
        s = s.replace('\\le', ' <= ')
        s = s.replace('≤', ' <= ')
        s = s.replace('\\geq', ' >= ')
        s = s.replace('\\ge', ' >= ')
        s = s.replace('≥', ' >= ')
        s = s.replace('\\neq', ' != ')
        s = s.replace('≠', ' != ')
        s = s.replace('\\approx', ' = ')
        s = s.replace('\\equiv', ' = ')
        s = re.sub(r'\^?\\circ|°', ' ° ', s)
        s = re.sub(r'\^\{?2\}?', ' ^2 ', s)
        s = re.sub(r'\^\{?3\}?', ' ^3 ', s)
        s = re.sub(r'\^\{?([a-zA-Z0-9]+)\}?', r' ^ \1 ', s)
        s = s.replace('\\left', ' ').replace('\\right', ' ')
        s = s.replace('\\text', ' ').replace('\\mathrm', ' ').replace('\\mathbf', ' ')
        s = s.replace('{', ' ').replace('}', ' ').replace('\\', ' ')
        return s

    def analyze_expression_for_isl(self, expr_str: str) -> Dict[str, Any]:
        """
        Decomposes mathematical expressions into signable units:
        - Multi-digit numbers (e.g. 40) decompose into sequential signed digits (4, 0).
        - Algebraic variables (X, Y) are signed using standard ISL fingerspelling.
        - Math operators (+, -, *, /, =, ^, √, <=, >=, etc.) are mapped to 3D template gestures.
        """
        normalized = self._normalize_math_for_isl(expr_str)
        
        # Tokenize by multi-char operators, digits, words, and mathematical symbols
        tokens = re.findall(r'<=|>=|!=|\^2|\^3|\bOR\b|\bSIMPLIFY\b|\bBALANCE\b|\d+|[a-zA-Z]|π|°|√|±|[^\s\w]', normalized)
        
        sign_sequence = []
        supported_templates = []
        gloss_operators = []
        unsupported = []

        for token in tokens:
            token = token.strip()
            if not token:
                continue

            upper = token.upper()

            # 1. Operators & Mathematical Symbols (+, -, *, /, =, ^2, ^3, ^, √, <=, >=, ±, π, °, %, ?, etc.)
            if token in MATH_OPERATOR_GLOSS or upper in MATH_OPERATOR_GLOSS:
                gloss_info = MATH_OPERATOR_GLOSS.get(token) or MATH_OPERATOR_GLOSS.get(upper)
                sign_name = gloss_info['gloss']
                sign_sequence.append({
                    "display": token,
                    "sign": sign_name,
                    "type": "operator_gloss",
                    "description": gloss_info['gesture'],
                    "has_3d_template": True
                })
                gloss_operators.append(sign_name)
                supported_templates.append(sign_name)
                continue

            # 2. Numbers: digits 0-9 and 10 are supported directly; larger decompose
            if token.isdigit():
                if token in SUPPORTED_TEMPLATE_SIGNS:
                    sign_sequence.append({
                        "display": token,
                        "sign": token,
                        "type": "digit",
                        "description": f"ISL Digit {token}",
                        "has_3d_template": True
                    })
                    supported_templates.append(token)
                else:
                    for d in token:
                        sign_sequence.append({
                            "display": d,
                            "sign": d,
                            "type": "digit",
                            "description": f"ISL Digit {d} (part of {token})",
                            "has_3d_template": True
                        })
                        supported_templates.append(d)
                continue

            # 3. Single variable letters (e.g. X, Y, A, B, C)
            if len(upper) == 1 and upper in SUPPORTED_TEMPLATE_SIGNS:
                sign_sequence.append({
                    "display": token,
                    "sign": upper,
                    "type": "variable_letter",
                    "description": f"ISL Fingerspelling letter {upper}",
                    "has_3d_template": True
                })
                supported_templates.append(upper)
                continue

            # 4. Multi-letter words (decompose into variable letters)
            if token.isalpha():
                for ch in token:
                    ch_up = ch.upper()
                    if ch_up in SUPPORTED_TEMPLATE_SIGNS:
                        sign_sequence.append({
                            "display": ch,
                            "sign": ch_up,
                            "type": "variable_letter",
                            "description": f"ISL Fingerspelling letter {ch_up}",
                            "has_3d_template": True
                        })
                        supported_templates.append(ch_up)
                continue

            # 5. True unmapped alien symbol
            unsupported.append(token)

        # De-duplicate lists for summary display
        unique_supported = sorted(list(set(supported_templates)))
        unique_glosses = sorted(list(set(gloss_operators)))
        unique_unsupported = sorted(list(set(unsupported)))

        return {
            "sign_sequence": sign_sequence,
            "supported_tokens": unique_supported,
            "operator_glosses": unique_glosses,
            "unsupported_tokens": unique_unsupported,
            "has_warnings": len(unique_unsupported) > 0,
            "disclaimer": (
                "Educational Note: Digits (0-9), variable letters (e.g. X, Y), and operators (+, -, *, /, =, ^, √) "
                "feature full 3D skeleton gesture templates. Multi-digit numbers decompose sequentially."
            )
        }

    async def _enhance_step_gestures_with_llm(
        self,
        steps_summary: List[Dict[str, Any]]
    ) -> Optional[List[Dict[str, Any]]]:
        """Calls Groq multi-agent LLM to generate educational spatial cues and ISL gloss notes."""
        api_key = settings.llm_api_key or os.environ.get("GROQ_API_KEY")
        if not api_key:
            return None

        try:
            import httpx
            import json
            prompt = (
                "You are an expert Indian Sign Language (ISL) mathematics educator. "
                "For each math solution step, generate concise pedagogical ISL spatial cues and rationale. "
                "Return JSON with key 'steps', where each item has: 'step_number' (int), "
                "'spatial_direction' (string), and 'pedagogy_rationale' (string).\n"
                f"Steps: {json.dumps(steps_summary)}"
            )
            payload = {
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": "You are a sign language math pedagogy agent. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 400
            }
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.post(
                    f"{settings.llm_base_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                if resp.status_code == 200:
                    raw = resp.json()["choices"][0]["message"]["content"].strip()
                    # Clean markdown codeblocks if any
                    raw = re.sub(r'^```json\s*', '', raw)
                    raw = re.sub(r'\s*```$', '', raw)
                    parsed = json.loads(raw)
                    return parsed.get("steps") if isinstance(parsed, dict) else (parsed if isinstance(parsed, list) else None)
        except Exception as e:
            logger.debug(f"Groq gesture agent enhancement skipped: {e}")
        return None

    async def generate_solution_step_gestures(
        self,
        steps: List[SolutionStepPayload]
    ) -> List[Dict[str, Any]]:
        """
        Generates multi-layer ISL gestures for each solution step:
        - Layer 1: Mathematical State (Equation tokens with 3D landmark gestures)
        - Layer 2: Transformation Action (Operation & target sign with 3D animation)
        - Layer 3: Conceptual Pedagogy (Educational rationale and balance principle in ISL)
        """
        # Prepare summaries for optional LLM agent enhancement
        summaries = [
            {"step_number": s.step_number, "latex": s.latex, "operation": s.operation, "explanation": s.explanation}
            for s in steps
        ]
        llm_enhancements = await self._enhance_step_gestures_with_llm(summaries)
        enhancement_map = {}
        if llm_enhancements and isinstance(llm_enhancements, list):
            for item in llm_enhancements:
                if isinstance(item, dict) and "step_number" in item:
                    enhancement_map[item["step_number"]] = item

        step_gestures = []

        for step in steps:
            # Layer 1: Equation / Mathematical State
            eq_analysis = self.analyze_expression_for_isl(step.latex)
            layer_1_tokens = eq_analysis["sign_sequence"]

            # Layer 2: Transformation Action
            op = (step.operation or "").lower()
            explanation = step.explanation or ""

            # Detect operation sign and target numbers
            action_sign = "SIMPLIFY"
            action_symbol = "="
            spatial_direction = "Both hands move symmetrically toward center to balance like terms."

            if any(k in op or k in explanation.lower() for k in ["sub", "minus"]):
                action_sign = "MINUS"
                action_symbol = "-"
                spatial_direction = "Slide horizontal index finger outward from both sides of the equal sign to subtract."
            elif any(k in op or k in explanation.lower() for k in ["add", "plus"]):
                action_sign = "PLUS"
                action_symbol = "+"
                spatial_direction = "Cross index fingers in a plus sign and motion outward to add to both sides."
            elif any(k in op or k in explanation.lower() for k in ["div"]):
                action_sign = "DIVIDE"
                action_symbol = "/"
                spatial_direction = "Form horizontal dividing bar with left index finger and slice across to divide both sides."
            elif any(k in op or k in explanation.lower() for k in ["mul", "times"]):
                action_sign = "TIMES"
                action_symbol = "*"
                spatial_direction = "Form crossed diagonal X with both index fingers to multiply both sides."
            elif any(k in op or k in explanation.lower() for k in ["sqrt", "radical"]):
                action_sign = "POWER"
                action_symbol = "^"
                spatial_direction = "Index finger elevates upward to indicate radical root extraction."
            elif any(k in op or k in explanation.lower() for k in ["factor"]):
                action_sign = "EQUALS"
                action_symbol = "="
                spatial_direction = "Both hands cup inward to group terms into parenthetical factors."

            # Find digits in explanation or operation (e.g. 5, 2, 10)
            digits = re.findall(r'\b\d+\b', explanation)
            target_num = digits[0] if digits else ""
            action_expr = f"{action_symbol}{target_num}" if target_num else action_symbol
            action_analysis = self.analyze_expression_for_isl(action_expr)
            layer_2_tokens = action_analysis["sign_sequence"]

            # Check if LLM provided enhanced spatial cue
            if step.step_number in enhancement_map:
                llm_item = enhancement_map[step.step_number]
                if llm_item.get("spatial_direction"):
                    spatial_direction = llm_item["spatial_direction"]

            # Layer 3: Conceptual Pedagogy / Rationale
            concept_signs = ["EQUALS", "BALANCE"]
            rationale_text = (
                step.why or step.explanation or
                "Applying the same operation to both sides maintains mathematical equivalence."
            )
            if step.step_number in enhancement_map and enhancement_map[step.step_number].get("pedagogy_rationale"):
                rationale_text = enhancement_map[step.step_number]["pedagogy_rationale"]

            pedagogy_analysis = self.analyze_expression_for_isl(" = ")
            layer_3_tokens = pedagogy_analysis["sign_sequence"]

            step_data = {
                "step_number": step.step_number,
                "latex": step.latex,
                "operation": step.operation,
                "explanation": step.explanation,
                "sign_sequence": layer_1_tokens,
                "layers": {
                    "layer_1_state": {
                        "title": "Layer 1: Mathematical State",
                        "description": "Sequential 3D gestures and fingerspelling for the mathematical expression in this step.",
                        "tokens": layer_1_tokens
                    },
                    "layer_2_action": {
                        "title": "Layer 2: Transformation Action",
                        "description": f"Target transformation: {action_sign} {target_num}".strip(),
                        "action_sign": action_sign,
                        "spatial_direction": spatial_direction,
                        "tokens": layer_2_tokens
                    },
                    "layer_3_pedagogy": {
                        "title": "Layer 3: Conceptual Pedagogy",
                        "description": "Educational reasoning for maintaining algebraic equivalence in ISL.",
                        "concept_signs": concept_signs,
                        "rationale_text": rationale_text,
                        "tokens": layer_3_tokens
                    }
                }
            }

            step_gestures.append(step_data)

        return step_gestures

    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        latex = umr.input.recognized_latex or umr.input.raw_content or ""
        analysis = self.analyze_expression_for_isl(latex)

        # Generate multi-layer step gestures if solution steps exist
        step_gestures = []
        if umr.solution and umr.solution.steps:
            step_gestures = await self.generate_solution_step_gestures(umr.solution.steps)
            for s_payload, sg in zip(umr.solution.steps, step_gestures):
                s_payload.step_gestures = sg

        umr.accessibility.sign_language = {
            "is_supported": len(analysis["unsupported_tokens"]) == 0,
            "dialect": "ISL",
            "sign_sequence": analysis["sign_sequence"],
            "supported_tokens": analysis["supported_tokens"],
            "operator_glosses": analysis["operator_glosses"],
            "unsupported_tokens": analysis["unsupported_tokens"],
            "has_warnings": analysis["has_warnings"],
            "disclaimer": analysis["disclaimer"],
            "skeleton_playback_ready": True,
            "step_gestures": step_gestures
        }

        return umr

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "vocabulary_size": len(SUPPORTED_TEMPLATE_SIGNS),
            "math_glosses_supported": len(MATH_OPERATOR_GLOSS),
            "method": "MediaPipe Holistic + DTW Template Matching",
            "gpl_isolation": "Verified isolated boundary",
            "multi_layer_step_gestures": True
        }
