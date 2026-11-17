# STEM Unified Learning Platform (NILO)

> Repository: `https://github.com/Abpattar/STEM.git`

A unified STEM educational platform built on **NILO** (`main_explaino/`) as the single master React 19 application, natively integrating **MathNoteBook** (mathematics workspace), **Science Kingdom** (3D Physics, Chemistry, and Biology laboratory), and **EXO** (voice-first Socratic AI tutor with Sarvam AI primary speech and automatic browser voice fallback).

---

## 1. Architecture Overview

```text
                      ┌─────────────────────────────────────────────────────┐
                      │              NILO Master Application                │
                      │         main_explaino/ (Vite + React 19)            │
                      │           Single React Root · Port 5173             │
                      │                                                     │
                      │  • Shared StudentLearningContext                    │
                      │  • Shared AccessibilityContext                      │
                      │  • Native MathNoteBook (src/Scratchpad/)            │
                      │  • Native Science Kingdom (src/DigitalLab/)         │
                      │  • Native EXO Tutor (src/Voice/)                    │
                      │  • Zero application-level iframes                   │
                      └──────────────────────────┬──────────────────────────┘
                                                 │
        ┌────────────────────────────────────────┼────────────────────────────────────────┐
        │ /api/math/* -> /api/*                  │ /api/science/* -> /api/*               │ /api/tutor/* -> /api/*
        ▼                                        ▼                                        ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│  MathNoteBook FastAPI        │  │  Science AI Backend          │  │  EXO Next.js 16 Backend      │
│  scratchpad_notebook/backend │  │  science_ai_backend/         │  │  voice_agent/                │
│  127.0.0.1:8001              │  │  127.0.0.1:8002              │  │  localhost:3000              │
├──────────────────────────────┤  ├──────────────────────────────┤  ├──────────────────────────────┤
│ • SymPy solver & verification│  │ • Senku AI Q&A proxy         │  │ • Socratic SSE streaming     │
│ • Handwriting & Vision OCR   │  │ • Exotic reaction enrichment │  │ • MongoDB session & progress │
│ • Practice & progressive hint│  │ • Explicit HTTP 503 when     │  │ • Server-graded lane quizzes │
│ • FSRS-6 review scheduling   │  │   provider key is unset      │  │ • Private NCERT index search │
│ • MathCAT Braille/Speech/ISL │  │                              │  │ • Sarvam Indian speech API   │
└──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

- **One frontend runtime:** `main_explaino/` hosts the landing page, login/signup flow, dashboard, radial navigation wheel, ExoOrb, and all three native STEM workspaces inside a single React 19 root (`#root`).
- **No application iframes:** MathNoteBook, Science Kingdom, and EXO all render as native React components. Only external YouTube lesson videos inside `YoutubeLessonPlayer` use YouTube media embeds.
- **Cross-module learning continuity:** `StudentLearningContext` carries active subject, concept ID/title, and prior module across NILO ↔ MathNoteBook ↔ Science Kingdom ↔ EXO without ever deriving an authenticated `studentId` from an anonymous `sessionId`.

---

## 2. Repository Structure

| Path | Role |
|---|---|
| `main_explaino/` | Master NILO Vite + React 19 frontend (`src/Scratchpad/`, `src/DigitalLab/`, `src/Voice/`, shared contexts, API clients). |
| `scratchpad_notebook/backend/` | MathNoteBook FastAPI backend (port `8001`): SymPy solver, practice checker, progressive hints, OCR, FSRS-6, accessibility adapters. |
| `science_ai_backend/` | Dedicated FastAPI Senku AI backend (port `8002`): server-side LLM proxy for Science Kingdom Q&A and exotic reactions. |
| `voice_agent/` | EXO Next.js 16 API backend (port `3000`): Socratic streaming chat, roadmap engine, server-graded quizzes, study rooms, NCERT index, YouTube discovery, Sarvam speech. |
| `scratchpad_notebook/frontend/` | Canonical standalone MathNoteBook reference repository (not required to run NILO). |
| `digital_lab/` | Canonical standalone Science Kingdom reference repository (not required to run NILO). |
| `package.json` | Root workspace orchestrator scripts (`dev:stem`, `build:all`, `test:stem`). |

---

## 3. Prerequisites (Ubuntu / Linux)

- **Node.js** 20+ and **npm** 10+
- **Python** 3.11+ with `python3-venv`
- **Optional:** `yt-dlp` (for EXO algorithmic YouTube lesson search fallback when `YOUTUBE_API_KEY` is unset)
- **Optional:** MongoDB Atlas or local MongoDB instance (for durable EXO progress, achievements, and study rooms; in-memory fallback is automatic when `MONGODB_URI` is unset)

---

## 4. Ubuntu Installation Steps

```bash
# 0. Clone the repository
git clone https://github.com/Abpattar/STEM.git
cd STEM

# 1. Install root orchestrator dependencies (includes concurrently)
npm install

# 2. Install frontend and EXO Next.js backend dependencies
npm --prefix main_explaino install
npm --prefix voice_agent install

# 3. Create the Ubuntu Python virtual environment and install FastAPI backend dependencies
cd scratchpad_notebook/backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -e ".[dev]"
cd ../..
```

> **Note:** Both `scratchpad_notebook/backend` and `science_ai_backend` share the Ubuntu virtual environment at `scratchpad_notebook/backend/.venv/bin/python` (containing FastAPI, Uvicorn, Pydantic, SymPy, HTTPX, and `python-dotenv`).

---

## 5. Environment Configuration

Copy each service's `.env.example` template to its gitignored local `.env` / `.env.local` file and set real keys **only on the server**. Never commit `.env*` files and never place private API credentials in browser-exposed `VITE_*` variables.

### A. NILO Master Frontend (`main_explaino/.env` — optional)
Template: `main_explaino/.env.example`

| Variable | Default | Purpose |
|---|---|---|
| `VITE_MATH_API_BASE` | `/api/math` | Browser-facing relative prefix for MathNoteBook API. |
| `VITE_SCIENCE_API_BASE` | `/api/science` | Browser-facing relative prefix for Science AI API. |
| `VITE_TUTOR_API_BASE` | `/api/tutor` | Browser-facing relative prefix for EXO API. |
| `MATH_API_TARGET` | `http://127.0.0.1:8001` | Vite dev proxy target (dev server only, never bundled). |
| `SCIENCE_AI_TARGET` | `http://127.0.0.1:8002` | Vite dev proxy target (dev server only, never bundled). |
| `TUTOR_API_TARGET` | `http://localhost:3000` | Vite dev proxy target (dev server only, never bundled). |

### B. MathNoteBook FastAPI Backend (`scratchpad_notebook/backend/.env`)
Template: `scratchpad_notebook/backend/.env.example`

| Variable | Default | Purpose |
|---|---|---|
| `HOST` / `PORT` | `0.0.0.0` / `8001` | FastAPI listen address and permanent STEM dev port. |
| `ENVIRONMENT` | `development` | Runtime environment label. |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed browser origins for production. |
| `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` | — | OpenAI-compatible text LLM settings (server-side only). |
| `VISION_LLM_PROVIDER` / `GEMINI_API_KEY` / `VISION_LLM_BASE_URL` / `VISION_LLM_MODEL` / `VISION_LLM_API_KEY` | — | Handwriting OCR vision provider settings (server-side only). |
| `RECOGNITION_CONFIDENCE_THRESHOLD` / `MAX_CLARIFICATION_ATTEMPTS` | `0.75` / `2` | Handwriting recognition thresholds. |
| `MAX_SOLVER_RETRIES` / `SYMPY_VERBOSE` | `2` / `false` | SymPy solver behavior. |

### C. Science AI Backend — Senku AI (`science_ai_backend/.env`)
Template: `science_ai_backend/.env.example`

| Variable | Default | Purpose |
|---|---|---|
| `SCIENCE_AI_API_KEY` | *(empty)* | Server-side OpenAI-compatible API key. When unset, `/api/science/ai` returns HTTP `503` with `configured: false` and all local labs remain fully functional. |
| `SCIENCE_AI_BASE_URL` | `https://api.x.ai/v1/chat/completions` | OpenAI-compatible chat completions endpoint (e.g. `https://api.groq.com/openai/v1/chat/completions`). |
| `SCIENCE_AI_MODEL` | `grok-2-latest` | Model identifier supported by the configured endpoint (e.g. `openai/gpt-oss-20b` on Groq). |
| `SCIENCE_AI_CORS_ORIGINS` | localhost dev origins | Comma-separated allowed browser origins for production. |

### D. EXO Next.js Backend (`voice_agent/.env.local`)
Template: `voice_agent/.env.example`

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` / `MONGODB_DB` | *(empty)* / `explaino` | MongoDB connection string for durable sessions, roadmaps, quiz progress, and study rooms. |
| `GROQ_API_KEY` / `GROQ_MODEL` | `openai/gpt-oss-20b` | Primary Socratic LLM provider. |
| `NVIDIA_API_KEY` / `NVIDIA_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` | Secondary LLM failover provider. |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | `openrouter/free` | Tertiary LLM failover provider. |
| `SARVAM_API_KEY` | *(empty)* | Optional Sarvam AI STT (`saaras:v4`) & TTS (`bulbul:v4-flash` / `bulbul:v3`) across 11 Indian languages. When unset or quota-limited, EXO automatically falls back to the browser's built-in `SpeechRecognition` and `speechSynthesis`. |
| `YOUTUBE_API_KEY` | *(empty)* | Optional official YouTube Data API v3 search key. |

---

## 6. Development Startup

Start all four unified STEM services with **one command**:

```bash
npm run dev:stem
```

This launches:

| Label | Service | Port | Health Check (via NILO proxy) |
|---|---|---|---|
| `NILO` | NILO Master Frontend (`main_explaino/`) | `5173` | `http://localhost:5173/` |
| `MATH-BE` | MathNoteBook FastAPI (`scratchpad_notebook/backend/`) | `8001` | `http://localhost:5173/api/math/health` |
| `SCI-AI` | Science AI Backend (`science_ai_backend/`) | `8002` | `http://localhost:5173/api/science/health` |
| `EXO` | EXO Next.js Backend (`voice_agent/`) | `3000` | `http://localhost:5173/api/tutor/health` |

Or launch services individually:

```bash
npm run dev:main           # NILO frontend (:5173)
npm run dev:math:backend   # MathNoteBook FastAPI (:8001)
npm run dev:science:ai     # Science AI backend (:8002)
npm run dev:voice          # EXO Next.js backend (:3000)
```

> **Port Isolation:** Port `8000` is intentionally avoided so unrelated local services on `:8000` are never disturbed. Override backend ports if needed via `MATH_BACKEND_PORT` and `SCIENCE_AI_PORT`.

---

## 7. Development Shutdown

- Press **`Ctrl+C`** (`SIGINT`) in the terminal running `npm run dev:stem`. `concurrently` cleanly terminates all four child services (`5173`, `8001`, `8002`, `3000`) without affecting unrelated processes on the machine.
- To verify all STEM ports are free before restarting:
  ```bash
  ss -tlnp | grep -E ':(3000|5173|8001|8002)\b'
  ```

---

## 8. Build Commands

```bash
# Build NILO Master SPA (TypeScript check + Vite bundle -> main_explaino/dist/)
npm run build:main

# Build EXO Next.js backend (voice_agent/.next/)
npm run build:voice

# Build both production artifacts
npm run build:all
```

> **Important:** Stop `npm run dev:voice` / `npm run dev:stem` before running `npm run build:voice` so `next build` and `next dev` do not write to `voice_agent/.next/` concurrently.

---

## 9. Test Commands

```bash
# Run MathNoteBook FastAPI unit & regression tests (pytest)
npm run test:math:backend

# Run EXO Voice Agent backend unit & contract tests (67 tests)
npm run test:voice

# Run both backend test suites
npm run test:stem
```

---

## 10. Production Deployment Architecture

In production, deploy:
1. **Static SPA (`main_explaino/dist/`)** served by Nginx, Caddy, or a CDN at `/` (with SPA fallback `try_files $uri $uri/ /index.html;`).
2. **MathNoteBook FastAPI** (`uvicorn src.main:app --host 127.0.0.1 --port 8001 --workers 2`) managed by `systemd`, Supervisor, or Docker.
3. **Science AI FastAPI** (`uvicorn main:app --host 127.0.0.1 --port 8002 --workers 2`) managed by `systemd`, Supervisor, or Docker.
4. **EXO Next.js Server** (`npm --prefix voice_agent run start -- -H 127.0.0.1 -p 3000`) managed by `systemd`, PM2, or Docker.
5. **TLS Reverse Proxy (Nginx / Caddy / Load Balancer)** terminating HTTPS on ports `80`/`443` and routing API prefixes to the three internal backends.

Because NILO uses relative API base paths (`/api/math`, `/api/science`, `/api/tutor`) by default, **no `localhost` URLs are compiled into the production frontend bundle**.

---

## 11. Backend Routing (Production Reverse Proxy)

Every prefix strips its module namespace and forwards to `/api/*` on the target backend:

| Public Path | Upstream Target | Notes |
|---|---|---|
| `/` | `main_explaino/dist/` | Static SPA (`index.html` fallback). |
| `/api/math/*` | `http://127.0.0.1:8001/api/*` | Rewrite `/api/math/(.*)` → `/api/$1`. |
| `/api/science/*` | `http://127.0.0.1:8002/api/*` | Rewrite `/api/science/(.*)` → `/api/$1`. |
| `/api/tutor/*` | `http://127.0.0.1:3000/api/*` | Rewrite `/api/tutor/(.*)` → `/api/$1`; **disable proxy buffering** for `/api/tutor/chat/stream` SSE! |

### Reference Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name nilo.example.com;

    root /var/www/nilo/main_explaino/dist;
    index index.html;

    location /api/math/ {
        rewrite ^/api/math/(.*)$ /api/$1 break;
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/science/ {
        rewrite ^/api/science/(.*)$ /api/$1 break;
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/tutor/ {
        rewrite ^/api/tutor/(.*)$ /api/$1 break;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Connection "";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 12. Security Configuration

- **Server-side secret isolation:** All AI provider keys (`GROQ_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `LLM_API_KEY`, `VISION_LLM_API_KEY`, `SCIENCE_AI_API_KEY`, `SARVAM_API_KEY`) and `MONGODB_URI` reside strictly in backend `.env` / `.env.local` files (`chmod 600`, gitignored). Zero secrets are bundled in `main_explaino/dist/`.
- **CORS:** Configure `CORS_ORIGINS` (MathNoteBook) and `SCIENCE_AI_CORS_ORIGINS` (Science AI) to your exact HTTPS origin in production (or keep backends bound to `127.0.0.1` behind a same-origin reverse proxy).
- **Server-authoritative quiz grading:** `GET /api/tutor/learning-quiz` strips answer keys before returning questions; grading occurs exclusively on `POST /api/tutor/learning-quiz`.
- **Anonymous session vs. student identity:** EXO generates an anonymous browser `sessionStorage` ID (`exo-session`) for session continuity. `StudentLearningContext.studentId` remains `null` until real server-backed authentication is connected.
- **Private textbook indexing:** Uploaded NCERT PDFs stay on the `voice_agent` server filesystem; `/api/tutor/textbooks` exposes only bounded excerpts and PDF page numbers from `data/ncert-index.json`.

---

## 13. Known Limitations & Pre-Release Decisions

1. **NILO Authentication is Currently Client-Side Demo Auth:** `main_explaino/src/components/LoginPage.tsx` and `App.tsx` accept local form submission without a real backend identity provider. Connect a real auth backend (e.g., Supabase/OAuth/JWT) before multi-user production launch so `StudentLearningContext.studentId` receives verified student IDs.
2. **Sixth-Sense GPL-3.0 Asset Provenance Decision Required Before Public Distribution:** `main_explaino/src/Scratchpad/components/Accessibility/ISLSkeletonViewer.tsx` and `main_explaino/public/models/sixth-sense/preset-references.json` (copied to `main_explaino/dist/models/sixth-sense/preset-references.json`) originate from Sixth-Sense (GNU GPL-3.0). Before distributing publicly, decide whether to release under GPL-3.0, isolate ISL landmark presets as a separate GPL-3.0 service/package, or author clean-room ISL landmark assets.
3. **Optional `Mathua` Prerequisite Repository:** Three upstream tests in `scratchpad_notebook/backend/tests/` expect a sibling `Mathua/data/concepts` directory not bundled in this repository; all core SymPy solver, practice, hint, FSRS-6, voice, and accessibility routes pass independently.
4. **Unused Legacy `main_explaino/src/features/` Directory:** Retained untracked from pre-integration work; not imported by NILO runtime modules (`Scratchpad/`, `DigitalLab/`, `Voice/`).
5. **MongoDB Durability & Rate Limiting:** When `MONGODB_URI` is unset, EXO falls back to volatile in-memory storage. Study room rate limiting (`voice_agent/app/api/study-room/route.ts`) is currently in-memory per process; add reverse-proxy rate limiting (`limit_req_zone`) for multi-instance production deployments.
6. **YouTube Video Search:** Curated video playback relies on external YouTube embeds (`youtube-nocookie.com`) and algorithmic discovery (`YOUTUBE_API_KEY` or `yt-dlp`), which may vary by network egress policy.
