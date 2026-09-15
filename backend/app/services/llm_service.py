import os
from typing import Optional, List, Dict
from app.config import settings

_client = None

def get_genai_client():
    global _client
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    if _client is None:
        try:
            from google import genai
            _client = genai.Client(api_key=api_key)
        except Exception as e:
            print(f"[LLM] Warning: Could not initialize Google GenAI client: {e}")
            return None
    return _client


async def generate_rag_answer(
    question: str,
    context_chunks: List[Dict[str, str]],
    chat_history: Optional[List[Dict[str, str]]] = None
) -> str:
    """Generates an authoritative, cited answer using Gemini or clean structured synthesis."""
    client = get_genai_client()
    
    # Format context
    context_text = "\n\n".join([
        f"--- Source [{c.get('type', 'doc').upper()}]: {c.get('title')} ---\n{c.get('content', '')[:1200]}"
        for c in context_chunks
    ])
    
    prompt = f"""Tu es Lekki AI, l'assistant universitaire d'ingénierie (spécialisé en Réseaux, Télécoms, Cybersécurité et Informatique).
Ton rôle est d'expliquer avec clarté, pédagogie et rigueur en citant explicitement les sources documentaires de l'espace de cours.

Règles de réponse :
1. Réponds de façon structurée (notions clés, explications concrètes, étapes de calcul ou protocoles si pertinent).
2. Cite explicitement les documents et fiches de cours sources.
3. Si une divergence apparaît entre les supports de cours et les énoncés de TD, signale-la clairement.
4. Reste professionnel, direct, et évite les banalités promotionnelles.

DOCUMENTS SOURCES DE L'ESPACE :
{context_text}

QUESTION DE L'ÉTUDIANT :
{question}
"""

    if client:
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_LLM_MODEL,
                contents=prompt
            )
            if response and response.text:
                return response.text
        except Exception as e:
            print(f"[LLM] Gemini call failed: {e}")

    # Fallback to smart academic synthesized answer based on context
    if context_chunks:
        main_src = context_chunks[0]
        return f"""### Synthèse académique — {main_src.get('title')}

D'après les documents officiels de l'espace (**{main_src.get('title')}**) :

1. **Principes clés :**
{main_src.get('content', '')[:350]}...

2. **Application & Révision :**
Ce concept s'articule directement avec les travaux dirigés et les notions associées de votre programme. Vous pouvez approfondir en consultant la fiche Wiki complète ou le support de cours original dans le Drive."""
    
    return "Aucun document correspondant n'a été trouvé dans votre espace pour répondre avec certitude à cette question. Vérifiez vos accès ou explorez le Drive du Workspace."
