# Comprehensive Feature Comparison Matrix

**Audit Date:** November 17, 2026  
**Auditor:** DeepMind Antigravity AI Engine  
**Standard Compliance:** Strict 6-Status Classification Protocol based on runtime execution path verification.

---

## 1. Feature Status Definition Key

Every assessed feature is categorized under exactly one of the six mandatory audit statuses:
1. **FULLY INTEGRATED**: Fully functional, tested, and actively executed in the end-to-end MathAI runtime path.
2. **PARTIALLY INTEGRATED**: Code exists in MathAI, but key sub-components, execution branches, or data bindings are missing or stubbed.
3. **PRESENT BUT UNUSED**: Model files, static assets, or code snippets exist in the repository, but no execution path invokes them.
4. **NOT INTEGRATED**: Feature exists in an upstream repository but has not been copied, ported, or called in MathAI.
5. **NOT AVAILABLE**: Feature does not exist in any inspected upstream repository or MathAI and requires clean-sheet engineering.
6. **UNVERIFIED**: Insufficient source code or test evidence exists to confirm operational status.

---

## 2. Master Feature Comparison Table

| Feature | Original Repository | Original Source Location | Exists in MathAI? | MathAI Source Location | Integration Status | Required Action |
|---|---|---|---|---|---|---|
| **CoMER INT8 ONNX Models** | `Ink-On` | `public/models/comer/encoder_int8.onnx`<br>`public/models/comer/decoder_int8.onnx`<br>`public/models/comer/vocab.json` | Yes | `frontend/public/models/ink-on/comer/encoder_int8.onnx`<br>`frontend/public/models/ink-on/comer/decoder_int8.onnx`<br>`frontend/public/models/ink-on/comer/vocab.json` | **PRESENT BUT UNUSED** | **Adapt**: Install `onnxruntime-web` and build Web Worker inference pipeline. |
| **In-Browser ONNX Inference Pipeline** | `Ink-On` | `src/core/inference.ts`<br>`src/core/inference.worker.ts` | No | None (`backend/src/api/routes.py:105` uses cloud Vision LLM instead) | **NOT INTEGRATED** | **Adapt**: Port Web Worker inference engine to React/TypeScript in `frontend/src/workers/`. |
| **Stroke Preprocessing & Normalization** | `Ink-On` | `src/core/preprocessing.ts` | No | None (`frontend/src/components/MathCanvas.tsx` only exports raw PNG base64) | **NOT INTEGRATED** | **Reuse**: Copy TypeScript stroke normalizer, bounding-box padder, and Float32Array tensor builder. |
| **Recognition Mode Masking (Number vs Expr)** | `Ink-On` | `src/core/inference.ts:applyModeMask()` | No | None | **NOT INTEGRATED** | **Reuse**: Port log-probability token mask to constrain output for arithmetic vs algebraic problems. |
| **LaTeX Syntactic Auto-Repair** | `Ink-On` | `src/core/latex-repair.ts:repairLatex()` | No | None (Backend relies on SymPy parsing heuristics in `handwriting_adapter.py`) | **NOT INTEGRATED** | **Reuse**: Integrate client-side syntactic sanitizer before sending expressions to SymPy or solvers. |
| **IndexedDB Model Caching** | `Ink-On` | `src/core/model-cache.ts:fetchWithCache()` | No | None | **NOT INTEGRATED** | **Reuse**: Incorporate model caching to eliminate 7.6 MB redundant ONNX downloads across page refreshes. |
| **Interactive Canvas Drawing & Stroke Capture** | `Ink-On` | `src/components/MathCanvas.vue` | Yes | `frontend/src/components/MathCanvas.tsx`<br>`frontend/src/hooks/useCanvas.ts` | **PARTIALLY INTEGRATED** | **Adapt**: Connect existing stroke collection buffer to the local ONNX inference pipeline. |
| **4,818 Concept Knowledge Graph (DAG)** | `Mathua` | `data/concepts/*.json` (25 domain files) | Yes | `backend/src/orchestrator/adapters/mathua_adapter.py` | **PARTIALLY INTEGRATED** | **Adapt**: Expand DAG loader from static prerequisite listing to full topological sort and path generation. |
| **FSRS-6 Spaced Repetition Engine** | `Mathua` | `internal/fsrs/fsrs.go`<br>`internal/fsrs/curve.go`<br>`internal/fsrs/stability.go` | No | None (`backend/src/orchestrator/schemas/profile.py` only defines static fields) | **NOT INTEGRATED** | **Build/Port**: Port FSRS-6 algorithm from Go to Python in `backend/src/learning/fsrs.py`. |
| **Student Mastery State Machine** | `Mathua` | `internal/mastery/machine.go`<br>`internal/mastery/evidence.go` | No | None (`backend/src/orchestrator/adapters/mathua_adapter.py:175` hardcodes `"assessing"`) | **NOT INTEGRATED** | **Build/Port**: Implement mastery progression FSM in backend connected to persistent database. |
| **Computerized Adaptive Testing (CAT)** | `Mathua` | `internal/diagnostic/`<br>`internal/cat/` | No | None | **NOT INTEGRATED** | **Build/Port**: Implement item response theory (IRT) or adaptive diagnostic test selector. |
| **Algorithmic Problem & Quiz Generator** | `Mathua` | `internal/generator/`<br>`internal/quiz/` | No | None (`backend/src/api/routes.py` practice routes lack algorithmic generation) | **NOT INTEGRATED** | **Adapt**: Port problem template generators into Python backend service. |
| **SymPy Mathematical Verification** | `Mathua` | `grading/sympy_service.py` | Yes | `backend/src/solver/`<br>`backend/src/orchestrator/universal_solver.py` | **FULLY INTEGRATED** | **Keep Unchanged**: MathAI's native SymPy solver is already feature-rich and operational. |
| **Interactive Parabola Visualizer** | `MathLearn-Primary` | `index.html` (Grade 9 Module) | Yes | `frontend/src/components/visualizations/ParabolaVisualizer.tsx` | **PARTIALLY INTEGRATED** | **Adapt**: Add preset function library, sound synthesis triggers, and root-finding animations. |
| **Equation Balance Scale Visualizer** | `MathLearn-Primary` | `index.html` (Grade 7 Module) | Yes | `frontend/src/components/visualizations/EquationBalanceVisualizer.tsx` | **FULLY INTEGRATED** | **Keep Unchanged**: Fully functional inverse-operation scale animation connected to UMR. |
| **Algebra Tiles Geometric Dissection** | `MathLearn-Primary` | `index.html` (Grade 8 Module) | Yes | `frontend/src/components/visualizations/AlgebraTilesVisualizer.tsx` | **PARTIALLY INTEGRATED** | **Adapt**: Add drag-and-drop tile snap grid for factoring trinomials $ax^2 + bx + c$. |
| **Junior High Visualizations (15 Modules)** | `MathLearn-Primary` | `index.html` (15 modules: Number line, Pythagorean 3-squares, Linear function slope triangle, etc.) | No | None | **NOT INTEGRATED** | **Port**: Migrate modular HTML5 Canvas visualizers into React component suite. |
| **Primary School Visualizations (4 Modules)** | `MathLearn-Primary` | `primary.html` (Fraction merger, Parallelogram shear, Circle quadrature, Chicken-Rabbit) | No | None | **NOT INTEGRATED** | **Port**: Migrate 4 primary geometric proof visualizers into React component suite. |
| **Procedural Web Audio Sound Effects** | `MathLearn-Primary` | `index.html`<br>`primary.html` | No | None | **NOT INTEGRATED** | **Reuse**: Port procedural Web Audio click and chime synthesizer into frontend utility. |
| **ClearSpeak Mathematical Speech Rules** | `MathCAT` | `src/speech.rs`<br>`Rules/Languages/en/ClearSpeak_Rules.yaml` | Partial | `backend/src/orchestrator/adapters/mathcat_adapter.py` (207 lines custom regex) | **NOT INTEGRATED** | **Replace**: Compile MathCAT Rust crate to WASM or Python bindings (`cffi`/`pyo3`) to use official DAISY rules. |
| **SimpleSpeak Speech Rules** | `MathCAT` | `src/speech.rs`<br>`Rules/Languages/en/SimpleSpeak_Rules.yaml` | No | None | **NOT INTEGRATED** | **Replace**: Expose SimpleSpeak style selection via MathCAT WASM/native binding. |
| **Nemeth Mathematical Braille Translation** | `MathCAT` | `src/braille.rs`<br>`Rules/Braille/Nemeth/` | Partial | `backend/src/orchestrator/adapters/mathcat_adapter.py` (lookup table mock) | **NOT INTEGRATED** | **Replace**: Replace static dictionary mock with MathCAT's official MathML-to-Nemeth translation. |
| **UEB Technical Braille Translation** | `MathCAT` | `src/braille.rs`<br>`Rules/Braille/UEB/` | Partial | `backend/src/orchestrator/adapters/mathcat_adapter.py` (lookup table mock) | **NOT INTEGRATED** | **Replace**: Replace mock with MathCAT's official UEB translation engine. |
| **Mathematical Subexpression Tree Navigation** | `MathCAT` | `src/navigate.rs:do_navigate_keypress()` | No | None | **NOT INTEGRATED** | **Build/Port**: Integrate MathCAT hierarchical navigation for keyboard tree exploration in notebook. |
| **Semantic Intent Inference (MathML Intent)** | `MathCAT` | `src/infer_intent.rs` | No | None | **NOT INTEGRATED** | **Build/Port**: Utilize intent engine to disambiguate exponents vs footnote indices. |
| **Multimodal Accessible Chart Component** | `MAIDR` | `src/maidr-component.tsx`<br>`src/index.tsx` | No | None | **NOT INTEGRATED** | **Adapt**: Encapsulate MAIDR in an isolated micro-frontend or iframe to respect GPL-3.0 isolation. |
| **Auditory Curve Sonification** | `MAIDR` | `src/service/audio.ts`<br>`src/service/audioPalette.ts` | Partial | `backend/src/orchestrator/adapters/maidr_adapter.py`<br>`frontend/src/components/AccessibilityPanel.tsx:68` | **PARTIALLY INTEGRATED** | **Adapt**: Connect frontend Web Audio oscillator to dynamic plot curves rather than static 21 parabola points. |
| **2D Spatial Keyboard Chart Navigation** | `MAIDR` | `src/service/keybinding.ts` | No | None | **NOT INTEGRATED** | **Port/Build**: Implement spatial arrow-key curve exploration with pitch feedback. |
| **Tactile Graphics Output (DotPad/Monarch)** | `MAIDR` | `src/service/dotPadSession.ts`<br>`src/service/monarchSession.ts` | No | None | **NOT INTEGRATED** | **Adapt**: Expose tactile graphics raster export for refreshable hardware. |
| **Statistical Extrema & Root Auto-Seeking** | `MAIDR` | `src/service/goToExtrema.ts` | No | None | **NOT INTEGRATED** | **Build**: Integrate calculus extrema detection with sonification beacon cues. |
| **3D Glowing Neon Landmark Skeleton Player** | `Sixth-Sense` | `js/playback.js` | Yes | `frontend/src/components/ISLSkeletonViewer.tsx`<br>`frontend/src/components/ISLSkeletonViewer.css` | **FULLY INTEGRATED** | **Keep Unchanged**: Neon bones, face contours, and animation loops operate seamlessly in React. |
| **Preset Landmark Gesture Library** | `Sixth-Sense` | `data/preset-references.json` | Yes | `frontend/public/models/sixth-sense/preset-references.json` | **FULLY INTEGRATED** | **Keep Unchanged**: 106 gesture presets loaded and played by skeleton viewer. |
| **Multi-Layer Mathematical Step Gestures** | Custom / `Sixth-Sense` | Custom Extension | Yes | `backend/src/orchestrator/adapters/sixth_sense_adapter.py` | **FULLY INTEGRATED** | **Keep Unchanged**: Layer 1 (State), Layer 2 (Action), Layer 3 (Pedagogy) fully active. |
| **Webcam Landmark Extraction (MediaPipe)** | `Sixth-Sense` | `js/recognition.js` (`HolisticLandmarker`) | No | None | **NOT INTEGRATED** | **Adapt**: Add client-side MediaPipe Tasks Vision pipeline for webcam gesture input. |
| **DTW Gesture Recognition Engine** | `Sixth-Sense` | `js/recognition.js` (Dynamic Time Warping) | No | None | **NOT INTEGRATED** | **Adapt**: Port sliding-window DTW algorithm to Web Worker for sign-to-math recognition. |
| **Multilingual Neural Translation** | `Sixth-Sense` | `js/translate.js` (Bhashini, MyMemory) | No | None | **NOT INTEGRATED** | **Adapt**: Connect Bhashini API for Indian regional language localization. |
| **Voice-to-Mathematical Expression Normalizer** | `None` | `None` | No | None (`App.tsx` voice button only pipes raw text) | **NOT AVAILABLE** | **Build from Scratch**: Implement AST normalizer converting spoken words ("x squared") into LaTeX. |
| **MathLive / Visual Math Keyboard** | `None` | `None` | No | None (Only standard text input and freehand canvas) | **NOT AVAILABLE** | **Build from Scratch**: Integrate `mathlive` library for structured formula editing. |
| **Concept-First Mastery Gating System** | `None` | `None` | No | None (Prerequisites shown as passive UI pills) | **NOT AVAILABLE** | **Build from Scratch**: Implement active learning gate requiring prerequisite check before revealing answer. |
| **ADHD Focus Mode & Step Chunking** | `None` | `None` | Partial | `frontend/src/components/StudentProfileModal.tsx` (Toggle flag exists, but UI unadapted) | **PARTIALLY INTEGRATED** | **Build from Scratch**: Implement progressive disclosure, focus spotlights, and visual countdowns. |
| **Unified Student Progress SQL Persistence** | `None` | `None` | No | None (State saved only in browser localStorage) | **NOT AVAILABLE** | **Build from Scratch**: Implement SQLite/PostgreSQL schema storing student mastery state across sessions. |

---

## 3. Deep-Dive Code Inspections & Execution Path Traces

### Feature 1: Handwriting Recognition (Ink-On vs MathAI)
- **Original Source**: `Ink-On/src/core/inference.worker.ts`, `Ink-On/src/core/inference.ts`.
- **MathAI Reality**:
  - Model files `encoder_int8.onnx` and `decoder_int8.onnx` were copied into `MathAI/frontend/public/models/ink-on/comer/`.
  - However, inspecting `MathAI/frontend/package.json` confirms `onnxruntime-web` is **not installed**.
  - Tracing `MathAI/frontend/src/App.tsx:96-124` reveals that when strokes are drawn on `MathCanvas.tsx`, the debounced handler extracts a PNG data URL via `exportCanvasRef.current()` and makes an HTTP POST request to `/api/recognize`.
  - In `backend/src/api/routes.py:105-148`, `/api/recognize` forwards the image to an external cloud Vision LLM API (`settings.vision_llm_model`).
  - **Audit Verdict**: Status is **PRESENT BUT UNUSED** for the CoMER model, and **NOT INTEGRATED** for the local inference pipeline.

### Feature 2: Adaptive Learning & Mastery (Mathua vs MathAI)
- **Original Source**: `Mathua/internal/fsrs/`, `Mathua/internal/mastery/`, `Mathua/data/concepts/`.
- **MathAI Reality**:
  - `backend/src/orchestrator/adapters/mathua_adapter.py` locates `Mathua/data/concepts/*.json` and loads concept IDs into an in-memory dictionary `self._concepts`.
  - However, tracing `process()` in `mathua_adapter.py:175-190` shows it only extracts prerequisite IDs for a detected topic (e.g. `quadratic_equations`) and attaches them to `umr.learning.prerequisites`.
  - `umr.learning.mastery_status` is hardcoded to `"assessing"`.
  - Mathua's Go backend, FSRS-6 spaced repetition algorithms (`fsrs.go`), mastery state machines (`machine.go`), and computerized adaptive testing engines (`internal/cat/`) are nowhere in MathAI's execution tree.
  - **Audit Verdict**: Status is **PARTIALLY INTEGRATED** (concept graph metadata only).

### Feature 3: Mathematical Visualisations (MathLearn-Primary vs MathAI)
- **Original Source**: `MathLearn-Primary/index.html` (18 modules), `MathLearn-Primary/primary.html` (4 modules).
- **MathAI Reality**:
  - Three modules have been re-implemented in React under `frontend/src/components/visualizations/`:
    - `ParabolaVisualizer.tsx`: Quadratic curve drawing, vertex tracking, discriminant calculation.
    - `EquationBalanceVisualizer.tsx`: Balance beam scale displaying algebraic balance under addition/subtraction.
    - `AlgebraTilesVisualizer.tsx`: Static grid layout representing quadratic tile areas.
  - One custom component was newly created: `GeometryDiagramVisualizer.tsx`.
  - The remaining **18 modules** from MathLearn-Primary (e.g., number line, Pythagorean theorem 3-square dissection, fraction grid mergers, chicken-rabbit feet animation) do not exist in MathAI.
  - **Audit Verdict**: 1 module **FULLY INTEGRATED** (`EquationBalanceVisualizer`), 2 modules **PARTIALLY INTEGRATED**, 18 modules **NOT INTEGRATED**.

### Feature 4: Mathematical Accessibility (MathCAT vs MathAI)
- **Original Source**: `MathCAT/src/lib.rs`, `src/speech.rs`, `src/braille.rs`, `Rules/`.
- **MathAI Reality**:
  - `backend/src/orchestrator/adapters/mathcat_adapter.py` contains 207 lines of pure Python code using regex replacements (`re.sub`) and small dictionary lookups (`NEMETH_DIGITS`, `UEB_DIGITS`).
  - It does not invoke or compile the MathCAT Rust crate. It does not parse MathML. It does not use the thousands of official DAISY ClearSpeak/SimpleSpeak rules or Nemeth braille translation matrices.
  - Furthermore, subexpression tree navigation (`do_navigate_keypress`) is completely absent.
  - **Audit Verdict**: Status is **NOT INTEGRATED** (a custom heuristic mock exists in its place).

### Feature 5: Accessible Data Visualisation (MAIDR vs MathAI)
- **Original Source**: `MAIDR/src/maidr-component.tsx`, `MAIDR/src/service/audio.ts`.
- **MathAI Reality**:
  - `backend/src/orchestrator/adapters/maidr_adapter.py` samples 21 points for quadratic functions ($y = ax^2 + bx + c$) and maps them to frequencies between 220 Hz and 880 Hz.
  - `frontend/src/components/AccessibilityPanel.tsx:68-105` plays these 21 frequencies using a basic Web Audio `OscillatorNode`.
  - The official MAIDR library (`maidr` npm package) is not installed. None of MAIDR's 40+ chart models, 2D keyboard navigation, screen reader rotor, or DotPad/Monarch tactile graphics drivers are integrated.
  - **Audit Verdict**: Status is **PARTIALLY INTEGRATED** (custom audio sonification approximation; upstream MAIDR engine not integrated).

### Feature 6: Indian Sign Language (Sixth-Sense vs MathAI)
- **Original Source**: `Sixth-Sense/js/recognition.js`, `Sixth-Sense/js/playback.js`, `Sixth-Sense/data/preset-references.json`.
- **MathAI Reality**:
  - The neon landmark playback engine from `playback.js` was ported to React in `frontend/src/components/ISLSkeletonViewer.tsx` and works cleanly.
  - `data/preset-references.json` was copied to `frontend/public/models/sixth-sense/` and extended with mathematical operator tokens.
  - Backend adapter `sixth_sense_adapter.py` provides 3-layer pedagogical step gestures (State, Action, Rationale).
  - However, forward sign recognition (webcam video $\to$ MediaPipe Holistic $\to$ DTW distance classification) was never brought over. Users cannot sign equations into the camera.
  - **Audit Verdict**: Playback is **FULLY INTEGRATED**; Webcam Recognition is **NOT INTEGRATED**.

