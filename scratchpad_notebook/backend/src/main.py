import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

try:
    from config import settings
    from api import health, routes, orchestrator_routes
except ImportError:
    from src.config import settings
    from src.api import health, routes, orchestrator_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting AI Math Notebook Backend on {settings.host}:{settings.port}")
    try:
        try:
            from src.orchestrator.orchestrator import Orchestrator
        except ImportError:
            from orchestrator.orchestrator import Orchestrator
        await Orchestrator.get_instance().initialize_all()
    except Exception as e:
        print(f"Warning: Orchestrator pre-initialization notice: {e}")
    yield
    print("Shutting down...")


app = FastAPI(
    title="AI Math Notebook API",
    version="0.1.0",
    description="Backend API for AI Math Notebook - handwriting-first mathematics workspace",
    lifespan=lifespan,
)

_raw_cors = os.getenv("CORS_ORIGINS", "").strip()
_cors_origins = (
    [o.strip() for o in _raw_cors.split(",") if o.strip()]
    if _raw_cors
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(routes.router)
app.include_router(orchestrator_routes.router)


@app.get("/")
async def root():
    return {
        "name": "AI Math Notebook API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs"
    }