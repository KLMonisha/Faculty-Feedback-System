"""
Faculty Feedback System — AI Service
FastAPI application for adaptive question selection and AI-powered feedback analysis.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import health, analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Startup: the cold-start model trains at import time (question_selector.py)
    print("🤖 AI Service started")
    print(f"📄 Docs at http://localhost:{settings.port}/docs")
    print(f"🌿 Claude model: {settings.claude_model}")
    print(f"🎯 Max questions/session: {settings.max_questions_per_session}")
    yield
    # Shutdown
    print("👋 AI Service shutting down")


app = FastAPI(
    title="Faculty Feedback AI Service",
    description="Adaptive question selection and AI-powered feedback analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ──────────────────────────────────────────────────
app.include_router(health.router, prefix="/api",          tags=["Health"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
