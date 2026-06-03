"""Tests du provider MiniLM (mocké — pas de téléchargement de modèle)."""

import numpy as np
import pytest
from unittest.mock import MagicMock, patch

from app.services.embedding_providers.minilm import MiniLMEmbeddingProvider


@pytest.fixture
def mock_encoder():
    encoder = MagicMock()
    encoder.encode.return_value = np.array([0.1, 0.2, 0.3], dtype=np.float32)
    return encoder


@pytest.mark.asyncio
async def test_minilm_embed_document(mock_encoder):
    provider = MiniLMEmbeddingProvider(cooldown_minutes=60)
    assert provider.is_configured() is True

    with patch("app.services.embedding_providers.minilm._get_model", return_value=mock_encoder):
        blob = await provider.embed_document("contenu test", title="Titre")

    assert len(blob) == 12  # 3 float32
    mock_encoder.encode.assert_called_once()
    call_text = mock_encoder.encode.call_args[0][0]
    assert "Titre" in call_text
    assert "contenu test" in call_text


@pytest.mark.asyncio
async def test_minilm_embed_query(mock_encoder):
    provider = MiniLMEmbeddingProvider(cooldown_minutes=60)

    with patch("app.services.embedding_providers.minilm._get_model", return_value=mock_encoder):
        vector = await provider.embed_query("question ?")

    assert vector.dtype == np.float32
    assert vector.shape == (3,)


def test_embedding_router_prefers_minilm():
    from app.services.embedding_providers.router import EmbeddingProviderRouter

    router = EmbeddingProviderRouter()
    assert router.order[0] == "minilm"
    assert router.providers["minilm"].is_configured()
    assert router.has_configured_provider()
