"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration loaded from .env file or environment."""

    # Database
    postgres_url: str = "postgresql://user:password@localhost:5432/faculty_feedback"

    # Cache
    redis_url: str = "redis://localhost:6379"

    # AI
    claude_api_key: str = ""

    # Auth
    jwt_secret: str = "dev-secret-change-me"

    # Server
    port: int = 8000
    cors_origin: str = "http://localhost:5173"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


settings = Settings()
