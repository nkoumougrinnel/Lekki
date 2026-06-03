"""Embeddings locaux via sentence-transformers (all-MiniLM-L6-v2)."""

import asyncio
import threading

import numpy as np

from app.config import settings
from app.services.embedding_providers.base import BaseEmbeddingProvider

_model = None
_model_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer(settings.LOCAL_EMBEDDING_MODEL)
    return _model


class MiniLMEmbeddingProvider(BaseEmbeddingProvider):
    name = "minilm"

    def is_configured(self) -> bool:
        return True

    @staticmethod
    def _prepare_text(text: str, title: str | None) -> str:
        if title:
            return f"{title.strip()}\n\n{text}"
        return text

    def _embed_sync(self, text: str) -> np.ndarray:
        vector = _get_model().encode(text, convert_to_numpy=True, show_progress_bar=False)
        return np.asarray(vector, dtype=np.float32)

    async def embed_document(self, text: str, title: str | None = None) -> bytes:
        payload = self._prepare_text(text, title)
        vector = await asyncio.to_thread(self._embed_sync, payload)
        return vector.tobytes()

    async def embed_query(self, text: str) -> np.ndarray:
        return await asyncio.to_thread(self._embed_sync, text)
