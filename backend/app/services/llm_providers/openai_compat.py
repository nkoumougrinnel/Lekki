"""Base HTTP OpenAI-compatible pour Groq et Cerebras."""

import httpx

from app.services.llm_providers.base import BaseLLMProvider, QuotaExhaustedError, is_quota_or_rate_limit


class OpenAICompatibleLLMProvider(BaseLLMProvider):
    """Appels POST /v1/chat/completions (format OpenAI)."""

    def __init__(
        self,
        name: str,
        api_key: str,
        base_url: str,
        model: str,
        cooldown_minutes: int,
        timeout: float = 120.0,
    ) -> None:
        super().__init__(cooldown_minutes)
        self.name = name
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout

    def is_configured(self) -> bool:
        return bool(self._api_key.strip())

    async def generate(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

            if response.status_code == 429:
                raise QuotaExhaustedError(response.text)

            if response.status_code >= 400:
                body = response.text
                if is_quota_or_rate_limit(Exception(body)):
                    raise QuotaExhaustedError(body)
                response.raise_for_status()

            data = response.json()
            return data["choices"][0]["message"]["content"]

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429 or is_quota_or_rate_limit(exc):
                raise QuotaExhaustedError(str(exc)) from exc
            raise
        except QuotaExhaustedError:
            raise
        except Exception as exc:
            if is_quota_or_rate_limit(exc):
                raise QuotaExhaustedError(str(exc)) from exc
            raise
