from app.config import settings
from app.services.llm_providers.openai_compat import OpenAICompatibleLLMProvider


class CerebrasLLMProvider(OpenAICompatibleLLMProvider):
    def __init__(self, cooldown_minutes: int) -> None:
        super().__init__(
            name="cerebras",
            api_key=settings.CEREBRAS_API_KEY,
            base_url=settings.CEREBRAS_BASE_URL,
            model=settings.CEREBRAS_LLM_MODEL,
            cooldown_minutes=cooldown_minutes,
        )
