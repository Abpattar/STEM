# AI Math Notebook - Implementation Plan

## 1. Architecture Overview

### 1.1 High-Level Pipeline (PRD Section 6.1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                                 │
│  Canvas (strokes) ──▶ Typed Input ──▶ Instructions ("find x")      │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       RECOGNITION LAYER                             │
│  Vision LLM (handwriting) ──▶ Structured candidates + confidence   │
│  Text parser (typed) ──────▶ Same candidate format                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INTERPRETATION LAYER                           │
│  Problem classification, known/unknown extraction, intent, units   │
│  Output: StructuredProblem (validated by pydantic)                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SOLVE / VERIFY LAYER                           │
│  SymPy solver ──▶ Step operations with verification ──▶ Solution   │
│  Output: List[SolutionStep] (each step validated)                  │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       TEACHING LAYER                                │
│  LLM (strict JSON) ──▶ Explanations, hints, method selection       │
│  Output: Enriched SolutionStep with grade-appropriate text         │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       RENDERING LAYER                               │
│  KaTeX ──▶ Notebook Mode / Textbook Mode (same math, diff style)   │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       INTERACTION LAYER                             │
│  Progressive reveal, hint, practice mode, retry                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Module Boundaries & Interfaces

| Module | Responsibility | Input | Output |
|--------|---------------|-------|--------|
| `recognition` | Handwriting → structured candidates | Canvas image + strokes OR typed text | `List[RecognitionCandidate]` |
| `interpretation` | Candidates → structured problem | `RecognitionResult` | `StructuredProblem` |
| `solver` | SymPy solving + step verification | `StructuredProblem` | `List[RawSolutionStep]` |
| `teaching` | LLM explanations + hints | `StructuredProblem` + `RawSolutionStep` | `List[SolutionStep]` |
| `rendering` | KaTeX + mode styling | `List[SolutionStep]` + mode | HTML/React elements |
| `topic_registry` | Support status per topic | Topic string | `SupportLevel` |

### 1.3 Data Flow Rules (Non-Negotiable)

1. **Structured expressions only** - Never pass display strings between layers. The `equation_ast` (SymPy expression or custom AST) is the source of truth.
2. **LLM never calculates** - SymPy performs ALL transformations and verification. LLM only writes explanations and chooses methods.
3. **Strict JSON for LLM** - All LLM outputs validated by pydantic schemas before use.
4. **Confidence-driven clarification** - Recognition confidence < threshold → clarification UI, never silent guess.
5. **Verification per step** - Each transformation checked for mathematical equivalence. Failed step → regenerate (max 2 retries) → honest error.

---

## 2. JSON Schemas (PRD Section 6.2)

### 2.1 Recognition Candidate

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RecognitionCandidate",
  "type": "object",
  "required": ["latex", "ast_json", "confidence", "bbox", "symbol_confidences"],
  "properties": {
    "latex": {"type": "string", "description": "LaTeX for display/debug only"},
    "ast_json": {"type": "object", "description": "Structured expression as JSON-serializable AST"},
    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    "bbox": {"type": "object", "properties": {"x": {"type": "number"}, "y": {"type": "number"}, "w": {"type": "number"}, "h": {"type": "number"}}},
    "symbol_confidences": {"type": "array", "items": {"type": "object", "properties": {"symbol": {"type": "string"}, "confidence": {"type": "number"}, "position": {"type": "object"}}, "required": ["symbol", "confidence"]}}
  }
}
```

### 2.2 StructuredProblem (Interpretation Output)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "StructuredProblem",
  "type": "object",
  "required": ["problem_type", "expressions", "unknowns", "given_values", "constraints", "requested_operation", "topic"],
  "properties": {
    "problem_type": {"type": "string", "enum": ["equation", "system", "expression", "word_problem", "inequality"]},
    "expressions": {"type": "array", "items": {"$ref": "#/definitions/MathExpression"}},
    "unknowns": {"type": "array", "items": {"type": "string"}},
    "given_values": {"type": "object", "additionalProperties": {"$ref": "#/definitions/MathExpression"}},
    "constraints": {"type": "array", "items": {"type": "string"}},
    "requested_operation": {"type": "string", "enum": ["solve", "simplify", "evaluate", "factor", "expand", "substitute"]},
    "topic": {"type": "string"},
    "units": {"type": "object", "additionalProperties": {"type": "string"}},
    "grade_hint": {"type": "integer", "minimum": 1, "maximum": 10},
    "source": {"type": "string", "enum": ["handwriting", "typed", "mixed"]}
  },
  "definitions": {
    "MathExpression": {
      "type": "object",
      "required": ["ast_json", "latex"],
      "properties": {
        "ast_json": {"type": "object"},
        "latex": {"type": "string"}
      }
    }
  }
}
```

### 2.3 RawSolutionStep (Solver Output, before teaching)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RawSolutionStep",
  "type": "object",
  "required": ["step_number", "operation", "equation_ast", "validation"],
  "properties": {
    "step_number": {"type": "integer", "minimum": 1},
    "operation": {"type": "string", "enum": ["substitute", "subtract_both_sides", "add_both_sides", "multiply_both_sides", "divide_both_sides", "expand", "factorise", "simplify", "combine_like_terms", "isolate_variable", "quadratic_formula", "completing_square", "cross_multiply", "find_common_denominator", "convert_decimal", "convert_percentage", "unit_conversion"]},
    "equation_ast": {"type": "object", "description": "Structured expression before this step"},
    "result_ast": {"type": "object", "description": "Structured expression after this step"},
    "validation": {"type": "object", "required": ["is_valid", "method"], "properties": {"is_valid": {"type": "boolean"}, "method": {"type": "string", "enum": ["substitution", "equivalence_check", "sympy_verify", "manual"]}, "details": {"type": "string"}}},
    "from_step": {"type": "integer", "description": "Previous step this derives from"}
  }
}
```

### 2.4 SolutionStep (Final Output for Rendering)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SolutionStep",
  "type": "object",
  "required": ["step_number", "operation", "equation_ast", "display_math", "explanation", "validation", "hint"],
  "properties": {
    "step_number": {"type": "integer", "minimum": 1},
    "operation": {"type": "string"},
    "equation_ast": {"type": "object"},
    "display_math": {"type": "string", "description": "KaTeX-ready LaTeX generated from equation_ast"},
    "explanation": {"type": "string", "maxLength": 300},
    "validation": {"$ref": "#/definitions/Validation"},
    "hint": {"type": "string", "maxLength": 200},
    "is_final_answer": {"type": "boolean", "default": false},
    "final_answer_text": {"type": "string"}
  },
  "definitions": {
    "Validation": {"type": "object", "required": ["is_valid", "method"], "properties": {"is_valid": {"type": "boolean"}, "method": {"type": "string"}, "details": {"type": "string"}}}
  }
}
```

### 2.5 Clarification Request

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ClarificationRequest",
  "type": "object",
  "required": ["id", "question", "options", "affected_region"],
  "properties": {
    "id": {"type": "string"},
    "question": {"type": "string"},
    "options": {"type": "array", "items": {"type": "object", "properties": {"label": {"type": "string"}, "latex": {"type": "string"}, "ast_json": {"type": "object"}}, "required": ["label", "latex"]}},
    "affected_region": {"type": "object", "properties": {"x": {"type": "number"}, "y": {"type": "number"}, "w": {"type": "number"}, "h": {"type": "number"}}},
    "symbol_in_question": {"type": "string"}
  }
}
```

### 2.6 Topic Support Registry Entry

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TopicSupport",
  "type": "object",
  "required": ["topic", "level", "supported_operations", "grade_range", "test_status"],
  "properties": {
    "topic": {"type": "string"},
    "level": {"type": "string", "enum": ["full", "limited", "unsupported"]},
    "supported_operations": {"type": "array", "items": {"type": "string"}},
    "grade_range": {"type": "array", "items": {"type": "integer"}, "minItems": 2, "maxItems": 2},
    "test_status": {"type": "string", "enum": ["passed", "pending", "failed"]},
    "limitations": {"type": "array", "items": {"type": "string"}}
  }
}
```

---

## 3. Module Interfaces (Python)

### 3.1 Recognition Module (`backend/recognition/`)

```python
# backend/recognition/interface.py
from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel

class RecognitionCandidate(BaseModel):
    latex: str
    ast_json: dict
    confidence: float
    bbox: dict
    symbol_confidences: List[dict]

class RecognitionResult(BaseModel):
    candidates: List[RecognitionCandidate]
    needs_clarification: bool
    clarification: Optional[ClarificationRequest] = None

class RecognitionProvider(ABC):
    @abstractmethod
    async def recognize(self, image_b64: str, strokes: List[dict]) -> RecognitionResult:
        """Recognize handwritten math from canvas image + stroke data."""
        ...

    @abstractmethod
    async def recognize_typed(self, text: str) -> RecognitionResult:
        """Parse typed math/word problem into same candidate format."""
        ...
```

### 3.2 Interpretation Module (`backend/interpretation/`)

```python
# backend/interpretation/interface.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Dict, List, Optional

class MathExpression(BaseModel):
    ast_json: dict
    latex: str

class StructuredProblem(BaseModel):
    problem_type: str  # equation, system, expression, word_problem, inequality
    expressions: List[MathExpression]
    unknowns: List[str]
    given_values: Dict[str, MathExpression]
    constraints: List[str]
    requested_operation: str  # solve, simplify, evaluate, factor, expand, substitute
    topic: str
    units: Dict[str, str] = {}
    grade_hint: Optional[int] = None
    source: str  # handwriting, typed, mixed

class InterpretationProvider(ABC):
    @abstractmethod
    async def interpret(self, candidates: List[RecognitionCandidate], instruction: Optional[str] = None) -> StructuredProblem:
        """Convert recognition candidates + optional instruction into structured problem."""
        ...
```

### 3.3 Solver Module (`backend/solver/`)

```python
# backend/solver/interface.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import List

class Validation(BaseModel):
    is_valid: bool
    method: str  # substitution, equivalence_check, sympy_verify, manual
    details: str = ""

class RawSolutionStep(BaseModel):
    step_number: int
    operation: str
    equation_ast: dict
    result_ast: dict
    validation: Validation
    from_step: int

class SolverProvider(ABC):
    @abstractmethod
    def solve(self, problem: StructuredProblem) -> List[RawSolutionStep]:
        """Generate verified solution steps using SymPy."""
        ...
    
    @abstractmethod
    def verify_step(self, before_ast: dict, after_ast: dict, operation: str) -> Validation:
        """Verify a single transformation is mathematically valid."""
        ...
```

### 3.4 Teaching Module (`backend/teaching/`)

```python
# backend/teaching/interface.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import List, Optional

class SolutionStep(BaseModel):
    step_number: int
    operation: str
    equation_ast: dict
    display_math: str  # KaTeX LaTeX
    explanation: str
    validation: Validation
    hint: str
    is_final_answer: bool = False
    final_answer_text: str = ""

class TeachingProvider(ABC):
    @abstractmethod
    async def enrich_steps(self, problem: StructuredProblem, raw_steps: List[RawSolutionStep], grade: int) -> List[SolutionStep]:
        """Add explanations, hints, grade-appropriate language to verified steps."""
        ...
    
    @abstractmethod
    async def generate_hint(self, problem: StructuredProblem, current_step: int, student_attempt: Optional[dict] = None) -> str:
        """Generate a hint for guided practice."""
        ...
```

### 3.5 Rendering Module (`frontend/src/rendering/`)

```typescript
// frontend/src/rendering/types.ts
export interface SolutionStep {
  step_number: number;
  operation: string;
  equation_ast: any; // structured expression
  display_math: string; // KaTeX LaTeX
  explanation: string;
  validation: Validation;
  hint: string;
  is_final_answer: boolean;
  final_answer_text: string;
}

export type DisplayMode = 'notebook' | 'textbook';

export interface RenderingOptions {
  mode: DisplayMode;
  grade: number;
  fontSize?: number;
}

export function renderStep(step: SolutionStep, options: RenderingOptions): React.ReactElement;
export function renderMath(latex: string, options: RenderingOptions): React.ReactElement;
```

### 3.6 Topic Registry (`backend/topic_registry/`)

```python
# backend/topic_registry/registry.py
from enum import Enum
from pydantic import BaseModel
from typing import List, Dict

class SupportLevel(str, Enum):
    FULL = "full"
    LIMITED = "limited"
    UNSUPPORTED = "unsupported"

class TopicSupport(BaseModel):
    topic: str
    level: SupportLevel
    supported_operations: List[str]
    grade_range: List[int]  # [min, max]
    test_status: str  # passed, pending, failed
    limitations: List[str] = []

TOPIC_REGISTRY: Dict[str, TopicSupport] = {
    "arithmetic": TopicSupport(topic="arithmetic", level=SupportLevel.FULL, supported_operations=["add", "subtract", "multiply", "divide"], grade_range=[1, 4], test_status="pending"),
    "fractions": TopicSupport(topic="fractions", level=SupportLevel.FULL, supported_operations=["add", "subtract", "multiply", "divide", "simplify", "convert_decimal"], grade_range=[3, 7], test_status="pending"),
    "decimals": TopicSupport(topic="decimals", level=SupportLevel.FULL, supported_operations=["add", "subtract", "multiply", "divide", "convert_fraction"], grade_range=[4, 7], test_status="pending"),
    "percentages": TopicSupport(topic="percentages", level=SupportLevel.FULL, supported_operations=["of", "increase", "decrease", "reverse", "convert"], grade_range=[5, 8], test_status="pending"),
    "linear_equations": TopicSupport(topic="linear_equations", level=SupportLevel.FULL, supported_operations=["solve", "substitute", "rearrange"], grade_range=[6, 10], test_status="pending"),
    "systems_2var": TopicSupport(topic="systems_2var", level=SupportLevel.FULL, supported_operations=["substitution", "elimination"], grade_range=[8, 10], test_status="pending"),
    "word_problems_price_qty": TopicSupport(topic="word_problems_price_qty", level=SupportLevel.FULL, supported_operations=["extract_model", "solve"], grade_range=[3, 7], test_status="pending"),
}
```

---

## 4. Phase 0 - Prototype Plan

### 4.1 Scope
- Canvas: draw, erase, undo, redo, clear; responsive; touch-action handled
- Typed input box (equations and word problems) + optional instruction field
- KaTeX rendering of hard-coded samples
- Notebook Mode / Textbook Mode toggle
- FastAPI health endpoint; frontend talks to it

### 4.2 Frontend Structure (`/frontend`)

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── MathCanvas.tsx      # Drawing canvas with pointer events
│   │   ├── TypedInput.tsx      # Text input for equations/word problems
│   │   ├── InstructionInput.tsx # "find x" field
│   │   ├── ModeToggle.tsx      # Notebook/Textbook switch
│   │   ├── MathDisplay.tsx     # KaTeX rendering component
│   │   ├── Toolbar.tsx         # Draw/Erase/Undo/Redo/Clear
│   │   └── SampleEquations.tsx # Hard-coded samples for Phase 0
│   ├── hooks/
│   │   ├── useCanvas.ts        # Canvas state management
│   │   ├── useStrokes.ts       # Stroke history (undo/redo)
│   │   └── useTouchAction.ts   # Prevent scroll on mobile
│   ├── utils/
│   │   ├── strokeToImage.ts    # Canvas → base64 PNG
│   │   └── katexRender.ts      # KaTeX wrapper
│   ├── types/
│   │   └── canvas.ts           # Stroke, Point types
│   └── styles/
│       ├── globals.css
│       ├── canvas.css
│       ├── notebook.css
│       └── textbook.css
└── public/
```

### 4.3 Backend Structure (`/backend`)

```
backend/
├── pyproject.toml
├── .env.example
├── src/
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Settings from env
│   ├── api/
│   │   ├── health.py           # GET /health
│   │   └── routes.py           # API router
│   └── utils/
│       └── katex_samples.py    # Hard-coded sample equations
└── tests/
    ├── test_health.py
    └── test_rendering.py
```

### 4.4 Key Implementation Details

**Canvas (React + TypeScript)**
- HTML5 `<canvas>` with `touch-action: none` to prevent scroll
- Pointer events (`pointerdown`, `pointermove`, `pointerup`) for unified mouse/touch/stylus
- Stroke stored as `{ points: [{x, y, pressure?}], tool: 'pen'|'eraser', color, width }`
- Undo/redo via stroke history arrays (max 100)
- Responsive: canvas resizes with container, maintains aspect ratio, re-renders strokes

**KaTeX Samples (Hard-coded for Phase 0)**
1. Stacked fraction: `\frac{x + 1}{2} = 3`
2. Power: `x^2 + 5x + 6 = 0`
3. Root: `\sqrt{x + 4} = 3`
4. Integral with bounds: `\int_{0}^{5} x^2 \, dx`
5. Aligned multi-line:
```
\begin{aligned}
x + 3 &= 7 \\
x &= 7 - 3 \\
x &= 4
\end{aligned}
```

**Mode Toggle**
- Notebook: handwriting-style font for explanations, subtle grid background, slightly larger math
- Textbook: Computer Modern / Latin Modern fonts, standard spacing, no grid
- Same KaTeX output, different CSS variables

---

## 5. Phase 1 - Reliable Core Plan

### 5.1 Topics (from PRD)
1. Arithmetic
2. Fractions
3. Decimals
4. Percentages
5. One-variable linear equations
6. Simple 2-variable systems by substitution
7. Price × quantity word problem

### 5.2 Pipeline Implementation

| Stage | Module | Key Tasks |
|-------|--------|-----------|
| Recognition | `recognition` | Vision LLM provider (OpenAI-compatible), typed parser, confidence scoring, clarification generation |
| Interpretation | `interpretation` | Problem classification, unknown extraction, unit handling, word problem → math model |
| Solver | `solver` | SymPy integration, step generation per operation type, verification per step, retry logic |
| Teaching | `teaching` | LLM provider (strict JSON), grade-aware prompts, explanation/hint generation |
| Rendering | `rendering` | KaTeX + mode CSS, progressive reveal UI, final answer highlighting |
| Topic Registry | `topic_registry` | Registry with support levels, validation against registry |

### 5.3 API Endpoints

```
POST /api/recognize       # Canvas image + strokes → RecognitionResult
POST /api/interpret       # RecognitionResult + instruction → StructuredProblem
POST /api/solve           # StructuredProblem → List[SolutionStep]
POST /api/hint            # Problem + current_step + attempt → hint
GET  /api/topics          # Topic registry
GET  /health              # Health check
```

### 5.4 Acceptance Tests (from PRD Table 20)

| Test ID | Scenario | Implementation |
|---------|----------|----------------|
| AT-001 | x+y=20, y=3, find x | System test: recognition → interpretation → solve → verify x=17 |
| AT-003 | Fraction (x+1)/2=3 | Render test: KaTeX outputs stacked fraction |
| AT-006 | Ambiguous x vs × | Recognition confidence < 0.7 → clarification UI |
| AT-007 | Price × quantity word problem | Typed input → interpretation extracts 5×4=20 |
| AT-010 | Network interruption | Frontend retains canvas state, retry button |
| AT-011 | Mobile narrow screen | E2E test at 375px viewport |
| AT-012 | Insufficient information | Interpretation detects missing values → asks |

### 5.5 Regression Test Set

```
tests/regression/
├── arithmetic/
│   ├── test_basic_ops.py
│   └── fixtures.json
├── fractions/
│   ├── test_fraction_ops.py
│   └── fixtures.json
├── linear_equations/
│   ├── test_one_var.py
│   └── fixtures.json
├── systems/
│   ├── test_substitution.py
│   └── fixtures.json
├── word_problems/
│   ├── test_price_qty.py
│   └── fixtures.json
└── raw_syntax_scan.py  # Scans output for ^, \frac, sqrt(, etc.
```

---

## 6. Test Plan

### 6.1 Unit Tests (per module)

| Module | Tests |
|--------|-------|
| `recognition` | Confidence threshold logic, clarification generation, typed parser |
| `interpretation` | Problem classification, unknown extraction, word problem parsing |
| `solver` | Each operation type, verification methods, retry logic, edge cases (no solution, infinite) |
| `teaching` | JSON schema validation, grade-level prompts, hint generation |
| `topic_registry` | Level lookup, operation support check, grade range validation |

### 6.2 Integration Tests

- Full pipeline: canvas → recognition → interpretation → solve → teach → render
- Clarification flow: low confidence → UI → user selects → pipeline continues
- Mode switch: same steps, different CSS
- Network failure: canvas preserved, retry works

### 6.3 E2E Tests (Playwright)

- AT-001 through AT-012 from PRD
- Mobile viewport (375px, 768px, 1024px)
- Touch interaction (draw, erase, undo)
- Accessibility (keyboard navigation, contrast, labels)

### 6.4 Raw Syntax Scan Test

```python
# tests/raw_syntax_scan.py
FORBIDDEN_PATTERNS = [
    r'\^',           # caret powers
    r'\\frac',       # raw LaTeX fraction
    r'sqrt\(',       # raw sqrt function
    r'\\sqrt',       # raw LaTeX sqrt
    r'\\int',        # raw LaTeX integral
    r'\\sum',        # raw LaTeX summation
    r'_\{',          # raw subscript
]
```

---

## 6. Phase 2 - Algebra Expansion Plan (Summary)

### 6.1 Scope (from PRD Phase 2)
- Expressions: simplify, expand, collect like terms
- Exponents and laws of indices (positive/negative/zero integer powers; fractional only if grade allows)
- Algebraic identities: (a+b)², (a-b)², a²-b², (x+a)(x+b)
- Polynomials: add, subtract, multiply, simple division by monomial
- Factorisation: common factor, grouping, identities, trinomials x²+bx+c and ax²+bx+c
- Simultaneous linear equations: substitution AND elimination
- Quadratic equations: factorisation (default lower grades), quadratic formula, completing square; discriminant; no real roots, repeated root
- Square-root equations: isolate radical, square both sides, check extraneous roots by substitution
- Integrals/limits/summations: RENDER ONLY (not solved; registry marks "not yet supported")

### 6.2 Rule-Based Transformation Engine
Each step = one named operation applied to SymPy expression/equation:
- `expand`, `factorise`, `simplify`, `collect_like_terms`, `subtract_both_sides`, `add_both_sides`, `multiply_both_sides`, `divide_both_sides`
- `substitute`, `apply_identity`, `quadratic_formula`, `completing_square`, `isolate_radical`, `square_both_sides`
- `check_extraneous_roots`, `convert_units`, `apply_formula`

Verification: after EVERY step, SymPy checks equivalence (solution set / simplifies to zero). Failed step → try next method; all fail → honest error.

### 6.3 Grade-Aware Method Selection
| Topic | Grade 7-8 | Grade 9-10 |
|-------|-----------|------------|
| Quadratics | Factorisation only | Factorisation → formula → completing square |
| Systems | Substitution | Substitution + elimination (offer simpler) |
| Radicals | Check extraneous | Same + explain why squaring can introduce them |
| Factorisation | Common factor, simple trinomials | Grouping, ax²+bx+c, identities |

### 6.4 Test Plan
- Acceptance: AT-002 (x²+5x+6=0), AT-003 (re-run), AT-004 (radical scope), AT-005 (integral render only), AT-009 (mode switch)
- Regression: ≥15 problems/topic including no solution, infinite solutions, repeated root, extraneous root, no real roots
- Step verification: EVERY step of EVERY regression solution checked for equivalence
- Grade-level test: same quadratic at different grades → different methods/wording
- Topic registry: "fully supported" only if tests pass; otherwise "limited"

---

## 7. Phase 3 - Geometry and Data Plan

### 7.1 Scope (from PRD Phase 3)
1. **Geometry**: angle properties (complementary, supplementary, vertical, angles on a line, triangle angle sum, parallel lines & transversals), triangle types, Pythagoras, perimeter, basic congruence/similarity
2. **Mensuration**: area/perimeter of rectangle, square, triangle, parallelogram, trapezium, circle; volume/surface area of cuboid, cube, cylinder, cone, sphere — always show units & formula
3. **Coordinate Geometry**: distance, midpoint, slope, line equation, plotting points, intercepts
4. **Statistics**: mean, median, mode, range, simple frequency tables, reading bar charts
5. **Probability**: single-event and simple compound events with equally likely outcomes (fractions in lowest terms)

### 7.2 Diagram Decision (Non-Negotiable)
- **SUPPORTED**: diagrams GENERATED from structured problem data and shown with the solution:
  - Triangle with labelled sides/angles
  - Rectangle, square, parallelogram, trapezium
  - Circle with radius/diameter
  - Parallel lines with transversal
  - Coordinate plane with points/lines
  - Bar chart
  - Simple data tables
- **NOT SUPPORTED**: recognising student's hand-drawn or photographed diagrams
- If problem depends on an unseen diagram → say so and ask student to type given lengths, angles, relationships
- Topic registry marks "not yet supported" for diagram recognition

### 7.3 Engine Requirements
- Every formula application = named step (`apply_formula`, `substitute`, `simplify`, `convert_units`, `check_pythagoras`, `check_angle_sum`, etc.)
- SymPy does arithmetic & verifies each step; LLM never computes
- Geometry problems → structured Problem object:
  - Shapes with given measurements WITH units
  - Relationships (e.g., "parallel lines", "right angle at B")
  - Requested quantity (e.g., "find area", "find angle C")
- Missing/inconsistent data (angles that can't sum to 180) → point out and ask; never invent (FR-022)
- Independent verification where possible:
  - Recompute area with second formula
  - Check angle sums (triangle = 180°, quadrilateral = 360°)
  - Check Pythagoras both ways (a²+b²=c² and c²-a²=b²)
  - Statistics verified against Python's `statistics` module
- Unit handling: keep units through every step; reject mixed units unless conversion step shown
- Grade-aware wording/method choice (Phase 2 approach)
- Word problems: same structured-model path (extract quantities/units → show model → calculate)

### 7.4 Diagram Renderer Module (New Layer)
```
┌─────────────────────────────────────────────────────────────────────┐
│                      DIAGRAM RENDERER (New Layer)                   │
│  StructuredProblem (geometry) ──▶ SVG ──▶ Notebook/Textbook Mode    │
│  - Independent from maths renderer (same independence principle)    │
│  - Labels use proper notation: °, subscripts, units; no raw syntax │
│  - Responsive, readable on phone, accessible text alternatives      │
│  - Highlight current step's relevant diagram part                   │
│  - Notebook/Textbook modes: identical content, presentation only   │
└─────────────────────────────┬───────────────────────────────────────┘
```

**Implementation**: New `diagram` module (`backend/diagram/`, `frontend/src/diagram/`)
- Generates SVG from structured Problem object
- Uses structured expression data for labels (not display strings)
- Each diagram type = separate generator function
- Accessible: `<title>` and `<desc>` in SVG + ARIA labels
- Highlight: step metadata includes `diagram_focus` (element IDs to highlight)

### 7.5 Extended JSON Schemas

#### 7.5.1 Geometry Problem Structure
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GeometryProblem",
  "type": "object",
  "required": ["shapes", "given_measurements", "relationships", "requested_quantity"],
  "properties": {
    "shapes": {"type": "array", "items": {
      "type": "object",
      "required": ["type", "id", "vertices"],
      "properties": {
        "type": {"type": "string", "enum": ["triangle", "rectangle", "square", "parallelogram", "trapezium", "circle", "cuboid", "cube", "cylinder", "cone", "sphere"]},
        "id": {"type": "string"},
        "vertices": {"type": "array", "items": {"type": "object", "properties": {"label": {"type": "string"}, "x": {"type": "number"}, "y": {"type": "number"}}}}
      }
    }},
    "given_measurements": {"type": "object", "additionalProperties": {
      "type": "object",
      "required": ["value", "unit"],
      "properties": {
        "value": {"type": "number"},
        "unit": {"type": "string"},
        "measurement_type": {"type": "string", "enum": ["length", "angle", "area", "volume", "perimeter", "surface_area"]}
      }
    }},
    "relationships": {"type": "array", "items": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {"type": "string", "enum": ["parallel", "perpendicular", "equal_lengths", "equal_angles", "right_angle", "midpoint", "bisector"]},
        "elements": {"type": "array", "items": {"type": "string"}}
      }
    }},
    "requested_quantity": {
      "type": "object",
      "required": ["type", "target"],
      "properties": {
        "type": {"type": "string", "enum": ["length", "angle", "area", "volume", "perimeter", "surface_area", "distance", "midpoint", "slope", "line_equation", "mean", "median", "mode", "range", "probability"]},
        "target": {"type": "string"}
      }
    }
  }
}
```

#### 7.5.2 New Operations (add to RawSolutionStep.operation enum)
```
"apply_formula", "check_pythagoras", "check_angle_sum", "check_congruence", "check_similarity",
"convert_units", "compute_statistics", "compute_probability", "verify_by_alternate_method"
```

#### 7.5.3 SolutionStep with Diagram Focus
```json
{
  "diagram_focus": {"type": "array", "items": {"type": "string"}, "description": "SVG element IDs to highlight for this step"},
  "diagram_type": {"type": "string", "enum": ["triangle", "rectangle", "circle", "parallel_lines", "coordinate_plane", "bar_chart", "data_table", "none"]}
}
```

### 7.6 Topic Registry Entries (Phase 3)
```python
"geometry_angles": TopicSupport(topic="geometry_angles", level=SupportLevel.FULL, supported_operations=["angle_sum", "complementary", "supplementary", "vertical", "parallel_lines"], grade_range=[5, 8], test_status="pending"),
"pythagoras": TopicSupport(topic="pythagoras", level=SupportLevel.FULL, supported_operations=["find_hypotenuse", "find_leg", "verify_right_triangle"], grade_range=[6, 10], test_status="pending"),
"mensuration_2d": TopicSupport(topic="mensuration_2d", level=SupportLevel.FULL, supported_operations=["area", "perimeter"], grade_range=[4, 8], test_status="pending"),
"mensuration_3d": TopicSupport(topic="mensuration_3d", level=SupportLevel.FULL, supported_operations=["volume", "surface_area"], grade_range=[6, 10], test_status="pending"),
"coordinate_geometry": TopicSupport(topic="coordinate_geometry", level=SupportLevel.FULL, supported_operations=["distance", "midpoint", "slope", "line_equation"], grade_range=[7, 10], test_status="pending"),
"statistics": TopicSupport(topic="statistics", level=SupportLevel.FULL, supported_operations=["mean", "median", "mode", "range", "frequency_table", "bar_chart"], grade_range=[5, 10], test_status="pending"),
"probability": TopicSupport(topic="probability", level=SupportLevel.FULL, supported_operations=["single_event", "compound_event"], grade_range=[6, 10], test_status="pending"),
"diagram_recognition": TopicSupport(topic="diagram_recognition", level=SupportLevel.UNSUPPORTED, supported_operations=[], grade_range=[1, 10], test_status="pending", limitations=["Cannot recognise hand-drawn or photographed diagrams"]),
```

### 7.7 Acceptance Tests (New)
| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| AT-013 | Pythagoras with diagram | Show right triangle diagram, apply a²+b²=c², verify by checking both ways |
| AT-014 | Area of composite shape | Break into rectangles/triangles, sum areas, show units |
| AT-015 | Angle on parallel lines | Diagram with transversal, identify corresponding/alternate/co-interior angles |
| AT-016 | Circle circumference/area | Formula with π, correct units (cm, cm²) |
| AT-017 | Cylinder volume | Formula πr²h, show units (cm³) |
| AT-018 | Distance & midpoint | Two points → distance formula, midpoint formula |
| AT-019 | Mean/median/mode | Data set → statistics module check, handle even/odd counts |
| AT-020 | Probability word problem | Equally likely outcomes → fraction in lowest terms |
| AT-021 | Inconsistent geometry data | Angles summing to ≠180° → flag and ask, don't solve |
| AT-022 | Unseen diagram dependency | "In the diagram..." → ask for typed values |

### 7.8 Regression Suite (≥15 problems/topic)
```
tests/regression/phase3/
├── geometry_angles/
│   ├── test_triangle_angle_sum.py
│   ├── test_parallel_lines.py
│   └── fixtures.json
├── pythagoras/
│   ├── test_find_hypotenuse.py
│   ├── test_find_leg.py
│   ├── test_verify_right_triangle.py
│   └── fixtures.json
├── mensuration_2d/
│   ├── test_rectangle_area.py
│   ├── test_triangle_area.py
│   ├── test_circle_area.py
│   ├── test_composite_shapes.py
│   └── fixtures.json
├── mensuration_3d/
│   ├── test_cuboid_volume.py
│   ├── test_cylinder_volume.py
│   ├── test_sphere_surface_area.py
│   └── fixtures.json
├── coordinate_geometry/
│   ├── test_distance.py
│   ├── test_midpoint.py
│   ├── test_slope.py
│   └── fixtures.json
├── statistics/
│   ├── test_mean.py
│   ├── test_median_even_odd.py
│   ├── test_mode_multiple_none.py
│   ├── test_bar_chart.py
│   └── fixtures.json
├── probability/
│   ├── test_single_event.py
│   ├── test_compound_event.py
│   └── fixtures.json
└── raw_syntax_scan_phase3.py  # Scans SVG labels + KaTeX output
```

### 7.9 Visual Review Requirement
- Render every diagram type at desktop (1024px) and mobile (375px) widths
- Save screenshots to `docs/review/phase3/` for manual review
- Never mark a diagram type "fully supported" without this visual review

### 7.10 Frontend Diagram Components
```
frontend/src/diagram/
├── DiagramDisplay.tsx          # Main diagram component
├── generators/
│   ├── triangle.ts             # Triangle SVG generator
│   ├── rectangle.ts            # Rectangle/square generator
│   ├── circle.ts               # Circle generator
│   ├── parallelLines.ts        # Parallel lines with transversal
│   ├── coordinatePlane.ts      # Coordinate plane with points/lines
│   ├── barChart.ts             # Bar chart generator
│   └── dataTable.ts            # Data table generator
├── types.ts                    # Diagram types
├── hooks/
│   └── useDiagram.ts           # Diagram state management
└── styles/
    └── diagram.css             # Responsive SVG styling
```

### 7.11 Backend Diagram Module
```
backend/src/diagram/
├── interface.py                # Abstract provider
├── generators/
│   ├── base.py                 # Base SVG generator
│   ├── triangle.py
│   ├── rectangle.py
│   ├── circle.py
│   ├── parallel_lines.py
│   ├── coordinate_plane.py
│   ├── bar_chart.py
│   └── data_table.py
├── registry.py                 # Diagram type registry
└── types.py                    # Pydantic models
```

---

## 7. Phase 4 - Guided Practice Plan

### 7.1 Scope (from PRD Phase 4)
1. **Practice mode** (FR-025): student attempts the NEXT step (typed or handwritten) and gets feedback
2. **Hint ladder** (FR-024): nudge -> targeted hint -> show the step with its reason; "explain more simply" option
3. **Misconception feedback**: identify WHICH common mistake was made, kindly and specifically
4. **Retry without losing input** (FR-036)
5. **History and progress insights**: topics practised, steps needing hints, topics causing difficulty
6. **Parent/tutor-friendly summary view** of saved problem (read-only, exportable) (FR-034)

### 7.2 Data & Storage Model (Non-Negotiable)
- **Session-only by default**: input, solution and practice state in memory/session storage; disappear on clear/leave (FR-037)
- **Opt-in "Save to my history"** per problem (FR-038): stored items viewable, tagged by topic/grade (FR-039), deletable individually or all at once
- **Stored**: structured problem data + final solution. **NOT stored**: raw handwriting strokes/images (unless explicitly decided)
- **Analytics**: privacy-conscious counters only (recognition failure, clarification rate, verification failure, latency, hint usage, user-reported issues). No student content in analytics
- **Third-party data**: documented in `docs/PRIVACY.md` (what is sent to model providers, what is retained)

### 7.3 Attempt-Checking Pipeline
```
Student Attempt
      │
      ▼
┌─────────────────────────────────────────────┐
│ Recognition Layer (existing)                │
│ - Same clarification rules apply            │
│ - Ambiguous symbol -> confirm, never guess  │
└─────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│ SymPy Equivalence Check (NOT LLM)           │
│ Classify as:                                │
│ (a) correct & matches expected step         │
│ (b) correct but different valid path        │
│ (c) valid but no progress                   │
│ (d) not equivalent                          │
│ (e) unreadable/incomplete                   │
└─────────────────────────────────────────────┘
      │
      ▼
Case (a): Accept, mark step complete, continue
Case (b): Accept, show how it joins main solution (if engine supports); else show main path
Case (c): Accept but prompt "this is true but doesn't move us forward"
Case (d): Find FIRST divergence step, explain what went wrong (never just "wrong")
Case (e): Ask for clarification
```

**Misconception Detection (Deterministic Catalogue)**
- Each entry: `id`, `detector_fn(SymPy) -> bool`, `kind_explanation`, `grade_hint`
- Catalogue entries (examples):
  - `MC-001`: square_of_sum_error — `(a+b)^2` expanded as `a^2+b^2` (missing 2ab)
  - `MC-002`: sign_error_moving_term — moving term across `=` without flipping sign
  - `MC-003`: one_sided_operation — operation applied to one side only
  - `MC-004`: cancel_terms_not_factors — cancelling additive terms in fraction
  - `MC-005`: divide_by_variable_may_be_zero — dividing by `x` without `x≠0` check
  - `MC-006`: wrong_order_of_operations — e.g. `2+3*4 = 20`
  - `MC-007`: unit_error — missing or mismatched units
  - `MC-008`: extraneous_root_not_checked — squared radical equation, didn't substitute back
  - `MC-009`: wrong_identity_use — e.g. treating `a^2-b^2` as `(a-b)^2`
  - `MC-010`: arithmetic_slip — off-by-one, sign flip in arithmetic (flagged if rest of algebra is valid)
- LLM only rephrases catalogue text for grade level; **never decides** what the mistake is
- If no match: say "this step isn't equivalent" + generic hint; **do not invent diagnosis**

**Hint Ladder (Never Leaks Next Step's Value)**
1. **Nudge**: "Look at the operation you applied to the left side — did you do the same to the right?"
2. **Targeted hint**: "When you move a term across the equals sign, what happens to its sign?"
3. **Show step with reason**: Reveal the expected step + "We subtract 3 from both sides to keep the equation balanced"
4. **Explain more simply**: LLM rephrases at lower grade level (on demand)

### 7.4 Practice Mode UI Flow
- **Per-step practice**:
  1. Show previous step (completed)
  2. Input area for attempt (typed or handwritten)
  3. Submit -> feedback + hint ladder (one level at a time)
  4. "Reveal this step" button (always available)
- **Practice never forced**: "Skip practice" always available; student can read full worked example (PRD 7.3)
- **Supportive wording**: short, plain; correctness shown with icon + text (never colour alone)
- **Accessibility**: full keyboard operation, visible focus, scalable text, contrast checked; feedback announced to screen readers
- **Network failure mid-practice**: keep attempt + progress, offer retry (AT-010)

### 7.5 History Page
- List of saved problems (topic, grade, date, completion %)
- Open -> read-only view with full solution + practice summary
- Delete one / Delete all (with confirmation)
- Clear statement: "Only the structured problem and solution are stored. No handwriting images are saved."
- Export as text or PDF (FR-034)

### 7.6 Extended JSON Schemas

#### 7.6.1 Attempt Classification
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AttemptResult",
  "type": "object",
  "required": ["classification", "misconception_id", "feedback", "hint_level"],
  "properties": {
    "classification": {"type": "string", "enum": ["correct_expected", "correct_alternate", "valid_no_progress", "not_equivalent", "unreadable"]},
    "misconception_id": {"type": ["string", "null"], "enum": ["MC-001", "MC-002", "MC-003", "MC-004", "MC-005", "MC-006", "MC-007", "MC-008", "MC-009", "MC-010", null]},
    "divergence_step": {"type": ["integer", "null"]},
    "feedback": {"type": "string", "maxLength": 300},
    "hint_level": {"type": "integer", "minimum": 1, "maximum": 4},
    "hint_text": {"type": "string", "maxLength": 300},
    "show_step_allowed": {"type": "boolean", "default": true}
  }
}
```

#### 7.6.2 Misconception Catalogue Entry
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MisconceptionEntry",
  "type": "object",
  "required": ["id", "name", "detector_expr", "explanation", "hint"],
  "properties": {
    "id": {"type": "string", "pattern": "^MC-\\d{3}$"},
    "name": {"type": "string"},
    "detector_expr": {"type": "string", "description": "SymPy-checkable expression that returns True when misconception is present"},
    "explanation": {"type": "string", "maxLength": 200},
    "hint": {"type": "string", "maxLength": 200},
    "grade_range": {"type": "array", "items": {"type": "integer"}, "minItems": 2, "maxItems": 2}
  }
}
```

#### 7.6.3 Saved Problem (History)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SavedProblem",
  "type": "object",
  "required": ["id", "problem_data", "solution_steps", "practice_summary", "topic", "grade", "created_at"],
  "properties": {
    "id": {"type": "string"},
    "problem_data": {"$ref": "#/definitions/StructuredProblem"},
    "solution_steps": {"type": "array", "items": {"$ref": "#/definitions/SolutionStep"}},
    "practice_summary": {
      "type": "object",
      "properties": {
        "steps_attempted": {"type": "integer"},
        "hints_used": {"type": "integer"},
        "misconceptions_found": {"type": "array", "items": {"type": "string"}},
        "completed": {"type": "boolean"}
      }
    },
    "topic": {"type": "string"},
    "grade": {"type": "integer"},
    "created_at": {"type": "string", "format": "date-time"}
  }
}
```

#### 7.6.4 Analytics Event (Privacy-Conscious)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnalyticsEvent",
  "type": "object",
  "required": ["event_type", "timestamp"],
  "properties": {
    "event_type": {"type": "string", "enum": ["recognition_failure", "clarification_shown", "verification_failed", "hint_used", "misconception_detected", "practice_step_completed", "user_reported_issue", "latency"]},
    "topic": {"type": "string"},
    "grade": {"type": "integer"},
    "latency_ms": {"type": "integer"},
    "hint_level": {"type": "integer"},
    "misconception_id": {"type": "string"},
    "timestamp": {"type": "string", "format": "date-time"}
  }
}
```

### 7.7 Module Additions

#### 7.7.1 Backend: `practice` module
```
backend/src/practice/
├── interface.py              # AttemptCheckerProvider, MisconceptionCatalogue
├── attempt_checker.py        # SymPy-based classification + catalogue matching
├── catalogue.py              # MisconceptionEntry list + detector functions
├── hint_ladder.py            # HintLevelGenerator (never leaks next value)
├── history.py                # HistoryProvider (session + opt-in persistence)
└── schemas.py                # Pydantic models above
```

#### 7.7.2 Backend: `api/routes.py` additions
```
POST /api/practice/attempt    # Attempt -> AttemptResult
POST /api/practice/hint       # Next hint level (nudge -> targeted -> step)
GET  /api/history             # List saved problems
POST /api/history             # Save problem (opt-in)
DELETE /api/history/{id}      # Delete one
DELETE /api/history           # Delete all
GET  /api/history/{id}        # Read-only view (exportable)
GET  /api/analytics           # Privacy-conscious metrics (admin only)
```

#### 7.7.3 Frontend: `practice` components
```
frontend/src/practice/
├── PracticeMode.tsx          # Main practice flow controller
├── AttemptInput.tsx          # Typed + handwritten attempt area
├── FeedbackDisplay.tsx       # Icon + text feedback (accessible)
├── HintLadder.tsx            # Progressive hint levels
├── MisconceptionBanner.tsx   # Kind explanation for detected MC
├── HistoryPage.tsx           # List + view + delete
├── ExportDialog.tsx          # Text/PDF export
├── hooks/
│   ├── usePractice.ts        # Practice state machine
│   └── useHistory.ts         # History CRUD
├── types.ts                  # AttemptResult, MisconceptionEntry, SavedProblem
└── styles/
    └── practice.css          # Accessible styling
```

### 7.8 Test Plan

#### 7.8.1 Unit Tests
| Module | Tests |
|--------|-------|
| `attempt_checker` | All 5 classifications; each misconception detector (positive + negative cases); no false positives on correct work |
| `catalogue` | All 10 entries: detector returns True for target error, False for correct work |
| `hint_ladder` | Nudge/targeted/step never contain next step's final value; "explain simply" rephrases correctly |
| `history` | Session clears on leave; opt-in saves to localStorage; delete removes; export produces valid text/PDF |

#### 7.8.2 Integration Tests
- Full practice flow: attempt -> classification -> feedback -> hint -> reveal
- Network failure mid-practice: state preserved, retry works
- Alternate valid path (b): accepted, shows how it joins main solution
- Misconception detected -> correct MC ID + kind explanation + hint

#### 7.8.3 Practice Regression Suite (≥5 solutions/topic group)
```
tests/regression/phase4/
├── linear_equations/
│   ├── test_sign_error.py
│   ├── test_one_sided_op.py
│   ├── test_wrong_order.py
│   └── fixtures.json
├── quadratics/
│   ├── test_extraneous_root.py
│   ├── test_factorisation.py
│   └── fixtures.json
├── radicals/
│   ├── test_extraneous_root_check.py
│   └── fixtures.json
├── geometry/
│   ├── test_unit_error.py
│   └── fixtures.json
├── statistics/
│   ├── test_arithmetic_slip.py
│   └── fixtures.json
└── practice_scenarios.json  # Scripted attempts: (a)-(e) with expected classification, MC ID, hint level
```

#### 7.8.4 Critical Tests
- **No-answer-leak test**: Assert nudge + targeted hint + "explain simply" do NOT contain the final value of the next step
- **Misconception detector tests**: Each detector with positive (error present) and negative (correct work) examples; no false positives
- **Session test**: Clearing session removes input/solution/practice state; unsaved problem gone after reload; saved problem deleted -> gone
- **Accessibility**: Keyboard-only walkthrough of practice mode; axe-style automated check -> results in `docs/review/phase4/`
- **Privacy test**: Analytics events contain NO student input, handwriting, or solution text

#### 7.8.5 User Testing Preparation
Create `docs/USER_TESTING.md` with:
- Test script: 6 tasks for students (e.g., "Solve 2x+5=15 using practice mode", "Get a hint when stuck", "Save and export a problem")
- Consent note (plain language)
- Observation fields: completion, hints used, errors, confusion points
- 5 comprehension questions (plain language)

### 7.9 Acceptance Tests (Existing + New)
- AT-008: Wrong next step -> supportive feedback naming the issue + useful hint
- AT-010: Network failure mid-practice -> keeps work, allows retry
- **New**: Practice mode accessible via keyboard only
- **New**: Misconception detected -> kind explanation + hint (not just "wrong")
- **New**: Alternate valid path accepted and joined to main solution

---

## 8. Configuration & Environment

### 8.1 Backend `.env.example`

```bash
# LLM Provider (OpenAI-compatible)
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...

# Vision LLM (for handwriting recognition)
VISION_LLM_BASE_URL=https://api.openai.com/v1
VISION_LLM_MODEL=gpt-4o
VISION_LLM_API_KEY=sk-...

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# Recognition thresholds
RECOGNITION_CONFIDENCE_THRESHOLD=0.75
MAX_CLARIFICATION_ATTEMPTS=2

# Solver
MAX_SOLVER_RETRIES=2
SYMPY_VERBOSE=false
```

### 8.2 Frontend `.env.example`

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=AI Math Notebook
```

---

## 8. Commands to Run (After Implementation)

### Development
```bash
# Terminal 1 - Backend
cd backend && pip install -e . && uvicorn src.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

### Testing
```bash
# Backend tests
cd backend && pytest -v

# Frontend tests
cd frontend && npm run test

# E2E tests
cd frontend && npm run test:e2e

# Raw syntax scan
cd backend && pytest tests/raw_syntax_scan.py -v
```

### Build
```bash
# Frontend production build
cd frontend && npm run build

# Backend package
cd backend && pip wheel . -w dist/
```

---

## 9. Decisions Needed Before Implementation

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Handwriting recognition provider | OpenAI GPT-4o, Google Gemini, local (Moondream) | Start with OpenAI-compatible abstraction; configure via env |
| Math solving engine | SymPy (pure Python), SageMath, Mathematica API | SymPy - pure Python, MIT license, sufficient for Grade 1-10 |
| Curriculum profile | CBSE, ICSE, US Common Core, configurable | Configurable registry; start with one profile |
| Grade selection UX | Dropdown, auto-infer from topic, both | Dropdown + "explain more simply" button |
| Data retention | Session-only, save to history, both with consent | Session-only by default; opt-in history |
| Diagram support | Phase 3 (generation only, no recognition) | This phase; generation supported, recognition stays unsupported |

---

## 10. Summary

This plan covers:
1. **Architecture** - 7-layer pipeline with strict module boundaries and data contracts
2. **JSON Schemas** - RecognitionCandidate, StructuredProblem, RawSolutionStep, SolutionStep, ClarificationRequest, TopicSupport
3. **Module Interfaces** - Abstract base classes for each layer (recognition, interpretation, solver, teaching, rendering, topic_registry)
4. **Phase 0 Prototype** - Canvas, typed input, KaTeX samples, mode toggle, health endpoint
5. **Phase 1 Core** - 7 topics, full pipeline, API endpoints, acceptance tests, regression suite
6. **Test Plan** - Unit, integration, E2E, raw syntax scan
7. **Configuration** - Environment variables, recognition thresholds, provider abstraction

**No app code written yet.** Awaiting approval to proceed with Phase 0 implementation.