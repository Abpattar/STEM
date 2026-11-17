"""
Dedicated server-side Science AI Backend for NILO's Science Kingdom (Senku AI).

Security policy:
- API credentials are read exclusively from server-side environment variables:
    SCIENCE_AI_API_KEY  (required to enable live LLM responses)
    SCIENCE_AI_BASE_URL (optional, default: https://api.x.ai/v1/chat/completions)
    SCIENCE_AI_MODEL    (optional, default: grok-2-latest)
- No secrets are hardcoded, stored in frontend bundles, or printed to logs.
- When credentials are absent, /api/ai returns HTTP 503 with configured=false so the
  client displays an honest AI-unavailable state while all local labs and deterministic
  simulations continue working normally.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
except ImportError:
    pass


def _get_cors_origins() -> list[str]:
    raw = os.getenv("SCIENCE_AI_CORS_ORIGINS", "").strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def _get_api_key() -> str:
    return (
        os.getenv("SCIENCE_AI_API_KEY")
        or os.getenv("XAI_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or ""
    ).strip()


def _get_base_url() -> str:
    return os.getenv(
        "SCIENCE_AI_BASE_URL", "https://api.x.ai/v1/chat/completions"
    ).strip()


def _get_model() -> str:
    return os.getenv("SCIENCE_AI_MODEL", "grok-2-latest").strip()


app = FastAPI(
    title="NILO Science Kingdom AI Backend",
    version="1.0.0",
    description="Server-side Senku AI proxy for NILO Science Kingdom.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class ReagentInput(BaseModel):
    name: str
    formula: str


class ScienceAiRequest(BaseModel):
    mode: Literal["qa", "reaction"] = "qa"
    question: str | None = Field(default=None, max_length=2000)
    contextLab: str = Field(default="general", max_length=64)
    reagents: list[ReagentInput] = Field(default_factory=list)
    isHeated: bool = False


@app.get("/api/health")
async def health() -> dict[str, Any]:
    configured = bool(_get_api_key())
    return {
        "status": "healthy",
        "service": "science-ai-backend",
        "ai_configured": configured,
        "model": _get_model() if configured else None,
    }


@app.post("/api/ai")
async def science_ai(payload: ScienceAiRequest) -> JSONResponse:
    api_key = _get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=503,
            content={
                "configured": False,
                "detail": (
                    "Senku AI provider credentials (SCIENCE_AI_API_KEY) are not configured on the server. "
                    "All interactive Physics, Chemistry, Biology stations and local chemical reaction simulations remain available."
                ),
            },
        )

    if payload.mode == "qa":
        question = (payload.question or "").strip()
        if not question:
            raise HTTPException(status_code=400, detail="A non-empty question is required.")

        system_prompt = (
            "You are Mecha Senku, an enthusiastic scientific mentor inside NILO's Science Kingdom laboratory. "
            f"The student is currently exploring the {payload.contextLab} wing. "
            "Answer with accurate, clear STEM reasoning suitable for school students, using concise paragraphs "
            "and concrete physical, chemical, or biological explanations."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]
        temperature = 0.6
        max_tokens = 450
    else:
        if not payload.reagents:
            raise HTTPException(status_code=400, detail="At least one reagent is required.")

        reagent_summary = ", ".join(f"{r.name} ({r.formula})" for r in payload.reagents)
        system_prompt = (
            "You are Mecha Senku, an expert chemistry laboratory engine. "
            "Analyze the given reagents and return ONLY a valid JSON object matching this exact schema: "
            '{"title": str, "equation": str, "explanation": str, "visualEffect": '
            '"none"|"bubbles"|"smoke"|"precipitate"|"color_change"|"heat"|"explosion"|"glow", '
            '"resultColor": "#hex", "precipitateColor"?: "#hex", "temperatureChange": "exothermic"|"endothermic"|"neutral", '
            '"ph": number, "senkuCommentary": str, "isHazardous": boolean}.'
        )
        user_prompt = (
            f"Reagents mixed: {reagent_summary}. "
            f"Heat applied: {'YES (Bunsen burner ON)' if payload.isHeated else 'NO (room temperature)'}. "
            "Return ONLY raw JSON without markdown fences."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        temperature = 0.25
        max_tokens = 450

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    request_body = {
        "model": _get_model(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            upstream = await client.post(
                _get_base_url(),
                headers=headers,
                json=request_body,
            )
    except httpx.TimeoutException:
        return JSONResponse(
            status_code=504,
            content={
                "configured": True,
                "detail": "Senku AI upstream provider timed out. Please try again shortly.",
            },
        )
    except httpx.HTTPError:
        return JSONResponse(
            status_code=502,
            content={
                "configured": True,
                "detail": "Unable to reach the configured Science AI upstream provider.",
            },
        )

    if upstream.status_code >= 400:
        return JSONResponse(
            status_code=502,
            content={
                "configured": True,
                "detail": f"Science AI upstream provider rejected the request (HTTP {upstream.status_code}).",
            },
        )

    data = upstream.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )

    if not content:
        return JSONResponse(
            status_code=502,
            content={
                "configured": True,
                "detail": "Science AI upstream provider returned an empty response.",
            },
        )

    if payload.mode == "qa":
        return JSONResponse(
            status_code=200,
            content={
                "configured": True,
                "mode": "qa",
                "answer": content,
            },
        )

    cleaned = content.replace("```json", "").replace("```", "").strip()
    try:
        parsed_reaction = json.loads(cleaned)
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=502,
            content={
                "configured": True,
                "detail": "Science AI returned malformed chemical reaction JSON.",
            },
        )

    return JSONResponse(
        status_code=200,
        content={
            "configured": True,
            "mode": "reaction",
            "reaction": parsed_reaction,
        },
    )

