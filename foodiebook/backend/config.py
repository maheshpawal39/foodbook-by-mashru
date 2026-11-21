"""Application configuration, loaded from environment variables."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        # Render/Heroku style postgres:// URLs need the psycopg driver.
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url
    return "postgresql+psycopg://postgres@localhost:5434/foodiebook"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:  # never ship a hardcoded secret
        raise RuntimeError("SECRET_KEY is not set. Copy .env.example to .env and set a value.")

    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER") or str(BASE_DIR / "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "5")) * 1024 * 1024
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = SESSION_COOKIE_SECURE

    CSRF_ENABLED = os.getenv("CSRF_ENABLED", "true").lower() == "true"
    # In development the reset link can be returned by the API (no mail server).
    SHOW_RESET_TOKEN = os.getenv("SHOW_RESET_TOKEN", "false").lower() == "true"
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    RESET_TOKEN_TTL_MINUTES = int(os.getenv("RESET_TOKEN_TTL_MINUTES", "30"))

    JSON_SORT_KEYS = False
    MAX_PAGE_SIZE = int(os.getenv("MAX_PAGE_SIZE", "60"))
