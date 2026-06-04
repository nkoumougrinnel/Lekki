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
    # Clé unique (rétro-compatibilité) OU liste de clés pour la rotation.
    # Les listes acceptent le JSON (["k1","k2"]) ou des valeurs séparées par
    # des virgules / retours à la ligne. La clé unique est utilisée en complément.
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    CEREBRAS_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""
    GROQ_API_KEYS: str = ""
    CEREBRAS_API_KEYS: str = ""

    # --- Bascule LLM (génération /ask) : ordre de priorité ---
    # Valeurs possibles : gemini, groq, cerebras (séparées par des virgules).
    # Ollama est toujours essayé en DERNIER recours (jamais dans cet ordre).
    LLM_PROVIDER_ORDER: str = "gemini,groq,cerebras"
    # Cooldown après quota/429 pour une clé en échec (cache des fournisseurs défaillants).
    LLM_PROVIDER_COOLDOWN_MINUTES: int = 60
    LLM_KEY_COOLDOWN_MINUTES: int = 5
    LLM_REQUEST_TIMEOUT: float = 120.0

    # Modèles par fournisseur (génération)
    GEMINI_LLM_MODEL: str = "models/gemini-2.0-flash"
    GROQ_LLM_MODEL: str = "llama-3.1-8b-instant"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    CEREBRAS_LLM_MODEL: str = "llama-3.3-70b"
    CEREBRAS_BASE_URL: str = "https://api.cerebras.ai/v1"

    # --- Ollama (filet de sécurité local, dernier recours) ---
    # Désactivable : si false, une erreur propre est renvoyée quand tous les
    # fournisseurs cloud sont indisponibles.
    OLLAMA_ENABLED: bool = True
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    # Modèle léger recommandé (llama3.2:3b ou qwen2.5:3b) — jamais un modèle lourd.
    OLLAMA_MODEL: str = "llama3.2:3b"
    OLLAMA_TIMEOUT: float = 120.0
    # Paramètres très économiques (RAM/CPU minimum).
    OLLAMA_TEMPERATURE: float = 0.1
    OLLAMA_TOP_P: float = 0.7
    OLLAMA_NUM_PREDICT: int = 256
    OLLAMA_NUM_CTX: int = 1024

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
