"""
Lekki Wiki — Configuration
Variables d'environnement via .env (python-dotenv)
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    DEBUG: bool = False
    SEED_PASSWORD: str = "lekki123"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8h — durée hackathon

    # DB
    DATABASE_URL: str = "sqlite:///./wiki.db"

    # Google Gemini
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
