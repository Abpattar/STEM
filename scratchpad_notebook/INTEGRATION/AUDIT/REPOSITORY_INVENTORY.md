# Repository Inventory & Baseline Audit

**Audit Date:** November 17, 2026  
**Auditor:** DeepMind Antigravity AI Engine (Senior Software Architect & Compliance Auditor)  
**Scope:** Complete inspection of primary application `MathAI` and six upstream specialist repositories (`Ink-On`, `Mathua`, `MathLearn-Primary`, `MathCAT`, `MAIDR`, `Sixth-Sense`).

---

## 1. Local Workspace Verification

All seven required repositories were located and verified on the local filesystem within `/home/neo/Codes/MathEnvi/`. No expected repositories were missing.

```
/home/neo/Codes/MathEnvi/
├── MathAI/                 # Main Platform (Python FastAPI + React/Vite/TypeScript)
├── Ink-On/                 # Handwriting Recognition (Vue 3 / ONNX Runtime Web / CoMER)
├── Mathua/                 # Adaptive Learning Engine (Go + SymPy + 4,818 Concept DAG)
├── MathLearn-Primary/      # Interactive Mathematics Visualisations (HTML5 Canvas / Web Audio / KaTeX)
├── MathCAT/                # Mathematical Speech & Braille Engine (Rust / MathML / ClearSpeak)
├── MAIDR/                  # Multimodal Accessible Data Representations (TypeScript / React / Web Audio)
└── Sixth-Sense/            # Indian Sign Language Gesture Suite (JavaScript / MediaPipe / DTW)
```

---

## 2. Comprehensive Repository Metadata & Technical Specifications

| Repository | Git Remote URL | Branch | Latest Commit Hash & Date | Primary Languages & Frameworks | Main Entry Points | Software Licence | Total Files (Excl. Dependencies) |
|---|---|---|---|---|---|---|---|
| **MathAI** *(Main)* | `https://github.com/Abpattar/MathNoteBook.git` | `main` | `71a568ad90b936623a05c5f1a38bbe118c70ef7a`<br>*(2026-11-17 16:49:53 +0530)* | Python 3.11+, TypeScript, React 18, Vite, SymPy, FastAPI | **Backend:** `backend/src/main.py`<br>`backend/src/orchestrator/orchestrator.py`<br>**Frontend:** `frontend/src/App.tsx`<br>`frontend/src/main.tsx` | MIT License | 5,221 files |
| **Ink-On** | `https://github.com/kimseungdae/ink-on.git` | `main` | `2585994ee11fe2ed98065c555c4aae8ee9096209`<br>*(2026-02-28 20:43:54 +0900)* | TypeScript, Vue 3, HTML5 Canvas, WebAssembly (ONNX Runtime Web) | `src/main.ts`<br>`src/components/MathCanvas.vue`<br>`src/core/inference.worker.ts`<br>`src/core/inference.ts` | Apache-2.0 | 50 files |
| **Mathua** | `https://github.com/chuma-beep/mathua.git` | `main` | `a45e1224ae1daf3c9b070f7de17d34885c894aee`<br>*(2026-11-16 17:16:21 +0100)* | Go 1.22+, Python 3 (SymPy), HTMX, Alpine.js, JSON | `cmd/server/main.go`<br>`internal/fsrs/fsrs.go`<br>`internal/mastery/machine.go`<br>`grading/sympy_service.py`<br>`data/concepts/*.json` | MIT License | 9,146 files |
| **MathLearn-Primary** | `https://github.com/shinelee2014/mathlearn-primary.git` | `main` | `dd515e8e3d11d5e1371d1aba9d40421bd9d7d4d3`<br>*(2026-07-15 09:20:11 +0800)* | HTML5, Vanilla JavaScript, CSS3, Web Audio API, KaTeX CDN | `index.html` (18 Junior High Modules)<br>`primary.html` (4 Primary Modules) | MIT License | 14 files |
| **MathCAT** | `https://github.com/daisy/MathCAT.git` | `main` | `1242f0f9efc929499d9cfa4f79a9bf04c02ae485`<br>*(2026-11-16 00:25:39 -0800)* | Rust (Edition 2024), Python 3, YAML, XML | `src/lib.rs`<br>`src/interface.rs`<br>`src/speech.rs`<br>`src/braille.rs`<br>`Rules/Languages/en/` | MIT License | 860 files |
| **MAIDR** | `https://github.com/xability/maidr.git` | `main` | `285c52292a838f5e7682c8332e9ef8c81ed01b12`<br>*(2026-11-16 15:09:27 +0000)* | TypeScript, React, Emotion, Material-UI, Redux Toolkit, Web Audio API | `src/index.tsx`<br>`src/maidr-component.tsx`<br>`src/service/audio.ts`<br>`src/service/keybinding.ts`<br>`src/model/` (40+ chart models) | GNU GPL-3.0-or-later | 2,486 files |
| **Sixth-Sense** | `https://github.com/neelsomani00/Sixth-Sense.git` | `main` | `a30514d0ddb96081226978e97a58211012b56d47`<br>*(2026-11-17 15:28:35 +0530)* | Vanilla JavaScript, HTML5 Canvas, MediaPipe Vision, Web Speech API, CSS3 | `index.html`<br>`js/main.js`<br>`js/recognition.js`<br>`js/playback.js`<br>`data/preset-references.json` | GNU GPL-3.0 | 19 files |

---

## 3. Detailed Per-Repository Technical Profiles

### A. MathAI (Main Platform)
- **Architecture**: Decoupled Client-Server application.
  - **Backend**: FastAPI web server running on Python 3.11+. Utilises SymPy for symbolic algebra, Pydantic v2 for data validation, and an internal Capability-Based Orchestrator (`backend/src/orchestrator/orchestrator.py`) executing a Unified Mathematical Representation (UMR) pipeline across adapters.
  - **Frontend**: Single Page Application built with React 18, TypeScript, and Vite. Implements a responsive dark/light notebook UI with canvas stroke capture (`MathCanvas.tsx`), step-by-step solution rendering, interactive visualisers (`visualizations/`), and accessibility panels.
- **Port Status & Configuration**:
  - Backend runs on `http://localhost:8000`.
  - Frontend runs on `http://localhost:5173`.
  - API proxy configured in `frontend/vite.config.ts` forwarding `/api/*` requests to port 8000.
- **Licence**: MIT License (`MathAI/LICENSE`).

### B. Ink-On (Handwriting Recognition)
- **Architecture**: In-browser client-side mathematical expression recognition (MER) engine.
- **Core Technology**:
  - Neural Network: CoMER (Convolutional Attention Network for Mathematical Expression Recognition).
  - Runtime: ONNX Runtime Web (`onnxruntime-web`) leveraging WebAssembly SIMD and multi-threading (`navigator.hardwareConcurrency`), with optional WebGPU execution.
  - Pipeline: Web Worker (`inference.worker.ts`) executing INT8 quantized encoder (`encoder_int8.onnx`, 3.46 MB) and decoder (`decoder_int8.onnx`, 4.12 MB) with beam search decoding and vocabulary mapping (`vocab.json`).
  - Preprocessing: Canvas stroke capture, bounding box calculation, aspect-ratio preserving resizing with padding, and grayscale float32 normalization.
  - Post-processing: Syntactic LaTeX repair (`latex-repair.ts`) to fix unclosed braces, dangling exponents, and illegal command combinations.
- **Licence**: Apache License 2.0 (`Ink-On/LICENSE`).

### C. Mathua (Adaptive Learning Platform)
- **Architecture**: Full-stack adaptive mathematical mastery system.
  - **Backend Server**: High-concurrency Go HTTP server (`cmd/server/main.go`) managing session state, mastery state machines, diagnostic testing, and exercise delivery.
  - **Curriculum Knowledge Graph**: 4,818 mathematical concept nodes distributed across 25 domain JSON files in `data/concepts/` (e.g., `prealgebra.json`, `algebra1.json`, `geometry.json`, `calculus.json`, `discrete_math.json`), defining strict DAG prerequisite trees (`prerequisites`, `key_prerequisites`, `domain`, `subdomain`, `mastery_threshold`).
  - **Spaced Repetition Engine**: Native implementation of the Free Spaced Repetition Scheduler v6 (`internal/fsrs/`) tracking memory stability ($S$), difficulty ($D$), and retrievability ($R$) per concept per student.
  - **Mastery Engine**: Finite state machine (`internal/mastery/machine.go`) tracking student mastery evidence, error categorization, scaffolding levels, and progression thresholds.
  - **Grading Service**: SymPy-based microservice (`grading/sympy_service.py`) evaluating mathematical equivalence between student submissions and canonical solutions.
- **Licence**: MIT License (`Mathua/LICENSE`).

### D. MathLearn-Primary (Interactive Mathematics Demonstrations)
- **Architecture**: Ultra-lightweight, zero-dependency, single-file interactive educational demonstrations.
- **Components**:
  - `index.html`: 18 interactive modules for Junior High (Grades 7–9), including rational number lines, exponent block stacking, geometric algebraic tile dissections, balance scale linear equations, coordinate reflections, Pythagorean theorem proofs, linear function slope triangles, radical simplification animations, parabola vertex transformations, similar triangles, trigonometry, and probability experiments.
  - `primary.html`: 4 interactive modules tailored for Primary school (ages 9–12), including fraction common denominator grid merging, parallelogram shear dissection, circle quadrature / wedge exhaustion limit proof, and chicken-and-rabbit "raising feet" logic visualization.
- **Graphics & Audio**: Pure HTML5 Canvas 2D context drawing coupled with procedural Web Audio API tone synthesis (chimes, clicks, alerts) without external media assets.
- **Formula Rendering**: KaTeX via CDN with graceful Unicode fallback.
- **Licence**: MIT License (`MathLearn-Primary/LICENSE`).

### E. MathCAT (Mathematical Accessible Assistive Technology)
- **Architecture**: Industry-standard mathematical accessibility engine developed by the DAISY Consortium for screen readers (NVDA, JAWS, Orca) and braille displays.
- **Core Engine**: High-performance Rust library (`Cargo.toml`, version `0.7.9-alpha.1`).
- **Capabilities**:
  - MathML parsing and canonicalization (`src/canonicalize.rs`).
  - Semantic Intent Inference (`src/infer_intent.rs`): Identifies whether superscripts represent exponents, derivative primes, tensor indices, or footnotes.
  - Spoken Math Generation (`src/speech.rs`): Translates expressions into natural English or localized languages following **ClearSpeak** and **SimpleSpeak** standard rule sets defined in YAML/XML (`Rules/Languages/`).
  - Braille Translation (`src/braille.rs`): Generates exact 6-dot and 8-dot mathematical braille adhering to **Nemeth Code** and **Unified English Braille (UEB) Technical** specifications (`Rules/Braille/`).
  - Mathematical Tree Navigation (`src/navigate.rs`): Exposes keyboard zoom in/out/across commands (`do_navigate_keypress`) enabling visually impaired users to traverse deep algebraic syntax trees hierarchically.
- **Licence**: MIT License (`MathCAT/Cargo.toml`, `MathCAT/LICENSE`).

### F. MAIDR (Multimodal Access and Interactive Data Representation)
- **Architecture**: Enterprise-grade accessible data visualization suite developed at Carnegie Mellon University / University of Washington.
- **Core Technology**: TypeScript / React library (`package.json`, version `4.18.0`).
- **Capabilities**:
  - Multimodal Representations: Visual rendering, auditory sonification, refreshable braille displays, and tactile graphics.
  - Sonification Engine (`src/service/audio.ts`, `audioPalette.ts`): Continuous frequency tone mapping ($220-880\text{ Hz}$), stereo spatial panning, volume modulation, and timbre harmonic synthesis for multi-series charts.
  - 2D Spatial Keyboard Navigation (`src/service/keybinding.ts`): Arrow-key traversal across points, axes, and clusters with auditory beacon feedback.
  - Tactile Graphics Support: Direct driver protocols for **DotPad** (`src/service/dotPadSession.ts`) and **Monarch** (`src/service/monarchSession.ts`) multiline refreshable tactile pin arrays.
  - Automated Descriptions (`src/service/description.ts`, `text.ts`): Statistical summary generation, extrema detection (`goToExtrema.ts`), and screen reader rotor integration (`rotor.ts`).
  - Chart Models (`src/model/`): Over 40 standard chart types supported (line, bar, scatter, boxplot, histogram, heatmap, directed graph, etc.).
- **Licence**: GNU General Public License v3.0 or later (**GPL-3.0-or-later**) (`MAIDR/package.json`, `MAIDR/LICENSE`).

### G. Sixth-Sense (Indian Sign Language Communication Suite)
- **Architecture**: Real-time bidirectional Indian Sign Language (ISL) communication tool.
- **Core Components**:
  - 3D Skeleton Visualiser (`js/playback.js`): Canvas-based neon glowing skeleton animator rendering hand bones, face contours, and pose vectors from landmark keyframes.
  - Gesture Dataset (`data/preset-references.json`): 106 reference gestures containing normalized 3D coordinate trajectories for digits 0–9, English alphabet A–Z, common words, and mathematical symbols (`+`, `-`, `*`, `/`, `^2`, `\sqrt`, `\pi`, `\pm`, `\le`, `\ge`, `BALANCE`, `SIMPLIFY`).
  - Computer Vision Pipeline (`js/recognition.js`): In-browser real-time landmark extraction via `@mediapipe/tasks-vision` (`HolisticLandmarker`).
  - Recognition Engine: Continuous sliding capture window (2,000 ms) with Dynamic Time Warping (DTW) distance metric matching against reference landmark sets.
  - Translation & Speech: Multi-provider language translation (`js/translate.js` via Bhashini, Chrome Translator API, MyMemory) and speech synthesis/recognition (`js/speech.js`).
- **Licence**: GNU General Public License v3.0 (**GPL-3.0**) (`Sixth-Sense/LICENSE`).

---

## 4. Repository Integrity & Working Tree Verification

All repositories were inspected with `git status` to ensure clean baseline states:
- All upstream repositories (`Ink-On`, `Mathua`, `MathLearn-Primary`, `MathCAT`, `MAIDR`) are clean without unstaged modifications.
- `Sixth-Sense` contains one local commit (`a30514d`) authored by `Abpattar` which populated mathematical symbol landmark presets into `data/preset-references.json`.
- `MathAI` is actively tracking working branch `main` at commit `71a568a`.

