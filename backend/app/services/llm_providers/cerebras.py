from app.config import settings
from app.services.llm_providers.openai_compat import OpenAICompatibleLLMProvider


class CerebrasLLMProvider(OpenAICompatibleLLMProvider):
    def __init__(self, cooldown_minutes: int, api_key: str | None = None) -> None:
        super().__init__(
            name="cerebras",
            api_key=api_key if api_key is not None else settings.CEREBRAS_API_KEY,
            base_url=settings.CEREBRAS_BASE_URL,
            model=settings.CEREBRAS_LLM_MODEL,
            cooldown_minutes=cooldown_minutes,
            timeout=settings.LLM_REQUEST_TIMEOUT,
        )
