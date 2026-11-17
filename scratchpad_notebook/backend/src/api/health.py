from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
import time


router = APIRouter(prefix="/api", tags=["health"])

START_TIME = time.time()


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float
    environment: str
    services: Dict[str, Any]


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        uptime_seconds=time.time() - START_TIME,
        environment="development",
        services={
            "api": "ok",
            "sympy": "available",
            "llm_provider": "configured" if True else "not_configured"
        }
    )