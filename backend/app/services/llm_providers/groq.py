from app.config import settings
from app.services.llm_providers.openai_compat import OpenAICompatibleLLMProvider


class GroqLLMProvider(OpenAICompatibleLLMProvider):
    def __init__(self, cooldown_minutes: int, api_key: str | None = None) -> None:
        super().__init__(
            name="groq",
            api_key=api_key if api_key is not None else settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
            model=settings.GROQ_LLM_MODEL,
            cooldown_minutes=cooldown_minutes,
            timeout=settings.LLM_REQUEST_TIMEOUT,
        )
