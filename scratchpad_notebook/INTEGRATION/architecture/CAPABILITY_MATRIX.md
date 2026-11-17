# MathAI Capability Matrix & Repository Overlap Analysis

**Project:** MathAI — Universal Inclusive Mathematics Platform  
**Date:** November 2026  
**Status:** Approved Architecture Baseline  

---

## 1. Overview of Evaluated Repositories

| Repository | Primary Technology | Core Capability | Unique Specialism |
|:---|:---|:---|:---|
| **MathAI** (Core) | React, TypeScript, FastAPI, SymPy, KaTeX | Complete interactive notebook, SymPy CAS solver, KaTeX rendering, Vision OCR, guided practice, misconception detection. | Mathematical ground truth, step equivalence verification, student interface. |
| **Ink-On** | TypeScript, ONNX Runtime Web, WASM, CoMER | In-browser offline handwritten math expression recognition (INT8 models ~7.2MB). | Zero-latency, client-side, zero-API-cost formula recognition. |
| **Mathua** | Go, Next.js, JSON DAG taxonomy | Adaptive mathematics curriculum, 3,015+ concept nodes, prerequisite DAG, mastery units. | Curriculum dependency mapping, prerequisite identification. |
| **MathLearn-Primary**| Vanilla HTML5, Canvas, SVG, KaTeX | Interactive visual math models (equation balance, parabolas, algebra tiles, cuts & rearrangements). | Dynamic geometrical and algebraic intuition tools. |
| **MathCAT** | Rust, MathML, YAML speech/Braille rules | Mathematical speech synthesis (ClearSpeak, SimpleSpeak) & Braille translation (Nemeth, UEB). | Screen-reader independent math speech and Braille encoding. |
| **MAIDR** | TypeScript, Web Audio API, SVG, Braille | Accessible charts and graphs (sonification, tactile Braille, keyboard traversal). | Audio pitch mapping and accessible data visualization. |
| **Sixth-Sense** | Vanilla JS, MediaPipe Holistic, DTW | Two-way Indian Sign Language prototype using 3D landmark template matching. | Camera gesture recognition for digits/letters and animated skeleton sign playback. |

---

## 2. Feature-by-Feature Detailed Comparison

### A. Mathematical Solving & Step Verification
- **MathAI:** SymPy CAS-based solver with strict formal equivalence checking (`equivalence_check`, `substitution`, `sympy_verify`). Covers linear, quadratic, radicals, systems, fractions, inequalities. **100% verified steps**.
- **Others:** None of the specialist repositories have a formal CAS engine (Mathua uses simple numeric/expression graders; MathLearn uses hardcoded formulas; MathCAT parses MathML; MAIDR handles chart data).
- **Decision:** **RETAIN MathAI's SymPy solver as the SOLE source of mathematical truth**. Never replace it with LLM approximations or hardcoded strings.

### B. Handwriting Recognition
- **MathAI:** Currently uses Groq Vision LLM (`qwen/qwen3.8-27b`) via `/api/recognize`. High accuracy on complex handwritten word problems and mixed equations, but requires active internet connection, API keys, and is vulnerable to HTTP 429 rate limits.
- **Ink-On:** 100% client-side ONNX Runtime Web WASM inference. Ultra-fast, zero token cost, zero rate limits, works completely offline. Specialised for mathematical expressions. Does NOT handle arbitrary handwritten English word problems.
- **Decision:** **INTEGRATE Ink-On as a candidate client-side handwriting provider**.
  - Pipeline: Client checks input type. Mathematical expressions can be recognized instantly in-browser using Ink-On.
  - If Ink-On confidence is high, use result immediately.
  - If input contains handwritten text/word problems, or if Ink-On fails, gracefully fallback to MathAI's Vision OCR.
  - Retain both providers behind a common `HandwritingAdapter`.

### C. Curriculum & Concept Dependencies
- **MathAI:** Has basic `TopicRegistry` (linear, quadratic, systems, radicals, geometry, statistics) without deep concept dependency graphs.
- **Mathua:** Features an extensive, professionally structured DAG of 3,015+ concepts across arithmetic, algebra, geometry, and calculus (`Mathua/data/concepts/*.json`). Tracks prerequisite chains (e.g. `alg.quad.solve_factor` requires `alg.factor.trinomial` which requires `alg.mult.binomial`, etc.).
- **Decision:** **INTEGRATE Mathua's Concept DAG**.
  - Extract and ingest `Mathua/data/concepts/*.json` into MathAI's backend orchestrator via `MathuaAdapter`.
  - When a student enters $x^2 + 5x + 6 = 0$, the orchestrator queries `MathuaAdapter` to return required prerequisites (Variables, Coefficients, Factoring Trinomials, Zero-Product Property).
  - Do NOT import Mathua's full Go server or Next.js web application.

### D. Mathematical Visualisation
- **MathAI:** Has backend SVG generators for geometry (triangles, circles, cylinders, coordinate planes).
- **MathLearn-Primary:** Provides interactive HTML5 Canvas visual modules:
  1. **Equation Balance**: Demonstrates two-step linear equations as a balanced scale.
  2. **Quadratic Parabola & Roots**: Interactive sliders for $a, b, c$, visualizing how roots correspond to x-intercepts and how the discriminant $\Delta$ changes shape.
  3. **Algebra Tiles / Complete Square**: Area cut-and-rearrange representations.
- **Decision:** **INTEGRATE MathLearn-Primary components**.
  - Port selected visual interactive modules into modular React components in `MathAI/frontend/src/components/visualizations/`.
  - Link them dynamically to the solution steps produced by the orchestrator.

### E. Speech & Braille Accessibility
- **MathAI:** KaTeX visual rendering only; no math-specific speech or Braille synthesis.
- **MathCAT:** Gold standard for MathML to speech (ClearSpeak, SimpleSpeak) and Braille (Nemeth code, Unified English Braille / UEB).
- **Decision:** **INTEGRATE MathCAT capability**.
  - Generate MathML representations from SymPy AST / LaTeX.
  - Provide a Python-based `MathCATAdapter` executing ClearSpeak/SimpleSpeak rules and Nemeth/UEB Braille generation.
  - Deliver accessible audio readout and Braille strings on every step for blind and low-vision learners.

### F. Graph Sonification & Chart Accessibility
- **MathAI:** Renders static SVG charts (bar charts, coordinate planes).
- **MAIDR:** Adds sonification (pitch mapped to y-values), keyboard spatial navigation, and Braille output to SVG charts and plots.
- **Decision:** **INTEGRATE MAIDR via isolated adapter**.
  - When MathAI renders a coordinate plane, function plot, or statistical chart, activate the `MAIDRAdapter`.
  - Due to GPL-3.0 licensing, load MAIDR dynamically on the client side at runtime without mixing GPL code into MathAI's bundle.

### G. Indian Sign Language (ISL) Interaction
- **MathAI:** No sign language support.
- **Sixth-Sense:** In-browser MediaPipe Holistic landmark detection + DTW template matcher for 40 signs (digits 0-9, 10, letters A-Z, HELLO, HELP, SOS). Animated skeleton playback.
- **Decision:** **INTEGRATE Sixth-Sense for validated mathematical vocabulary**.
  - Support sign-based digit and variable entry (e.g. entering digits 0-9, variables x, y, and basic commands).
  - Honestly communicate vocabulary limits: clearly state that arbitrary mathematical sign translation is not yet supported.
  - Keep Sixth-Sense isolated to comply with GPL-3.0.

---

## 3. Summary of Retain, Replace, Integrate

| Component | Status | Source / Target | Reason |
|:---|:---|:---|:---|
| **SymPy Solver & Verifier** | **RETAIN** | MathAI | Rigorous algebraic truth; no other repo has formal equivalence verification. |
| **KaTeX Pedagogical Rendering**| **RETAIN** | MathAI | Strict pedagogical rule: never expose raw syntax to students. |
| **Canvas & Drawing Interface** | **RETAIN** | MathAI | Excellent touch/mouse drawing with undo/redo and responsive viewport. |
| **Misconception Catalogue** | **RETAIN** | MathAI | Diagnoses specific student errors (MC-001 through MC-010). |
| **Groq Vision LLM OCR** | **RETAIN (Fallback)**| MathAI | Essential for natural language word problems and ambiguous drawings. |
| **In-Browser ONNX Math OCR** | **INTEGRATE** | Ink-On | Offline, zero-latency, rate-limit resilient handwriting recognition for expressions. |
| **Concept Dependency DAG** | **INTEGRATE** | Mathua | 3,015+ concept nodes with prerequisite chains and mastery units. |
| **Interactive Visual Models** | **INTEGRATE** | MathLearn-Primary| Dynamic equation balance, parabola roots slider, algebra tiles. |
| **Math Speech & Braille** | **INTEGRATE** | MathCAT | ClearSpeak speech synthesis & Nemeth/UEB Braille generation from MathML. |
| **Accessible Graph Sonification**| **INTEGRATE**| MAIDR | Multi-modal access (sonification, tactile braille) for graphs/plots. |
| **ISL Digit/Variable Input** | **INTEGRATE** | Sixth-Sense | Landmark gesture recognition for supported digits & variables. |

---

## 4. What Cannot Realistically Be Integrated (Honest Limitations)

1. **Full Natural Language ISL Translation**: Sixth-Sense uses simple DTW on 40 template signs. It cannot translate complex calculus expressions or continuous grammatical sign sentences. We limit ISL integration to supported digits, variables, and verified action signs.
2. **Rust Cargo Compilation in Environment**: System lacks native `cargo` and `rustc`. Therefore, the MathCAT integration uses a faithful Python implementation of the MathCAT speech and Braille rules directly rather than relying on uncompiled native Rust binaries.
3. **Full Mathua Microservice Deployment**: Running Mathua's full Go server and database is unnecessary overhead. The concept DAG and prerequisite taxonomy are cleanly decoupled and ingested directly via Python.

