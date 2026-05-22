"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Return service health status."""
    from app.services.question_selector import cold_start_model

    return {
        "status": "healthy",
        "service": "faculty-feedback-ai",
        "cold_start_model_trained": cold_start_model._trained,
    }
