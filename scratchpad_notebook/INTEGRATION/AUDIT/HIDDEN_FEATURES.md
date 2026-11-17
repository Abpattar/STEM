# Hidden Features Worth Integrating

**Audit Date:** November 17, 2026  
**Auditor:** DeepMind Antigravity AI Engine  
**Objective:** Identification and technical analysis of high-value capabilities present in the six external repositories that have not yet been integrated into MathAI.

---

## 1. Executive Overview

During the deep-dive source code audit, several sophisticated, high-impact capabilities were discovered across the upstream repositories. These capabilities extend far beyond basic math solving and UI displays. They address fundamental cognitive, pedagogical, and accessibility challenges in digital mathematics education.

The table below summarizes the top hidden capabilities, ranked by educational impact:

| # | Capability | Source Repository | Local Code Status | MathAI Status | Integration Effort | Primary Educational Value |
|---|---|---|---|---|---|---|
| 1 | **Hierarchical Math Expression Tree Navigation** | `MathCAT` | Fully implemented in Rust (`src/navigate.rs`) | Completely Absent | Medium (WASM Bridge) | Enables blind/low-vision and ADHD students to explore complex formulas layer by layer using keyboard zoom. |
| 2 | **FSRS-6 Spaced Repetition Engine** | `Mathua` | Fully implemented in Go (`internal/fsrs/`) | Schema only, no engine | Low–Medium (Python Port) | Predicts exact forgetting curves to schedule timely prerequisite reviews before frustration occurs. |
| 3 | **Client-Side ONNX Web Worker & IndexedDB Caching** | `Ink-On` | Fully implemented in TS (`src/core/`) | Models copied, unexecuted | Medium (Worker Setup) | Zero-latency, zero-cost, private offline handwriting recognition running directly in the browser. |
| 4 | **Tactile Graphics Drivers (DotPad & Monarch)** | `MAIDR` | Fully implemented in TS (`src/service/dotPad*`) | Completely Absent | Medium (Driver Bridge) | Outputs physical geometric curves and function plots to refreshable tactile pin displays for blind students. |
| 5 | **Interactive Geometric Dissection Proofs** | `MathLearn-Primary` | Fully implemented in HTML/JS (`primary.html`) | Absent (Only 3 high-school modules ported) | Low (React Port) | Visual proofs of circle area limit convergence, parallelogram shearing, and Pythagorean squares. |
| 6 | **Semantic Math Intent Inference** | `MathCAT` | Fully implemented in Rust (`src/infer_intent.rs`)| Completely Absent | Medium (WASM Bridge) | Disambiguates whether superscripts mean powers, derivatives, or indices, preventing erroneous speech/braille. |
| 7 | **Computerized Adaptive Testing (CAT) Diagnostic Engine** | `Mathua` | Fully implemented in Go (`internal/cat/`) | Completely Absent | Medium (Python Port) | Diagnoses student knowledge gaps across 4,818 concepts in 5–8 targeted questions instead of 50. |
| 8 | **Webcam Gesture Recognition via MediaPipe & DTW** | `Sixth-Sense` | Fully implemented in JS (`js/recognition.js`) | Only playback ported | Medium–High (Web Worker DTW) | Allows non-verbal or motor-impaired students to sign mathematical operators directly into the webcam. |
| 9 | **Automated Extrema & Root-Seeking Sonification** | `MAIDR` | Fully implemented in TS (`src/service/goToExtrema.ts`) | Only static parabola sampled | Low (Hook into SymPy roots) | Auditory beacon navigation that guides students with pitch cues directly to function zeroes and vertices. |
| 10 | **Bhashini Regional Language Neural Pipeline** | `Sixth-Sense` | Fully implemented in JS (`js/translate.js`) | Completely Absent | Low (API Client) | Provides high-quality educational translation and speech across 22 official Indian languages. |

---

## 2. Detailed Technical Breakdown of Hidden Capabilities

### Capability 1: Hierarchical Mathematical Expression Tree Navigation
- **What it does in simple language:**
  Instead of reading a long, confusing formula as a flat string of words, this feature treats math like a tree. A student can press down-arrow to "zoom in" to a numerator, navigate left/right through individual terms, and press up-arrow to zoom back out to the full fraction.
- **Providing Repository:** `MathCAT` (`src/navigate.rs`, `do_navigate_keypress()`, `do_navigate_command()`).
- **Local Implementation Status:** Fully implemented in the upstream Rust codebase with full test suites.
- **MathAI Current State:** Completely absent. MathAI currently only treats expressions as static LaTeX strings or flat audio readings.
- **Integration Difficulty:** **Medium**. Requires compiling `MathCAT` to WebAssembly (`wasm-pack`) and attaching keyboard event listeners to the notebook's active math container.
- **Why it would improve MathAI:**
  This is the gold standard for mathematical accessibility worldwide. It revolutionizes learning for blind students and dramatically reduces cognitive overload for students with ADHD or dyscalculia by letting them inspect equations in bite-sized chunks.

### Capability 2: Free Spaced Repetition Scheduler v6 (FSRS-6)
- **What it does in simple language:**
  It tracks how quickly a student's brain forgets each specific mathematical concept. It uses modern spaced repetition algorithms (more accurate than Anki's SM-2) to determine the exact optimal day a student should review a prerequisite concept before tackling harder material.
- **Providing Repository:** `Mathua` (`internal/fsrs/fsrs.go`, `curve.go`, `stability.go`, `difficulty.go`).
- **Local Implementation Status:** Fully operational Go implementation with mathematical reference test vectors.
- **MathAI Current State:** MathAI has a `StudentProfile` schema with an `fsrs_weights` field, but zero scheduling logic or database state machines exist.
- **Integration Difficulty:** **Low to Medium**. The Go math can be ported directly into Python (`backend/src/learning/fsrs.py`) in under 300 lines of code.
- **Why it would improve MathAI:**
  It transforms MathAI from a one-off homework helper into a persistent, intelligent tutor that ensures long-term retention and mastery of foundational math.

### Capability 3: Offline In-Browser ONNX Inference with IndexedDB Model Caching
- **What it does in simple language:**
  Runs handwriting recognition 100% inside the student's browser on their local CPU or GPU using WebAssembly SIMD or WebGPU. It downloads the 7.6 MB AI model once, stores it in the browser's persistent IndexedDB cache, and recognizes handwritten math without needing an internet connection or cloud API tokens.
- **Providing Repository:** `Ink-On` (`src/core/inference.ts`, `src/core/inference.worker.ts`, `src/core/model-cache.ts`).
- **Local Implementation Status:** Production-ready in `Ink-On/src/core/`.
- **MathAI Current State:** The INT8 model files were copied to `frontend/public/models/ink-on/comer/`, but no worker or inference code was wired up. MathAI currently relies on a paid cloud Vision LLM API for canvas OCR.
- **Integration Difficulty:** **Medium**. Requires installing `onnxruntime-web` in `frontend/package.json`, creating a Vite Web Worker, and feeding canvas strokes to it.
- **Why it would improve MathAI:**
  - **Zero latency**: Recognition happens in ~150 ms locally rather than 2,000–4,000 ms over the cloud.
  - **Zero cloud cost**: Eliminates API bills for every stroke drawn.
  - **Complete student privacy**: Children's handwriting never leaves their local device.
  - **Works offline**: Essential for schools and rural areas with intermittent connectivity.

### Capability 4: Tactile Graphics Drivers (DotPad & Monarch Support)
- **What it does in simple language:**
  Directly controls hardware tactile graphic displays (such as the DotPad or American Printing House Monarch) to physically push up thousands of tiny mechanical pins, allowing completely blind students to feel geometry diagrams, triangles, and parabolic curves with their fingertips.
- **Providing Repository:** `MAIDR` (`src/service/dotPadSession.ts`, `src/service/monarchSession.ts`, `src/service/tactileDisplay.ts`).
- **Local Implementation Status:** Fully implemented in MAIDR TypeScript source.
- **MathAI Current State:** Completely absent.
- **Integration Difficulty:** **Medium**. Can be wrapped in an isolated module that sends tactile pin-array rasters over WebHID or WebSerial.
- **Why it would improve MathAI:**
  Establishes MathAI as a world-leading accessible STEM platform capable of serving blind schools and specialized learning centers.

### Capability 5: Elementary Geometric Dissection & Limit Proofs
- **What it does in simple language:**
  Interactive visual experiments that make abstract geometry self-evident through animated transformations:
  1. *Circle Quadrature*: Interlocking sector teeth (8 to 64 slices) that morph a circle into a rectangle of height $r$ and width $\pi r$.
  2. *Parallelogram Shearing*: Cutting along the altitude and sliding the piece to turn a slanted parallelogram into a rectangle.
  3. *Chicken-and-Rabbit Feet Lifting*: Visualizing simultaneous equations by watching animals raise two feet.
- **Providing Repository:** `MathLearn-Primary` (`primary.html`).
- **Local Implementation Status:** Standalone HTML5 Canvas implementations ready in `MathLearn-Primary/primary.html`.
- **MathAI Current State:** Only high-school algebra visualizers were ported. Primary school geometric proofs were skipped entirely.
- **Integration Difficulty:** **Low**. Straightforward conversion of 2D canvas drawing loops into modular React components in `frontend/src/components/visualizations/`.
- **Why it would improve MathAI:**
  Fills a massive curriculum void for young learners (Grades 3–6), building strong geometric intuition before symbolic algebra is introduced.

### Capability 6: Semantic Mathematical Intent Inference
- **What it does in simple language:**
  Analyzes the grammatical context of a formula to deduce what ambiguous notations actually mean. For example, it detects whether $f'(x)$ means "f prime of x" (calculus derivative) or an apostrophe, and whether $H_2O$ is chemical subscripts or coordinate vectors.
- **Providing Repository:** `MathCAT` (`src/infer_intent.rs`).
- **Local Implementation Status:** Complete in Rust.
- **MathAI Current State:** Completely absent.
- **Integration Difficulty:** **Medium**. Bundled as part of the MathCAT WASM compilation.
- **Why it would improve MathAI:**
  Prevents screen readers and speech engines from making absurd, confusing pronunciation errors when reading higher-level mathematics to students.

### Capability 7: Computerized Adaptive Testing (CAT) Diagnostic Engine
- **What it does in simple language:**
  A smart testing algorithm that dynamically selects questions based on previous answers: if a student gets a question right, it presents a slightly harder one; if wrong, it immediately drops to prerequisite sub-skills to isolate the exact gap.
- **Providing Repository:** `Mathua` (`internal/cat/`, `internal/diagnostic/`).
- **Local Implementation Status:** Complete in Go.
- **MathAI Current State:** Completely absent.
- **Integration Difficulty:** **Medium**. Porting the Bayesian or Item Response Theory logic into Python backend routes.
- **Why it would improve MathAI:**
  Enables instant 3-minute onboarding assessments that map out a student's entire prerequisite graph without forcing them through tedious 40-question generic tests.

### Capability 8: Webcam Indian Sign Language Input (MediaPipe + DTW)
- **What it does in simple language:**
  Uses the student's webcam to track their hands and body in real time, compares their movement trajectory against 106 reference gestures using Dynamic Time Warping, and outputs the recognized math symbol directly into the notebook.
- **Providing Repository:** `Sixth-Sense` (`js/recognition.js`).
- **Local Implementation Status:** Complete in vanilla JavaScript utilizing `@mediapipe/tasks-vision`.
- **MathAI Current State:** MathAI only ported the *reverse playback* (skeleton viewer). The *input recognition* was left behind.
- **Integration Difficulty:** **Medium to High**. Requires loading the MediaPipe Vision bundle in a separate thread/worker and managing webcam permissions and framerate throttling.
- **Why it would improve MathAI:**
  Enables fully hands-free, accessible interaction for deaf, mute, or motor-impaired students who communicate primarily via Indian Sign Language.

