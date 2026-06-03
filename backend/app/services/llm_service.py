from typing import List, Tuple

from app.models.chunk import Chunk
from app.services.llm_providers import LLMProviderRouter


class LLMService:
    """Génération RAG avec bascule Gemini → Groq → Cerebras."""

    def __init__(self) -> None:
        self.router = LLMProviderRouter()

    def _build_prompt(self, question: str, context_chunks: List[Chunk]) -> str:
        context_text = "\n---\n".join([c.chunk_text for c in context_chunks])

        return f"""Tu es l'assistant intelligent de la base de connaissances Lekki.
Ta mission est de répondre aux questions des employés en utilisant UNIQUEMENT le contexte fourni ci-dessous.

CONSIGNES :
1. Si la réponse n'est pas dans le contexte, dis poliment que tu ne sais pas.
2. Cite tes sources si nécessaire.
3. Garde un ton professionnel et concis.

CONTEXTE :
{context_text}

QUESTION :
{question}

RÉPONSE :"""

    async def ask_question(self, question: str, chunks: List[Chunk]) -> Tuple[str, str]:
        """
        Retourne (réponse, nom_du_fournisseur).
        Bascule automatique si quota / rate-limit.
        """
        prompt = self._build_prompt(question, chunks)
        return await self.router.generate(prompt)

    def get_providers_status(self) -> list[dict]:
        return self.router.get_status()
