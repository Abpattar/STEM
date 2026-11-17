# PROGRESS.md - AI Math Notebook Development Progress

## Phase 0 — Prototype ✅ COMPLETED
**Exit condition**: Students can write and see correctly formatted equations on desktop and mobile.

### Completed
- Frontend: React + TypeScript + Vite project structure
- Canvas component: draw, erase, undo, redo, clear; responsive; `touch-action: none`
- TypedInput component: equations and word problems
- InstructionInput component: "find x" field
- KaTeX rendering with hard-coded samples:
  - Stacked fraction: `\frac{x + 1}{2} = 3`
  - Power: `x^2 + 5x + 6 = 0`
  - Square root: `\sqrt{x + 4} = 3`
  - Integral with bounds: `\int_{0}^{5} x^2 \, dx`
  - Aligned multi-line: `\begin{aligned} x + 3 &= 7 \\ x &= 7 - 3 \\ x &= 4 \end{aligned}`
  - Summation: `\sum_{i=1}^{n} i = \frac{n(n+1)}{2}`
  - Matrix: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`
- Notebook/Textbook mode toggle (CSS-only presentation change)
- FastAPI health endpoint (`/api/health`)
- Frontend proxies `/api` to backend

### Commands to run
```bash
# Backend
cd backend && .venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm run dev
```

---

## Phase 1 — Reliable Core ✅ COMPLETED
**Exit condition**: End-to-end tests pass for arithmetic, fractions, decimals, percentages, linear equations, 2-var systems (substitution), price×qty word problems — including ambiguous handwriting clarification.

### Completed
- Backend pipeline structure with abstract interfaces:
  - `RecognitionProvider` (handwriting + typed)
  - `InterpretationProvider` (StructuredProblem output)
  - `SolverProvider` (SymPy, step verification, retry logic)
  - `TeachingProvider` (LLM explanations + hints, strict JSON)
  - `TopicRegistry` (full/limited/unsupported per topic)
- JSON schemas: RecognitionCandidate, StructuredProblem, RawSolutionStep, SolutionStep, ClarificationRequest, TopicSupport
- API endpoints: `/api/recognize`, `/api/interpret`, `/api/solve`, `/api/hint`, `/api/topics`, `/api/health`
- Acceptance tests implemented: AT-001, AT-003, AT-006, AT-007, AT-010, AT-011, AT-012
- Regression test fixtures per topic group
- Raw syntax scan test (forbids `^`, `\frac`, `sqrt(`, `**` in student-facing output)
- Backend tests passing (pytest)
- Frontend build passing

### Commands to run
```bash
# Backend
cd backend && .venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm run dev

# Tests
cd backend && .venv/bin/pytest -v
```

---

## Phase 2 — Algebra Expansion ✅ COMPLETED
**Exit condition**: Topic-specific solution methods and regression suites pass for expressions, linear equations, quadratic equations, and radical equations.

### Completed
- Step-by-step SymPy solver engine with mathematical equivalence verification (`equivalence_check`, `substitution`, `sympy_verify`).
- Linear equations solver (`subtract_both_sides`, `divide_both_sides`, `isolate_variable`).
- Quadratic equations solver (factorisation, quadratic formula, completing the square).
- Radical equations with extraneous root detection.
- Raw syntax scan validation ensuring no raw syntax reaches student output.

---

## Phase 3 — Geometry and Data ✅ COMPLETED
**Exit condition**: Interactive diagram generation and geometry/mensuration/data solvers verified without raw syntax leaks.

### Completed
- `GeometryEngine`, `MensurationEngine`, `CoordinateGeometryEngine`, `StatisticsEngine`, `ProbabilityEngine`.
- SVG Diagram generators: `triangle`, `rectangle`, `circle`, `parallelogram`, `trapezium`, `cuboid`, `cylinder`, `cone`, `coordinatePlane`, `barChart`, `dataTable`.
- Regression test suite `test_raw_syntax_scan_phase3.py` passing 100%.

---

## Phase 4 — Guided Practice & Misconceptions ✅ COMPLETED
**Exit condition**: Attempt checker, 10-item misconception catalogue (MC-001 through MC-010), hint ladder, and session history verified.

### Completed
- Attempt checker verifying equivalence for equations and expressions (`correct_expected`, `correct_alternate`, `not_equivalent`, `unreadable`).
- Misconception diagnosis engine (sign error moving terms across `=`, one-sided operations, division by variable, extraneous roots).
- Hint ladder (nudge, targeted hint, show step, simplify explanation) without answer leaks.
- Session and opt-in history management.
- All 33 unit and regression tests passing.

---

## Current Status & Running Services
- **Backend**: FastAPI + Uvicorn running on `http://localhost:8000` (auto-reload active).
- **Frontend**: React + TypeScript + Vite running on `http://localhost:5173`.
- **Handwriting Vision Recognition**: Fully integrated via `/api/recognize` utilizing Groq Vision LLM (`qwen/qwen3.8-27b`) to directly read handwritten canvas drawings as input.
- **Bounding Box Crop Optimization**: Crops drawings to stroke bounds with 28px padding and capped 800px dimension, reducing image token consumption by >80% to prevent rate-limit exhaustion.
- **Vision Rate-Limit Protection**: Automatic retry with exponential backoff on HTTP 429 and seamless fallback to typed inputs.
- **Multi-line & Instruction Splitting**: Correctly isolates questions across lines or separated by punctuation (e.g. `x^2 + y = 30` with `x = ?`).
- **Canvas Toolbar & Synchronization**: Canvas strokes immediately take precedence on Solve while auto-syncing with the typed input bar.
- **Exponent & System Parsing**: SymPy parser includes `convert_xor` (supporting `x^2`) and handles multi-equation systems (e.g. `x^2 + y = 30; y = 5`).
- **Test Suite**: 37 tests passing (`pytest tests/`).
- **Build**: Vite production build succeeded with 0 errors.

---

## Single Screen UI Redesign (Completed)
- **One Screen**: Central notebook card with `[✏️ Canvas]` and `[📘 Solution Steps]` tabs.
- **One Input**: Clean input row directly below the screen for equations and word problems with `Enter` key execution and prominent Solve button.
- **On-Screen Solution**: Solving automatically transitions the screen to the step-by-step KaTeX verified solution with step-by-step navigation, toggleable hints, and instant switch back to the canvas.
- **Drawing Guidance**: Dynamic synchronization between drawing and question input.

---

## Technical Details
- Handwriting recognition connects directly to Groq Vision API with structured prompt and strict AST translation.
- LLM provider supports OpenAI-compatible fallbacks; uses structured rule-based explanation generator and SymPy CAS as single source of mathematical truth.