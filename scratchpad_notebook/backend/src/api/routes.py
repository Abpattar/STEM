import asyncio
import re
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import sympy as sp

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.solver.schemas import (
    StructuredProblem, RawSolutionStep, SolutionStep,
    OperationType, TopicSupport, Validation, ValidationMethod,
)
from src.practice.schemas import (
    AttemptResult, AttemptClassification, MisconceptionId,
)
from src.solver import solve, verify_step, TopicSupport as SolverTopicSupport
from src.solver.engine import SolverEngine
from src.utils.topic_registry import (
    get_topic_support, is_topic_supported, 
    get_supported_operations, get_all_topics,
    validate_operation_for_topic
)
from src.teaching import enrich_steps, TeachingProviderConfig

router = APIRouter(prefix="/api", tags=["solver"])


class RecognitionCandidate(BaseModel):
    latex: str
    ast_json: Dict[str, Any]
    confidence: float
    bbox: Dict[str, float]
    symbol_confidences: List[Dict[str, Any]] = []


class ClarificationRequest(BaseModel):
    id: str
    question: str
    options: List[Dict[str, Any]] = []
    affected_region: Dict[str, float]
    symbol_in_question: str


class RecognitionResult(BaseModel):
    candidates: List[RecognitionCandidate]
    needs_clarification: bool
    clarification: Optional[ClarificationRequest] = None
    recognized_text: Optional[str] = None
    instruction: Optional[str] = None


class SolveRequest(BaseModel):
    problem: StructuredProblem
    grade: int = Field(default=7, ge=1, le=10)


class SolveResponse(BaseModel):
    steps: List[SolutionStep]
    problem_id: str
    topic: str


class VerifyStepRequest(BaseModel):
    before_ast: Dict[str, Any]
    after_ast: Dict[str, Any]
    operation: OperationType


class VerifyStepResponse(BaseModel):
    validation: Validation


class TopicsResponse(BaseModel):
    topics: Dict[str, TopicSupport]


class RecognizeRequest(BaseModel):
    image_b64: str
    strokes: List[Dict[str, Any]]


class RecognizeTypedRequest(BaseModel):
    text: str


class InterpretRequest(BaseModel):
    candidates: List[RecognitionCandidate]
    instruction: Optional[str] = None


class PracticeAttemptRequest(BaseModel):
    problem: StructuredProblem
    attempt_ast: Dict[str, Any]
    current_step: int = Field(..., ge=0)
    grade: int = Field(default=7, ge=1, le=10)


class PracticeAttemptResponse(BaseModel):
    result: AttemptResult
    next_hint: Optional[str] = None


@router.post("/solve", response_model=SolveResponse)
async def solve_problem(request: SolveRequest):
    """Solve a structured math problem and return verified steps."""
    problem = request.problem
    
    if not is_topic_supported(problem.topic):
        raise HTTPException(
            status_code=400,
            detail=f"Topic '{problem.topic}' is not yet supported. Supported topics: {list(get_all_topics().keys())}"
        )
    
    try:
        raw_steps = solve(problem, grade=request.grade)
        
        if not raw_steps:
            raise HTTPException(status_code=400, detail="Could not generate solution steps")
        
        problem_id = str(uuid.uuid4())[:8]
        
        teaching_config = TeachingProviderConfig()
        enriched_steps = await enrich_steps(problem, raw_steps, request.grade, teaching_config)
        
        def format_solution(expr) -> str:
            if isinstance(expr, sp.Eq):
                return f"{sp.latex(expr.lhs)} = {sp.latex(expr.rhs)}"
            elif isinstance(expr, sp.And):
                return ", ".join(format_solution(arg) for arg in expr.args)
            elif isinstance(expr, sp.Or):
                return " \\quad\\text{or}\\quad ".join(format_solution(arg) for arg in expr.args)
            elif expr is not None:
                return sp.latex(expr)
            return "Solution complete"

        solver_engine = SolverEngine(grade=request.grade)
        for i, step in enumerate(enriched_steps):
            if i == len(enriched_steps) - 1:
                step.is_final_answer = True
                try:
                    last_ast = getattr(raw_steps[-1], 'result_ast', None) or step.equation_ast
                    final_expr = solver_engine._ast_to_sympy(last_ast)
                    step.final_answer_text = format_solution(final_expr)
                except Exception:
                    step.final_answer_text = "Solution complete"
                
                if len(problem.unknowns) >= 2 and problem.problem_type == "equation":
                    target_var = problem.unknowns[0]
                    other_vars = ", ".join(problem.unknowns[1:])
                    note = f" (Note: Since this is 1 equation with 2 variables ({target_var}, {other_vars}), there are infinitely many solutions. {target_var} is expressed in terms of {other_vars}. Providing a second equation or value, like {other_vars} = 5, will give specific numbers)."
                    step.explanation += note
        
        return SolveResponse(
            steps=enriched_steps,
            problem_id=problem_id,
            topic=problem.topic
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver error: {str(e)}")


@router.post("/verify-step", response_model=VerifyStepResponse)
async def verify_step_endpoint(request: VerifyStepRequest):
    """Verify a single transformation step."""
    try:
        validation = verify_step(request.before_ast, request.after_ast, request.operation)
        return VerifyStepResponse(validation=validation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


@router.get("/topics", response_model=TopicsResponse)
async def get_topics():
    """Get all registered topics with their support levels."""
    return TopicsResponse(topics=get_all_topics())


@router.get("/topics/{topic}")
async def get_topic(topic: str):
    """Get support info for a specific topic."""
    support = get_all_topics().get(topic)
    if not support:
        raise HTTPException(status_code=404, detail=f"Topic '{topic}' not found")
    return support


@router.post("/recognize", response_model=RecognitionResult)
async def recognize_handwriting(request: RecognizeRequest):
    """Recognize handwritten math from canvas image + strokes."""
    from src.config import settings
    
    if not request.image_b64:
        return RecognitionResult(
            candidates=[],
            needs_clarification=True,
            clarification=ClarificationRequest(
                id=str(uuid.uuid4())[:8],
                question="No drawing detected on canvas. Please draw your problem first.",
                options=[],
                affected_region={"x": 0, "y": 0, "w": 0, "h": 0},
                symbol_in_question=""
            )
        )
    
    img_data = request.image_b64
    if not img_data.startswith("data:"):
        img_data = f"data:image/png;base64,{img_data}"
    
    api_key = settings.vision_llm_api_key or settings.llm_api_key
    if not api_key:
        return RecognitionResult(
            candidates=[],
            needs_clarification=True,
            clarification=ClarificationRequest(
                id=str(uuid.uuid4())[:8],
                question="Vision recognition API key is not configured.",
                options=[],
                affected_region={"x": 0, "y": 0, "w": 0, "h": 0},
                symbol_in_question=""
            )
        )

    try:
        import httpx

        # Extract raw base64 data and mime type
        if "," in img_data:
            header_part, b64_clean = img_data.split(",", 1)
            mime_match = re.search(r"data:([^;]+);", header_part)
            mime_type = mime_match.group(1) if mime_match else "image/png"
        else:
            b64_clean = img_data
            mime_type = "image/png"

        ocr_prompt = (
            "You are an expert mathematical, handwriting, and geometric drawing OCR reader. Look at the canvas drawing.\n"
            "1. Read all handwritten text, labels, annotations, or questions written in or around the drawing space (e.g. 'Area', 'shortest length', 'longest side', 'perimeter', 'hypotenuse', 'diagonal', 'find x', 'height', 'base', 'radius').\n"
            "2. If it is an algebraic or arithmetic equation/expression, transcribe the math accurately into clean math/LaTeX text (e.g. 'x^2 + \\sqrt{25} + 1/4 = 8' or 'x^2 + 5x + 6 = 0').\n"
            "3. If it is a geometric diagram (triangle, right triangle, square, rectangle, circle, polygon, angles):\n"
            "   - Identify the shape and all labeled side lengths, angles (including 90° right angles), radius, or variables.\n"
            "   - Read any words or questions written in the drawing space (e.g. 'Area', 'shortest length', 'perimeter', 'find hypotenuse', 'diagonal') and incorporate them into the problem statement.\n"
            "   - Formulate as a clean, concise problem statement, for example:\n"
            "     'Right triangle with legs 3 and 4, find Area'\n"
            "     'Triangle with sides 3, 4, 5, find shortest length'\n"
            "     'Triangle with sides 3, 4, 5, find Area'\n"
            "     'Right triangle with angles 38°, 90°, find ?'\n"
            "     'Rectangle with length 8 and width 5, find Area'\n"
            "     'Square with side 6, find Area'\n"
            "     'Circle with radius 5, find circumference'\n"
            "   - If the student drew a shape with measurements but wrote NO question or target (e.g. just a right triangle with 3 and 4, or triangle with sides 3, 4, 5), transcribe the shape and measurements faithfully.\n"
            "4. Output ONLY the transcribed problem text, with no markdown code blocks, quotes, or commentary."
        )

        raw_text = None

        # Method A: Google Gemini generateContent API (supports AQ. and AIza keys directly)
        is_gemini_key = api_key.startswith("AQ.") or api_key.startswith("AIza") or settings.vision_llm_provider == "gemini"
        if is_gemini_key:
            gemini_model = settings.vision_llm_model if "gemini" in settings.vision_llm_model else "gemini-3.5-flash-lite"
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}"
            gemini_payload = {
                "contents": [{
                    "parts": [
                        {"text": ocr_prompt},
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": b64_clean
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 150
                }
            }
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(gemini_url, json=gemini_payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                        raw_text = candidates[0]["content"]["parts"][0].get("text", "").strip()

        # Method B: OpenAI / Groq Compatible chat/completions fallback
        if not raw_text:
            payload = {
                "model": settings.vision_llm_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": ocr_prompt},
                            {"type": "image_url", "image_url": {"url": img_data}}
                        ]
                    }
                ],
                "max_tokens": 120,
                "temperature": 0.1
            }
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MathAI/1.0"
            }
            async with httpx.AsyncClient(timeout=20.0) as client:
                max_retries = 2
                for attempt in range(max_retries):
                    resp = await client.post(
                        f"{settings.vision_llm_base_url}/chat/completions",
                        json=payload,
                        headers=headers
                    )
                    if resp.status_code == 200:
                        raw_text = resp.json()["choices"][0]["message"]["content"].strip()
                        break
                    elif resp.status_code == 429 and attempt < max_retries - 1:
                        await asyncio.sleep(1.5)

        if raw_text:
            raw_text = re.sub(r'^```[a-zA-Z]*\n?', '', raw_text)
            raw_text = re.sub(r'\n?```$', '', raw_text).strip()
            raw_text = raw_text.replace("`", "").strip()
            result = await recognize_typed(RecognizeTypedRequest(text=raw_text))
            result.recognized_text = raw_text
            return result
        else:
            return RecognitionResult(
                candidates=[],
                needs_clarification=True,
                clarification=ClarificationRequest(
                    id=str(uuid.uuid4())[:8],
                    question="Could not clearly read the drawing or expression. Please write clearly or type it below.",
                    options=[],
                    affected_region={"x": 0, "y": 0, "w": 0, "h": 0},
                    symbol_in_question=""
                )
            )
    except Exception as e:
        return RecognitionResult(
            candidates=[],
            needs_clarification=True,
            clarification=ClarificationRequest(
                id=str(uuid.uuid4())[:8],
                question=f"Could not transcribe handwriting: {str(e)}",
                options=[],
                affected_region={"x": 0, "y": 0, "w": 0, "h": 0},
                symbol_in_question=""
            )
        )


async def _extract_equation_from_word_problem(text: str) -> Optional[str]:
    from src.config import settings
    if not settings.llm_api_key:
        return None
    try:
        import httpx
        payload = {
            "model": settings.llm_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a math problem parser. Given a word problem or question, extract the algebraic math equation(s) to solve (e.g. '2*3 + 5*2 = x' or 'x + y = 30; y = 5'). Output ONLY the equation string, without markdown or explanations."
                },
                {"role": "user", "content": text}
            ],
            "temperature": 0.1,
            "max_tokens": 100
        }
        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "User-Agent": "MathAI/1.0"
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(f"{settings.llm_base_url}/chat/completions", json=payload, headers=headers)
            if resp.status_code == 200:
                eq_text = resp.json()["choices"][0]["message"]["content"].strip()
                eq_text = eq_text.replace("`", "").strip()
                return eq_text
    except Exception:
        pass
    return None


@router.post("/recognize-typed", response_model=RecognitionResult)
async def recognize_typed(request: RecognizeTypedRequest):
    """Parse typed math/word problem into structured candidates."""
    text = request.text.strip()
    
    if not text:
        return RecognitionResult(
            candidates=[],
            needs_clarification=False
        )
    
    import re
    # Clean trailing or leading instructions like ", find x and y" or "\nx = ?" or "x = ?; x^2 + y = 30"
    clean_text = text
    instruction = None
    for sep in [";", "\n", ","]:
        if sep in clean_text:
            parts = [p.strip() for p in clean_text.split(sep) if p.strip()]
            if parts and any(kw in parts[-1].lower() for kw in ["find", "solve", "what is", "?", "for "]):
                instruction = parts[-1]
                clean_text = sep.join(parts[:-1]).strip()
                break
            elif parts and any(kw in parts[0].lower() for kw in ["find", "solve", "what is", "?", "for "]):
                instruction = parts[0]
                clean_text = sep.join(parts[1:]).strip()
                break
    
    clean_text = re.sub(r'^(solve|calculate|evaluate|simplify|find)\s+', '', clean_text, flags=re.IGNORECASE).strip()

    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
    transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

    def try_parse_single(s: str) -> Optional[RecognitionCandidate]:
        try:
            s_clean = s.strip()
            # Normalize LaTeX fractions and square roots
            s_clean = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', s_clean)
            s_clean = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', s_clean)
            s_clean = s_clean.replace('\\times', '*').replace('\\div', '/').replace('^', '**')
            if "=" in s_clean and s_clean.count("=") == 1:
                left, right = s_clean.split("=")
                left_expr = parse_expr(left.strip(), transformations=transformations)
                right_expr = parse_expr(right.strip(), transformations=transformations)
                eq = sp.Eq(left_expr, right_expr)
                ast = {"type": "eq", "left": expr_to_ast(left_expr), "right": expr_to_ast(right_expr)}
                return RecognitionCandidate(
                    latex=sp.latex(eq),
                    ast_json=ast,
                    confidence=0.9,
                    bbox={"x": 0, "y": 0, "w": 100, "h": 100},
                    symbol_confidences=[]
                )
            else:
                expr = parse_expr(s_clean, transformations=transformations)
                ast = expr_to_ast(expr)
                return RecognitionCandidate(
                    latex=sp.latex(expr),
                    ast_json=ast,
                    confidence=0.9,
                    bbox={"x": 0, "y": 0, "w": 100, "h": 100},
                    symbol_confidences=[]
                )
        except Exception:
            return None

    # Check for multiple equations (separated by ';' or '\n' or ',' or ' and ')
    lines = [l.strip() for l in re.split(r'[;\n]+|\s+and\s+', clean_text) if l.strip()]
    if len(lines) == 1 and "," in clean_text and clean_text.count("=") >= 2:
        lines = [l.strip() for l in clean_text.split(",") if l.strip()]

    if len(lines) > 1:
        candidates = []
        for line in lines:
            c = try_parse_single(line)
            if c:
                candidates.append(c)
        if len(candidates) == len(lines):
            return RecognitionResult(
                candidates=candidates,
                needs_clarification=False,
                recognized_text=text,
                instruction=instruction
            )

    # First attempt: direct parse of clean text
    candidate = try_parse_single(clean_text)
    
    # Second attempt: LLM word problem extraction if direct parse fails
    if not candidate:
        llm_eq = await _extract_equation_from_word_problem(text)
        if llm_eq:
            candidate = try_parse_single(llm_eq)
    
    if candidate:
        return RecognitionResult(
            candidates=[candidate],
            needs_clarification=False,
            recognized_text=text,
            instruction=instruction
        )
    
    # Third attempt: Universal Math Interpreter for geometry, mensuration, or pedagogical clarification
    from src.orchestrator.universal_interpreter import UniversalMathInterpreter
    interpreter = UniversalMathInterpreter()
    interp = interpreter.interpret(text)

    if interp.get("is_ambiguous"):
        options = [
            {"label": opt, "value": opt}
            for opt in interp.get("clarification_options", [])
        ]
        return RecognitionResult(
            candidates=[],
            needs_clarification=True,
            clarification=ClarificationRequest(
                id=str(uuid.uuid4())[:8],
                question=interp.get("clarification_question") or f"What would you like to calculate for '{text}'?",
                options=options,
                affected_region={"x": 0, "y": 0, "w": 0, "h": 0},
                symbol_in_question=text[:50]
            ),
            recognized_text=text
        )

    if interp.get("domain") != "unknown" and (interp.get("ast") or interp.get("geometry_problem") or interp.get("mensuration_problem")):
        candidate = RecognitionCandidate(
            latex=interp.get("latex", text),
            ast_json=interp.get("ast") or {"type": "universal", "domain": interp.get("domain")},
            confidence=0.95,
            bbox={"x": 0, "y": 0, "w": 100, "h": 100},
            symbol_confidences=[]
        )
        return RecognitionResult(
            candidates=[candidate],
            needs_clarification=False,
            recognized_text=text,
            instruction=instruction
        )
    
    # Pedagogical clarification options when completely ambiguous
    return RecognitionResult(
        candidates=[],
        needs_clarification=True,
        clarification=ClarificationRequest(
            id=str(uuid.uuid4())[:8],
            question=f"I couldn't quite determine the exact math goal for '{text}'. What would you like to do?",
            options=[
                {"label": "Solve for x", "value": text},
                {"label": "Calculate Area / Perimeter", "value": f"{text}, find area"},
                {"label": "Simplify Expression", "value": text}
            ],
            affected_region={"x": 0, "y": 0, "w": 0, "h": 0},
            symbol_in_question=text[:50]
        ),
        recognized_text=text
    )


def expr_to_ast(expr) -> dict:
    """Convert sympy expression to AST dict."""
    from sympy import Eq
    
    if isinstance(expr, sp.Number):
        return {"type": "number", "value": float(expr)}
    
    if expr.is_Symbol:
        return {"type": "symbol", "name": str(expr)}
    
    if isinstance(expr, sp.Add):
        return {"type": "add", "args": [expr_to_ast(arg) for arg in expr.args]}
    
    if isinstance(expr, sp.Mul):
        return {"type": "mul", "args": [expr_to_ast(arg) for arg in expr.args]}
    
    if isinstance(expr, sp.Pow):
        base, exp = expr.args
        return {"type": "pow", "base": expr_to_ast(base), "exp": expr_to_ast(exp)}
    
    if isinstance(expr, sp.Sub):
        args = [expr_to_ast(arg) for arg in expr.args]
        return {"type": "sub", "args": args}
    
    if isinstance(expr, sp.Div):
        args = [expr_to_ast(arg) for arg in expr.args]
        return {"type": "div", "args": args}
    
    if isinstance(expr, Eq):
        return {"type": "eq", "left": expr_to_ast(expr.lhs), "right": expr_to_ast(expr.rhs)}
    
    if hasattr(expr, 'func') and expr.func == sp.sqrt:
        return {"type": "sqrt", "arg": expr_to_ast(expr.args[0])}
    
    if hasattr(expr, 'func') and expr.func == sp.Abs:
        return {"type": "abs", "arg": expr_to_ast(expr.args[0])}
    
    if hasattr(expr, 'func'):
        return {
            "type": "function",
            "name": expr.func.__name__.lower(),
            "args": [expr_to_ast(arg) for arg in expr.args]
        }
    
    return {"type": "number", "value": 0}


@router.post("/interpret")
async def interpret_problem(request: InterpretRequest):
    """Interpret recognition candidates into a structured problem."""
    if not request.candidates:
        raise HTTPException(status_code=400, detail="No candidates provided")
    
    def find_symbols(ast_dict: dict) -> set:
        symbols = set()
        if ast_dict.get("type") == "symbol":
            symbols.add(ast_dict.get("name"))
        for key, val in ast_dict.items():
            if isinstance(val, dict):
                symbols.update(find_symbols(val))
            elif isinstance(val, list):
                for item in val:
                    if isinstance(item, dict):
                        symbols.update(find_symbols(item))
        return symbols

    if len(request.candidates) > 1:
        problem_type = "system"
        topic = "systems_2var"
        expressions = [{"ast_json": c.ast_json, "latex": c.latex} for c in request.candidates]
        all_symbols = set()
        for c in request.candidates:
            all_symbols.update(find_symbols(c.ast_json))
        unknowns = sorted(list(all_symbols))
        return StructuredProblem(
            problem_type=problem_type,
            expressions=expressions,
            unknowns=unknowns,
            given_values={},
            constraints=[],
            requested_operation="solve",
            topic=topic,
            units={},
            grade_hint=8,
            source="mixed"
        )

    best_candidate = max(request.candidates, key=lambda c: c.confidence)
    
    ast = best_candidate.ast_json
    
    problem_type = "equation"
    unknowns = []
    given_values = {}
    
    def find_symbols(ast_dict: dict) -> set:
        symbols = set()
        if ast_dict.get("type") == "symbol":
            symbols.add(ast_dict.get("name"))
        for key, val in ast_dict.items():
            if isinstance(val, dict):
                symbols.update(find_symbols(val))
            elif isinstance(val, list):
                for item in val:
                    if isinstance(item, dict):
                        symbols.update(find_symbols(item))
        return symbols
    
    all_symbols = find_symbols(ast)
    unknowns = sorted(list(all_symbols))
    
    if request.instruction:
        import re
        match = re.search(r'([a-zA-Z])\s*=\s*\?', request.instruction)
        if not match:
            match = re.search(r'(?:find|solve\s+for|for)\s+([a-zA-Z])\b', request.instruction, re.IGNORECASE)
        if match:
            target_var = match.group(1).lower()
            matching_var = next((u for u in unknowns if u.lower() == target_var), None)
            if matching_var:
                unknowns.remove(matching_var)
                unknowns.insert(0, matching_var)
    
    if ast.get("type") == "eq" or "=" in best_candidate.latex or "=" in str(ast):
        problem_type = "equation"
        
        def has_pow2(d: Any) -> bool:
            if isinstance(d, dict):
                if d.get("type") == "pow" and isinstance(d.get("exp"), dict) and d.get("exp", {}).get("value") == 2:
                    return True
                return any(has_pow2(v) for v in d.values())
            elif isinstance(d, list):
                return any(has_pow2(v) for v in d)
            return False
            
        topic = "quadratic_equations" if has_pow2(ast) else "linear_equations"
    else:
        problem_type = "expression"
        topic = "expressions"
    
    math_expr = {"ast_json": ast, "latex": best_candidate.latex}
    
    problem = StructuredProblem(
        problem_type=problem_type,
        expressions=[math_expr],
        unknowns=unknowns,
        given_values=given_values,
        constraints=[],
        requested_operation="solve",
        topic=topic,
        units={},
        grade_hint=None,
        source="typed"
    )
    
    return problem


@router.post("/practice/attempt", response_model=PracticeAttemptResponse)
async def practice_attempt(request: PracticeAttemptRequest):
    """Check a student's practice attempt."""
    from src.practice.attempt_checker import AttemptChecker
    from src.solver.schemas import StructuredProblem
    
    problem = request.problem
    attempt_ast = request.attempt_ast
    current_step = request.current_step
    grade = request.grade
    
    if not problem.expressions:
        raise HTTPException(status_code=400, detail="No problem expressions")
    
    expected_ast = problem.expressions[0].get("ast_json", {})
    
    checker = AttemptChecker(grade=grade)
    result = checker.check_attempt(problem, attempt_ast, expected_ast, current_step)
    
    # Get next hint
    from src.practice.hint_ladder import get_next_hint_level
    next_hint = None
    if result.hint_level < 4:
        next_hint_level = get_next_hint_level(result.hint_level)
        # In practice, we'd get the actual hint text
        # For now, return a placeholder
        next_hint = "Next hint available"
    
    return PracticeAttemptResponse(result=result, next_hint=next_hint)


@router.post("/practice/hint")
async def get_practice_hint(
    problem: StructuredProblem,
    current_step: int = Query(..., ge=0),
    student_attempt: Optional[Dict] = None,
    grade: int = Query(7, ge=1, le=10),
    hint_level: int = Query(1, ge=1, le=4),
):
    """Get the requested hint level (1-4) for a practice attempt."""
    from src.practice.hint_ladder import generate_hint_ladder, should_reveal_step

    first_expr = problem.expressions[0] if problem.expressions else {}
    expr_latex = first_expr.get("latex", "") if isinstance(first_expr, dict) else ""
    expr_ast = first_expr.get("ast_json", {}) if isinstance(first_expr, dict) else {}

    step_operation = problem.requested_operation or "solve"
    step_explanation = (
        first_expr.get("explanation", "")
        if isinstance(first_expr, dict)
        else ""
    )
    step_validation = Validation(
        is_valid=True,
        method=ValidationMethod.MANUAL,
        details="Practice hint step context",
    )

    if not step_explanation and expr_ast:
        try:
            raw_steps = solve(problem, grade)
            if raw_steps:
                target_idx = min(current_step, len(raw_steps) - 1)
                raw_step = raw_steps[target_idx]
                step_operation = raw_step.operation.value
                step_validation = raw_step.validation
                step_explanation = (
                    f"Apply '{raw_step.operation.value.replace('_', ' ')}' symmetrically to both sides."
                )
        except Exception:
            pass

    if not step_explanation:
        step_explanation = (
            f"Apply the inverse operation for '{step_operation.replace('_', ' ')}' to both sides."
        )

    step = SolutionStep(
        step_number=current_step if current_step > 0 else 1,
        operation=step_operation,
        equation_ast=expr_ast if isinstance(expr_ast, dict) else {},
        display_math=expr_latex,
        explanation=step_explanation,
        validation=step_validation,
        hint="",
        is_final_answer=False,
        final_answer_text="",
        diagram_focus=[],
        diagram_type="none",
    )

    hint = generate_hint_ladder(
        step,
        problem,
        grade,
        current_hint_level=hint_level,
    )
    return {
        "hint": hint,
        "level": hint_level,
        "show_step_allowed": should_reveal_step(hint_level),
    }


# History endpoints
from src.practice.schemas import SavedProblem
from src.practice.history import HistoryProvider

@router.get("/history", response_model=List[SavedProblem])
async def list_history():
    """List all saved problems."""
    history = HistoryProvider()
    return history.get_saved_problems()


class SaveProblemRequest(BaseModel):
    problem_data: dict
    solution_steps: List
    practice_summary: dict
    topic: str
    grade: int


@router.post("/history", response_model=SavedProblem)
async def save_problem(request: SaveProblemRequest):
    """Save a problem to history (opt-in)."""
    from src.solver.schemas import StructuredProblem, SolutionStep
    from src.practice.history import HistoryProvider
    
    history = HistoryProvider()
    problem = StructuredProblem(**request.problem_data)
    steps = [SolutionStep(**s) for s in request.solution_steps]
    saved = history.save_problem(problem, steps, request.practice_summary, request.topic, request.grade)
    return saved


@router.delete("/history/{problem_id}")
async def delete_problem(problem_id: str):
    """Delete a saved problem."""
    history = HistoryProvider()
    success = history.delete_problem(problem_id)
    if not success:
        raise HTTPException(status_code=404, detail="Problem not found")
    return {"success": True}


@router.delete("/history")
async def delete_all_history():
    """Delete all saved problems."""
    history = HistoryProvider()
    count = history.delete_all_problems()
    return {"deleted_count": count}


@router.get("/history/{problem_id}", response_model=SavedProblem)
async def get_saved_problem(problem_id: str):
    """Get a saved problem (read-only view)."""
    history = HistoryProvider()
    problem = history.get_saved_problem(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


# Analytics endpoint
@router.get("/analytics")
async def get_analytics():
    """Get privacy-conscious analytics metrics (admin only)."""
    # In production, this would require admin authentication
    return {
        "total_sessions": 0,
        "total_problems_solved": 0,
        "average_hints_used": 0,
        "top_misconceptions": [],
        "topics_practiced": {},
        "note": "Privacy-conscious counters only. No student content stored."
    }


class VoiceNormalizeRequest(BaseModel):
    transcript: str


@router.post("/voice/normalize")
async def normalize_voice_input(request: VoiceNormalizeRequest):
    """Normalize spoken mathematical expressions into standardized LaTeX and algebra."""
    from src.voice.math_normalizer import normalize_voice_transcript
    result = normalize_voice_transcript(request.transcript)
    return result


class ConceptReviewRequest(BaseModel):
    concept_id: str
    is_correct: bool = True
    elapsed_days: float = 1.0
    current_state: Optional[Dict[str, Any]] = None


@router.post("/learning/review")
async def review_concept_endpoint(request: ConceptReviewRequest):
    """Update student concept mastery using FSRS-6 spaced repetition algorithm."""
    from src.learning.fsrs import FSRS6Engine
    engine = FSRS6Engine()
    result = engine.review_concept(
        concept_id=request.concept_id,
        is_correct=request.is_correct,
        elapsed_days=request.elapsed_days,
        current_state=request.current_state
    )
    return result

