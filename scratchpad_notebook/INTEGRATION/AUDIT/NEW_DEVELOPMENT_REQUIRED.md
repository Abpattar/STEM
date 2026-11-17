# Features Requiring New Development

**Audit Date:** November 17, 2026  
**Auditor:** DeepMind Antigravity AI Engine  
**Objective:** Specification of essential platform capabilities that do not exist in any of the six inspected upstream repositories or existing MathAI source code and must be engineered from scratch.

---

## 1. Summary of Non-Existent Features

The integration of six external repositories provides exceptional individual building blocks (recognition models, concept graphs, visualizers, accessibility rules). However, an inclusive, unified educational platform requires connective intelligence and specialized pedagogical mechanisms that **none of the upstream repositories contain**.

| # | Feature / Capability | Why Upstream Code Cannot Be Reused | Technical Domain | Engineering Scope |
|---|---|---|---|---|
| 1 | **Voice-to-Math Expression Normalizer** | Upstream repos only provide raw audio recording or general text speech-to-text; neither converts spoken phrases ("x squared minus five over three") into formal LaTeX / SymPy AST. | Speech Processing & Formal Grammar | High |
| 2 | **MathLive / Visual Mathematical Keyboard** | All upstream repos rely on either freehand canvas or standard text inputs; none provide a virtual structured mathematical equation editor. | Frontend UI / Typography | Medium |
| 3 | **Concept-First Mastery Gating System** | Mathua has static lesson pages and MathAI has passive prerequisite tags; neither contains an active pedagogical circuit breaker that halts solution revelation until foundational understanding is proven. | Adaptive Pedagogy & Workflow | High |
| 4 | **ADHD-Friendly Cognitive Accommodations** | Neither MathAI nor any upstream repository implements neurodivergent cognitive design (step-by-step chunking, visual focus spotlighting, dopamine audio micro-milestones). | Frontend UI & Cognitive Psychology | Medium |
| 5 | **Unified Student Progress SQL Persistence** | MathAI stores profile in browser `localStorage`; Mathua uses Go in-memory sessions. No relational persistence layer exists for cross-device mastery tracking. | Database Architecture & Backend | Medium |
| 6 | **Pedagogical Step Verification (Structural AST)** | MathAI's `/verify-step` checks only raw algebraic difference ($\Delta = 0$). It cannot verify whether a student actually factored, expanded, or isolated a variable. | Symbolic Mathematics & Compilers | High |
| 7 | **Expanded ISL Mathematical Vocabulary & Generator** | `preset-references.json` only has 106 basic gestures; advanced concepts (hypotenuse, derivative, integral, tangent) have zero 3D landmarks anywhere. | Computer Vision & Motion Synthesis | High |
| 8 | **Unified Multimodal Streaming Pipeline (WebSocket/SSE)** | Communication is currently fragmented into multiple asynchronous HTTP POST polling requests (`/api/recognize`, `/api/solve`, `/api/verify-step`). | Real-Time Networking | Medium |

---

## 2. In-Depth Technical Specification of New Developments

### 1. Spoken Mathematics Grammar Normalizer (Voice $\to$ LaTeX)
- **The Problem:**
  When a student clicks the microphone button and speaks:
  > *"Solve three x squared plus four x minus seven equals zero"*
  Browser speech-to-text engines (`SpeechRecognition` / Web Speech API) return the raw text string `"3 x squared + 4 x - 7 = 0"`.
  When they speak fractions or roots:
  > *"square root of two x plus one all over three"*
  The speech engine outputs `"square root of 2x + 1 all over 3"`.
  SymPy's `parse_expr` immediately throws a `SyntaxError` on such transcripts, crashing the solver pipeline.
- **Why Existing Code Cannot Be Reused:**
  - `Sixth-Sense/js/speech.js` merely invokes `window.webkitSpeechRecognition` with language `"en-IN"` and yields raw transcripts.
  - `MathCAT/src/speech.rs` does the *exact opposite*: it translates MathML into spoken words (Text-to-Speech), not spoken words into MathML (Speech-to-Text).
- **Required Implementation:**
  A deterministic context-free grammar parser in Python (`backend/src/voice/math_normalizer.py`):
  1. Lexical tokenization mapping acoustic phrases to mathematical operations:
     - `"squared"` $\to$ `^2`, `"cubed"` $\to$ `^3`, `"to the power of n"` $\to$ `^n`
     - `"over"` / `"divided by"` / `"all over"` $\to$ `\frac{numerator}{denominator}`
     - `"square root of"` $\to$ `\sqrt{}`
     - `"plus or minus"` $\to$ `\pm`
     - `"sine"`, `"cosine"`, `"tangent"` $\to$ `\sin`, `\cos`, `\tan`
  2. Scope disambiguation handling parenthetical groupings for "all over" and "quantity".
  3. Seamless output to standard LaTeX strings for ingestion by the UMR input pipeline.

### 2. MathLive Visual Equation Editor Integration
- **The Problem:**
  Students with motor impairments, tremors, or those on laptops without a stylus/touchscreen cannot write on `MathCanvas.tsx`. Typing complex formulas into a plain text input (`x^2 + 5x + 6 = 0`) is intimidating and prone to syntactic errors (e.g. mismatched parentheses).
- **Why Existing Code Cannot Be Reused:**
  None of the seven inspected repositories provide a visual virtual math keyboard or WYSIWYG mathematical expression editor.
- **Required Implementation:**
  - Install `@cortex-js/mathlive` in `MathAI/frontend/package.json`.
  - Create a dedicated React component `frontend/src/components/MathLiveEditor.tsx`.
  - Provide an on-screen touch-friendly virtual keyboard with dedicated buttons for fractions ($\frac{\Box}{\Box}$), exponents ($\Box^{\Box}$), square roots ($\sqrt{\Box}$), $\pi$, $\le, \ge, \pm$, and Greek variables ($\theta, \alpha, \beta$).
  - Two-way synchronisation: Typing into MathLive instantly updates the notebook's active UMR state, and recognized handwriting from the canvas can be loaded into MathLive for manual correction.

### 3. Concept-First Mastery Gating System
- **The Problem:**
  Traditional math solvers act as "crutches": a student inputs a problem, and the application immediately spits out the complete step-by-step solution. The student reads the final answer passively without engaging in cognitive struggle or understanding prerequisite principles.
- **Why Existing Code Cannot Be Reused:**
  - `Mathua` has concept DAG metadata and standalone lesson pages, but no mechanism to intercept and gate an active problem solution.
  - `MathAI` currently renders prerequisite concepts as static visual badges at the top of the screen; the student can completely ignore them and copy the solution.
- **Required Implementation:**
  - A pedagogical circuit breaker inside `backend/src/orchestrator/orchestrator.py`:
    1. When `profile.preferences.concept_first_mode` is enabled (default for learning mode), the orchestrator withholds the final solution steps.
    2. It selects the immediate upstream prerequisite concept from the Mathua DAG (e.g. for factoring quadratics, it selects *"Zero-Product Property"* or *"Finding factor pairs"*).
    3. It generates a single 10-second micro-challenge (e.g., *"Before solving $(x+2)(x+3)=0$, if $A \cdot B = 0$, what must be true about $A$ or $B$?"*).
    4. Only upon the student answering the check question does the system unlock the worked solution.

### 4. ADHD-Friendly Cognitive Accommodations
- **The Problem:**
  Students with ADHD, autism, or executive function challenges experience severe cognitive overload when presented with a wall of 8 dense mathematical steps, multiple graphs, braille codes, and sidebar panels simultaneously.
- **Why Existing Code Cannot Be Reused:**
  MathAI's `StudentProfileModal.tsx` provides an `adhd_focus_mode` boolean toggle, but the frontend currently does not modify its rendering tree based on this flag.
- **Required Implementation:**
  - **Progressive Step Chunking**: Solution steps are hidden behind an interactive stepper. Only Step 1 is rendered initially. The student clicks a high-contrast `"Next Step"` button or presses the spacebar to reveal Step 2.
  - **Visual Focus Spotlight**: Background panels (history, raw equations, accessibility options) are softly dimmed to 30% opacity, drawing visual attention solely to the active transformation.
  - **Cognitive Dopamine Micro-Milestones**: Procedural Web Audio chimes (borrowed from `MathLearn-Primary`) trigger on step completion, paired with discreet visual celebrations, validating incremental progress.
  - **Visual Pacing Timer**: A gentle, non-stressful visual circular countdown showing recommended focus intervals.

### 5. Unified Student Learning Profile Database Persistence
- **The Problem:**
  If a student switches from their laptop to a tablet, or clears browser cookies, their entire learning history, FSRS spaced repetition memory states, and accessibility preferences are permanently lost.
- **Why Existing Code Cannot Be Reused:**
  - `MathAI` currently relies on `localStorage.getItem('student_profile')`.
  - `Mathua` stores sessions in temporary Go HTTP cookies.
- **Required Implementation:**
  - Implement an enterprise-grade SQLite / PostgreSQL database managed by SQLAlchemy and Alembic migrations in `backend/src/db/`:
    - `users`: Core profile credentials and grade level.
    - `student_preferences`: Accessibility flags (speech rate, braille format, high contrast, sonification volume, ADHD focus mode).
    - `fsrs_states`: Spaced repetition state vectors ($S, D, R$, last review timestamp) indexed by `(user_id, concept_id)`.
    - `problem_attempts`: Every problem attempted, input modality used (voice, handwriting, typing), time spent, errors made, and whether assistance was requested.

### 6. Pedagogical Step Verification (Structural AST Matching)
- **The Problem:**
  In `backend/src/api/routes.py:165` (`/verify-step`), verification is performed using:
  ```python
  is_correct = sp.simplify(user_step - expected_step) == 0
  ```
  This is flawed pedagogically. For example:
  - If the problem is $x^2 - 9 = 0$ and Step 1 asks the student to factor into $(x-3)(x+3) = 0$, a student who enters $x^2 - 9 = 0$ will be marked **Correct** because $(x^2 - 9) - (x^2 - 9) = 0$!
  - The solver verified algebraic identity, but the student made zero progress on the actual algebraic operation.
- **Why Existing Code Cannot Be Reused:**
  Neither MathAI nor Mathua's `sympy_service.py` evaluates the *structural form* of the student's expression.
- **Required Implementation:**
  A structural AST validator in `backend/src/solver/pedagogical_verifier.py`:
  - Inspects SymPy expression tree types (`sp.Mul`, `sp.Add`, `sp.Pow`).
  - Verifies whether the requested operation was executed:
    - If operation is `factor`: expression must be an instance of `sp.Mul` with polynomial factors.
    - If operation is `expand`: expression must have no outer `sp.Mul` terms.
    - If operation is `isolate_variable`: variable $x$ must appear on only one side with coefficient 1.

### 7. Expanded Indian Sign Language (ISL) Vocabulary & Motion Synthesis
- **The Problem:**
  The current 106 gestures in `preset-references.json` cover basic algebra and digits. When a student encounters geometry (hypotenuse, alternate interior angles, chord, tangent) or calculus (limit, derivative, integral), no 3D landmark animations exist.
- **Why Existing Code Cannot Be Reused:**
  Sixth-Sense's dataset was manually recorded for 106 signs. No automated motion synthesis or larger mathematical dataset exists.
- **Required Implementation:**
  1. **Fingerspelling Fallback Engine**: When an educational token lacks a dedicated 3D gesture, automatically decompose the word into constituent letters and animate sequential fingerspelling using the existing A–Z presets with natural morpheme timing pauses.
  2. **ISL Gesture Recording Tool**: A developer/teacher calibration page in MathAI utilizing MediaPipe Holistic to capture, normalize, and commit new mathematical signs to `preset-references.json`.

