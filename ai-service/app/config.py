"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration loaded from .env file or environment."""

    # AI (Groq)
    groq_api_key: str = ""

    # Database
    postgres_url: str = "postgresql://postgres:postgres@localhost:5432/faculty_feedback"

    # Cache / Queue
    redis_url: str = "redis://localhost:6379"

    # Auth
    jwt_secret: str = "changethissecret"

    # Server
    port: int = 8000
    cors_origin: str = "http://localhost:5173"

    # Limits
    max_questions_per_session: int = 5

    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
        # Allow extra environment variables (e.g., POSTGRES_USER/PASSWORD)
        "extra": "ignore",
    }


settings = Settings()
