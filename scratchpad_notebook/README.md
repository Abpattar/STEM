# MathAI — Unified AI-Powered, Inclusive & Adaptive Mathematics Learning Platform

An intelligent, multi-modal mathematics learning environment designed for all students, including blind/low-vision, deaf/hard-of-hearing, and neurodivergent learners.

> **The Central Principle:**  
> **ONE Mathematical Problem · ONE Verified Mathematical Solution · MULTIPLE Ways of Understanding.**

---

## ✨ Integrated Specialist Systems

MathAI integrates 6 specialist mathematical technologies under a unified central orchestration engine:

1. **Ink-On (`Ink-On/`)**:
   - In-browser offline handwritten mathematical expression recognition via ONNX Runtime Web WASM/WebGPU.
   - Dual-engine recognition: offline ONNX candidate (~0.29s inference, 7.2MB model) + Groq Vision OCR fallback for handwritten word problems.
2. **Mathua (`Mathua/`)**:
   - Adaptive mathematics learning engine with a 3,015-concept Directed Acyclic Graph (DAG).
   - Dynamic prerequisite resolution and concept mastery tracking before revealing full solutions.
3. **MathLearn-Primary (`MathLearn-Primary/`)**:
   - Interactive mathematical visualisations:
     - **Parabola & Roots Curve**: Dynamic vertex, roots, and discriminant interactive graph.
     - **Algebra Tiles Area Model**: Visual factoring of trinomials $(x+p)(x+q) = x^2 + (p+q)x + pq$.
     - **Equation Balance Scale**: Physics-based balance demonstrating inverse operations.
4. **MathCAT (`MathCAT/`)**:
   - Mathematical speech synthesis (ClearSpeak, SimpleSpeak) via Web Speech API.
   - Tactile Braille generation (Nemeth Standard and Unified English Braille / UEB) from MathML.
5. **MAIDR (`MAIDR/`)**:
   - Accessible interactive graph sonification with pitch modulation ($220\,\text{Hz} - 880\,\text{Hz}$) corresponding to function values.
   - Spatial keyboard navigation (`ArrowLeft`, `ArrowRight`, `Space`) with Braille/KaTeX readouts.
6. **Sixth-Sense (`Sixth-Sense/`)**:
   - Indian Sign Language (ISL) mathematical interaction.
   - Multi-digit number decomposition ($40 \rightarrow 4, 0$) with pre-recorded 3D landmark skeleton playback (`preset-references.json`).
   - Standard educational ISL mathematical glosses (`PLUS`, `MINUS`, `EQUALS`, `SQUARED`).

---

## 🛠️ Architecture & Tech Stack

```
MathAI Universal Platform
├── Central Orchestrator (/api/orchestrate/process)
│   ├── Unified Mathematical Representation (UMR)
│   ├── Capability Registry & Routing Engine (Profile-aware)
│   ├── Workflow Manager (8-step pipeline with timeouts & fallbacks)
│   └── 6 Modular Adapters (Solver, Handwriting, Mathua, Visual, MathCAT, MAIDR, Sixth-Sense)
│
├── Frontend (React 18 + TypeScript + Vite)
│   ├── Interactive Drawing Canvas & Typed Mathematical Input
│   ├── KaTeX Strict Pedagogical Renderer (No raw programming syntax)
│   ├── Concept Learning Drawer (Mathua prerequisite chains)
│   ├── Interactive Visualizer (Parabola, Algebra Tiles, Balance Scale)
│   ├── Accessibility Accommodations Bar:
│   │   ├── 🔊 ClearSpeak Speech Narration (MathCAT)
│   │   ├── 🎵 MAIDR Curve Pitch Sonification
│   │   ├── 📋 Tactile Nemeth/UEB Braille Card
│   │   └── 🤟 ISL 3D Skeleton Landmark Player (Sixth-Sense)
│   └── Student Profile & Accommodation Settings Modal
│
└── Backend (FastAPI + Python 3.12)
    ├── SymPy Computer Algebra System (Formal solver & step equivalence verifier)
    ├── Mathua DAG Ingestion (3,015 concept nodes)
    └── Central Orchestration API & Health Check
```

---

## 🚀 Running the Application

### Backend
```bash
cd MathAI/backend
source .venv/bin/activate
PYTHONPATH=src uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd MathAI/frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser. All API requests proxy seamlessly to the FastAPI backend at port 8000.

---

## 🧪 Testing

```bash
# Backend pytest suite (47 tests)
cd MathAI/backend
.venv/bin/pytest -v

# Frontend production build
cd MathAI/frontend
npm run build
```

- **Frontend**: React 18, TypeScript, Vite, KaTeX, CSS Modules
- **Backend**: FastAPI, Python 3.12, SymPy (CAS), Pydantic v2, Uvicorn, httpx
- **AI / Vision**: Groq Vision (`qwen/qwen3.8-27b`) for handwritten math OCR and pedagogical explanation enrichment

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+) and **npm**
- **Python** (v3.11+) and **pip**
- (Optional) **Groq API Key** for handwriting OCR and word problem parsing

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -e .
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your API key inside `.env`:
   ```ini
   LLM_API_KEY=your_groq_api_key_here
   VISION_LLM_API_KEY=your_groq_api_key_here
   ```

5. Start the backend development server:
   ```bash
   uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The backend will be live at `http://localhost:8000`.

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🧪 Running Tests

The test suite validates mathematical equivalence, solver correctness across topic groups, and checks that raw programming syntax is never exposed to students.

Run all tests from the backend directory:
```bash
cd backend
.venv/bin/pytest -v
```

Tests cover:
- Step-by-step linear, quadratic, radical, and system solving
- Extraneous root detection and zero product property validation
- Raw syntax scanning (`^`, `\frac`, `sqrt(`, `**`)
- Guided practice mode and hint ladder delivery

---

## 📂 Project Structure

```
MathAI/
├── backend/
│   ├── src/
│   │   ├── api/          # FastAPI routes (/recognize, /interpret, /solve)
│   │   ├── solver/       # SymPy algebraic engine & equivalence verification
│   │   ├── teaching/     # Contextual explanations and hint generation
│   │   ├── practice/     # Student attempt checking & misconception detection
│   │   └── utils/        # Topic registry & mathematical validators
│   └── tests/            # Pytest test suite & regression fixtures
│
├── frontend/
│   ├── src/
│   │   ├── components/   # MathCanvas, MathDisplay, TypedInput, ModeToggle
│   │   ├── hooks/        # Drawing, stroke management, and API integration
│   │   ├── styles/       # Notebook, textbook, canvas, and global themes
│   │   └── utils/        # KaTeX math rendering and stroke conversion
│   └── package.json
│
├── AGENTS.md             # Core design principles and non-negotiable rules
├── PLAN.md               # Architecture design and milestone roadmap
└── PROGRESS.md           # Implementation history and phase tracking
```

---

## 📜 Pedagogical Principles

1. **Structured Expression as Source of Truth**: Internal math is maintained in an AST / SymPy representation; display strings are generated from it.
2. **SymPy Verification**: Every single transformation is mathematically verified before being displayed to the student.
3. **No Unverified Guesses**: Ambiguous intent or unconstrained variables are explained clearly rather than silently guessed.
4. **Clean Presentation**: All student-facing math is typeset with KaTeX. Raw source code and programming syntax are strictly forbidden.

---

## 📄 License

MIT License. Feel free to use and contribute!
