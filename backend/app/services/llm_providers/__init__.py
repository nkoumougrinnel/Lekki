from app.services.llm_providers.manager import LLMProviderManager

# Rétro-compatibilité : l'ancien LLMProviderRouter est désormais le manager.
LLMProviderRouter = LLMProviderManager

__all__ = ["LLMProviderManager", "LLMProviderRouter"]
