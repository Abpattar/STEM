# 🚀 STEM Unified Learning Platform

A comprehensive, multimodal STEM educational suite combining conversational voice exploration, multimodal math scratchpad with handwriting recognition & step-by-step solving, and interactive 3D science simulations.

---

## 🏛️ Integrated Architecture

```
                               ┌───────────────────────────────────────────────────┐
                               │           Explaino (Nilo) Main Platform           │
                               │                (Vite + React 19)                  │
                               │              http://localhost:5173                │
                               └─────────────────────────┬─────────────────────────┘
                                                         │
             ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
             │                                           │                                           │
             ▼                                           ▼                                           ▼
┌──────────────────────────────┐            ┌──────────────────────────────┐            ┌──────────────────────────────┐
│       Math Scratchpad        │            │       EXO Voice Agent        │            │  Science Kingdom Digital Lab │
│   (Abpattar/MathNoteBook)    │            │      (Apu-g/voiceagent)      │            │  (Chauhanrajk007/science)    │
├──────────────────────────────┤            ├──────────────────────────────┤            ├──────────────────────────────┤
│ • Frontend (Port 5174)       │            │ • Next.js 16 + Turbopack     │            │ • Vite + React 19 (Port 5175)│
│ • FastAPI Backend (Port 8000)│            │ • Port 3000                  │            │ • Three.js 3D Simulations    │
│ • SymPy Solver + OCR Vision  │            │ • Socratic Voice Dialogue    │            │ • Physics, Chem, Bio Labs    │
│ • Gesture & Canvas drawing   │            │ • Sarvam & Groq Multilingual │            │ • Senku Interactive Guide    │
└──────────────────────────────┘            └──────────────────────────────┘            └──────────────────────────────┘
```

---

## 📁 Repository Structure

- `main_explaino/`: Main Explaino platform UI shell with radial stage, dashboard, and unified service integration.
- `scratchpad_notebook/`:
  - `backend/`: FastAPI Python server with SymPy solver, Groq LLM, and Gemini Vision handwriting OCR.
  - `frontend/`: React canvas app with KaTeX rendering, stroke recognition, and topic hints.
- `voice_agent/`: Full Next.js 16 app with voice input/TTS, learning roadmaps, textbook viewer, and study rooms.
- `digital_lab/`: 3D Science Kingdom laboratory workbench featuring Physics, Chemistry, and Biology experiments.

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
# Install root orchestrator dependencies
npm install

# Install subproject dependencies
npm --prefix main_explaino install
npm --prefix scratchpad_notebook/frontend install
npm --prefix digital_lab install
npm --prefix voice_agent install

# Setup Python backend for scratchpad
cd scratchpad_notebook/backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt # or fastapi uvicorn sympy httpx pydantic pydantic-settings python-dotenv
```

### 2. Configure Environment Variables
- `scratchpad_notebook/backend/.env`: Provide `LLM_API_KEY` (Groq) and `GEMINI_API_KEY`.
- `voice_agent/.env.local`: Provide `MONGODB_URI`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, and `SARVAM_API_KEY`.
- `main_explaino/.env`: Configures service endpoints (`5174`, `3000`, `5175`).

### 3. Run Everything (One Command)
```bash
npm run dev
```
*(Or run `start_all.bat` on Windows)*

The services will be available at:
- **Main Portal:** http://localhost:5173
- **Math Scratchpad:** http://localhost:5174
- **FastAPI Math Solver:** http://localhost:8000
- **Voice Agent:** http://localhost:3000
- **Digital Lab:** http://localhost:5175
