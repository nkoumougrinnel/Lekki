from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Lekki Wiki"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "lekki-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./lekki.db"
    
    # AI / LLM
    GEMINI_API_KEY: str = ""
    GEMINI_LLM_MODEL: str = "gemini-2.5-flash"

    # Groq (OpenAI-compatible API)
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    # Cerebras (OpenAI-compatible API)
    CEREBRAS_API_KEY: str = ""
    CEREBRAS_BASE_URL: str = "https://api.cerebras.ai/v1"
    CEREBRAS_MODEL: str = "llama-3.3-70b"

    # Local LLM (Ollama)
    OLLAMA_URL: str = "http://192.168.64.82:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_TIMEOUT_SECONDS: float = 180.0

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,https://lekki-three.vercel.app"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()


# Les clés par défaut sont publiques (dépôt GitHub) : avec elles, n'importe qui peut
# fabriquer un jeton valide. Si aucune vraie clé n'est fournie, on en génère une
# aléatoire, conservée à côté de la base pour survivre aux redémarrages.
_PUBLIC_DEFAULT_KEYS = {
    "",
    "lekki-secret-key-change-in-production-2026",
    "lekki-dev-secret-key-2026",
    "change-this-super-secret-key-in-production",
}


def _ensure_secret_key() -> None:
    if settings.SECRET_KEY not in _PUBLIC_DEFAULT_KEYS:
        return
    import logging
    import os
    import secrets

    data_dir = "./data"
    if settings.DATABASE_URL.startswith("sqlite") and ":///" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.split(":///", 1)[1]
        data_dir = os.path.dirname(db_path) or "."
    key_path = os.path.join(data_dir, ".lekki_secret_key")
    try:
        if os.path.isfile(key_path):
            with open(key_path, encoding="utf-8") as handle:
                stored = handle.read().strip()
            if stored:
                settings.SECRET_KEY = stored
                return
        os.makedirs(data_dir, exist_ok=True)
        generated = secrets.token_urlsafe(48)
        with open(key_path, "w", encoding="utf-8") as handle:
            handle.write(generated)
        os.chmod(key_path, 0o600)
        settings.SECRET_KEY = generated
    except OSError:
        settings.SECRET_KEY = secrets.token_urlsafe(48)
    logging.getLogger("lekki").warning(
        "SECRET_KEY absente ou publique : une clé aléatoire est utilisée. "
        "Définissez SECRET_KEY dans les variables d'environnement de production."
    )


_ensure_secret_key()
