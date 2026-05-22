"""
Faculty Feedback System — AI Service
FastAPI application for AI-powered feedback analysis using Claude.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import analysis, health

app = FastAPI(
    title="Faculty Feedback AI Service",
    description="AI-powered sentiment analysis and feedback processing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])


@app.on_event("startup")
async def startup_event():
    print("🤖 AI Service started")
    print(f"📄 Docs available at http://localhost:8000/docs")
