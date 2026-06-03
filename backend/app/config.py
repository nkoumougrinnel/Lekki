"""
Lekki Wiki — Configuration
Variables d'environnement via .env (python-dotenv)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    DEBUG: bool = False
    SEED_PASSWORD: str = "lekki123"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8h

    # DB
    DATABASE_URL: str = "sqlite:///./lekki.db"

    # --- Clés API (fournisseurs distants) ---
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    CEREBRAS_API_KEY: str = ""

    # --- Bascule LLM (génération /ask) : ordre de priorité ---
    # Valeurs possibles : gemini, groq, cerebras (séparées par des virgules)
    LLM_PROVIDER_ORDER: str = "gemini,groq,cerebras"
    LLM_PROVIDER_COOLDOWN_MINUTES: int = 60

    # Modèles par fournisseur (génération)
    GEMINI_LLM_MODEL: str = "models/gemini-2.0-flash"
    GROQ_LLM_MODEL: str = "llama-3.1-8b-instant"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    CEREBRAS_LLM_MODEL: str = "llama-3.3-70b"
    CEREBRAS_BASE_URL: str = "https://api.cerebras.ai/v1"

    # --- Bascule embeddings (indexation + recherche) ---
    # minilm = local (sentence-transformers) ; gemini = distant (fallback)
    EMBEDDING_PROVIDER_ORDER: str = "minilm,gemini"
    LOCAL_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    # --- Routes internes (/internal/*) ---
    INTERNAL_API_KEY: str = "lekki-internal-secret-key"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
