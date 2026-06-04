from typing import List, Tuple

from app.models.chunk import Chunk
from app.services.llm_providers import LLMProviderManager


class LLMService:
    """Génération RAG avec bascule Gemini → Groq → Cerebras → Ollama."""

    def __init__(self) -> None:
        self.manager = LLMProviderManager()

    def _format_history(self, history: List[dict] | None) -> str:
        """Met en forme les derniers échanges pour le prompt (vide si aucun)."""
        if not history:
            return ""
        lines = []
        for msg in history:
            speaker = "Utilisateur" if msg.get("role") == "user" else "Assistant"
            lines.append(f"{speaker} : {msg.get('content', '').strip()}")
        return "\n".join(lines)

    def _build_prompt(
        self,
        question: str,
        context_chunks: List[Chunk],
        history: List[dict] | None = None,
    ) -> str:
        context_text = "\n---\n".join([c.chunk_text for c in context_chunks])
        history_text = self._format_history(history)

        history_block = (
            f"""HISTORIQUE DE LA CONVERSATION (du plus ancien au plus récent) :
{history_text}

"""
            if history_text
            else ""
        )

        return f"""Tu es l'assistant intelligent de la base de connaissances Lekki.
Ta mission est de répondre aux questions des employés en utilisant UNIQUEMENT le contexte fourni ci-dessous.

CONSIGNES :
1. Si la réponse n'est pas dans le contexte, dis poliment que tu ne sais pas.
2. Cite tes sources si nécessaire.
3. Garde un ton professionnel et concis.
4. Tiens compte de l'historique de la conversation pour comprendre les questions de suivi
   (références implicites comme « et pour eux ? », « combien ? », « et ensuite ? »).

{history_block}CONTEXTE :
{context_text}

QUESTION :
{question}

RÉPONSE :"""

    async def ask_question(
        self,
        question: str,
        chunks: List[Chunk],
        history: List[dict] | None = None,
    ) -> Tuple[str, str]:
        """
        Retourne (réponse, nom_du_fournisseur).
        `history` : derniers échanges [{role, content}] pour les questions de suivi.
        Bascule automatique si quota / rate-limit.
        """
        prompt = self._build_prompt(question, chunks, history)
        return await self.manager.generate(prompt)

    def _build_summary_prompt(self, title: str, content: str) -> str:
        # On borne le contenu pour rester dans une fenêtre de contexte raisonnable.
        excerpt = content[:8000]
        return f"""Tu es l'assistant de la base de connaissances Lekki.
Rédige un résumé TL;DR de la page ci-dessous.

CONSIGNES :
1. Entre 5 et 8 lignes, en français.
2. Va à l'essentiel : informations clés, chiffres, règles, étapes importantes.
3. Pas d'introduction ni de conclusion superflue, pas de formule de politesse.
4. Reste fidèle au contenu : n'invente rien.

TITRE : {title}

CONTENU :
{excerpt}

RÉSUMÉ TL;DR :"""

    async def summarize(self, title: str, content: str) -> Tuple[str, str]:
        """
        Produit un résumé TL;DR (5 à 8 lignes) d'une page.
        Retourne (résumé, nom_du_fournisseur). Bascule automatique si quota.
        """
        prompt = self._build_summary_prompt(title, content)
        text, provider = await self.manager.generate(prompt)
        return text.strip(), provider

    def get_providers_status(self) -> list[dict]:
        return self.manager.get_status()

    def get_health(self) -> dict[str, str]:
        return self.manager.get_health()


# Instance partagée : un seul manager → un seul cache de cooldown cohérent
# entre /ask, /llm/status et /system/llm-status.
_shared_service: "LLMService | None" = None


def get_llm_service() -> "LLMService":
    global _shared_service
    if _shared_service is None:
        _shared_service = LLMService()
    return _shared_service
