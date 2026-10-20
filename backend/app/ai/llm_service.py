import os
import httpx
from typing import Dict, List, Optional, Callable, Awaitable
from app.config import settings

# --- PROVIDER IMPLEMENTATIONS ---

async def call_gemini(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Calls Google Gemini API."""
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[LLM] Gemini skipped: GEMINI_API_KEY is not configured")
        return None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        # Gemini uses a separate system_instruction parameter
        response = client.models.generate_content(
            model=settings.GEMINI_LLM_MODEL,
            contents=user_prompt,
            config={"system_instruction": system_prompt}
        )
        if response and response.text:
            return response.text
    except Exception as exc:
        print(f"[LLM] Gemini Provider failed: {exc}")
    return None

async def call_ollama(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Calls Local Ollama API."""
    url = f"{settings.OLLAMA_URL}/api/generate"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": user_prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_ctx": 4096,
            "num_predict": 512,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                result = response.json()
                return result.get("response")
            print(
                f"[LLM] Ollama returned HTTP {response.status_code}: "
                f"{response.text[:500]}"
            )
    except Exception as exc:
        print(f"[LLM] Ollama Provider failed: {exc}")
    return None

async def call_groq(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Calls Groq's OpenAI-compatible chat completions API."""
    api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("[LLM] Groq skipped: GROQ_API_KEY is not configured")
        return None

    url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 700,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                choices = response.json().get("choices") or []
                if choices:
                    content = choices[0].get("message", {}).get("content")
                    if content:
                        return content
                print("[LLM] Groq returned an empty response")
            else:
                print(
                    f"[LLM] Groq returned HTTP {response.status_code}: "
                    f"{response.text[:500]}"
                )
    except Exception as exc:
        print(f"[LLM] Groq Provider failed: {exc}")
    return None


async def call_cerebras(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Calls Cerebras' OpenAI-compatible chat completions API."""
    api_key = settings.CEREBRAS_API_KEY or os.environ.get("CEREBRAS_API_KEY")
    if not api_key:
        print("[LLM] Cerebras skipped: CEREBRAS_API_KEY is not configured")
        return None

    url = f"{settings.CEREBRAS_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.CEREBRAS_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 700,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                choices = response.json().get("choices") or []
                if choices:
                    content = choices[0].get("message", {}).get("content")
                    if content:
                        return content
                print("[LLM] Cerebras returned an empty response")
            else:
                print(
                    f"[LLM] Cerebras returned HTTP {response.status_code}: "
                    f"{response.text[:500]}"
                )
    except Exception as exc:
        print(f"[LLM] Cerebras Provider failed: {exc}")
    return None

# --- FALLOVER CHAIN ---

# List of providers in order of priority (now taking two arguments)
LLM_CHAIN: List[Callable[[str, str], Awaitable[Optional[str]]]] = [
    call_groq,
    call_gemini,
    call_cerebras,
    call_ollama,
]

async def generate_rag_answer_with_provider(
    question: str,
    context_chunks: List[Dict[str, str]],
    chat_history: Optional[List[Dict[str, str]]] = None,
) -> tuple[str, str]:
    # 0. Aucun document : inutile d'appeler un LLM, il inventerait une réponse
    if not context_chunks:
        return (
            "Je ne trouve aucun document de votre espace qui permette de répondre à cette question. "
            "Vérifiez que le cours ou le TD concerné a bien été importé.",
            "Mode dégradé (aucun document disponible)",
        )

    # 1. Contexte documentaire
    context_text = "\n\n".join(
        f"--- Document : {chunk.get('title', 'Sans titre')} "
        f"(type : {chunk.get('type', 'doc')}) ---\n"
        f"{chunk.get('content', '')[:700]}"
        for chunk in context_chunks
    )

    system_prompt = f"""Tu es Lekki AI, l'assistant pédagogique d'un espace universitaire d'ingénierie \
(réseaux, télécommunications, cybersécurité, informatique). Tu aides un étudiant à comprendre \
ses cours, ses TD et ses TP.

PRINCIPE FONDAMENTAL
Tu réponds à partir des documents fournis ci-dessous. Tu ne complètes pas une notion absente \
des documents avec tes connaissances générales, sauf si l'étudiant le demande explicitement, \
et tu le signales alors clairement.

RÈGLES DE RÉPONSE
1. Commence par une réponse directe en une ou deux phrases.
2. Développe ensuite avec quelques intertitres courts et des puces concrètes. Pour une question \
simple, reste en prose courte.
3. Cite les documents par leur titre entre parenthèses, par exemple (Cours OSPF – Semaine 3). \
Une citation par idée suffit.
4. Ne recopie pas les en-têtes techniques, les métadonnées ni les fragments illisibles.
5. Si les documents répondent partiellement, dis-le en une phrase, donne ce qu'ils permettent \
d'affirmer, puis précise ce qui manque.
6. Si aucun document ne traite la question, dis-le sans inventer de réponse.
7. Si deux documents se contredisent ou utilisent des conventions différentes (cours et TD, par \
exemple), signale-le explicitement, cite les deux sources et indique laquelle semble prévaloir \
dans le contexte.
8. Pour un exercice ou un calcul, explique la démarche avant le résultat.
9. Termine, si c'est utile, par une phrase de révision ou une question de vérification. \
Pas de formule de politesse finale.
10. Réponds toujours en français.

DOCUMENTS SOURCES DE L'ESPACE :
{context_text}
"""

    # 2. Historique récent (les questions de suivi en dépendent)
    history_text = ""
    if chat_history:
        lines = []
        for msg in chat_history[-6:]:
            role = "Étudiant" if msg.get("role") == "user" else "Lekki AI"
            lines.append(f"{role} : {msg.get('content', '')[:500]}")
        history_text = "\n".join(lines)

    user_prompt = ""
    if history_text:
        user_prompt += f"HISTORIQUE RÉCENT (pour comprendre les questions de suivi) :\n{history_text}\n\n"
    user_prompt += (
        "QUESTION DE L'ÉTUDIANT (à laquelle tu réponds uniquement) :\n"
        f"{question}"
    )

    # 3. Chaîne de basculement entre fournisseurs
    provider_names = {
        call_groq: "Groq",
        call_gemini: "Gemini",
        call_cerebras: "Cerebras",
        call_ollama: "Ollama (Local)",
    }
    for provider in LLM_CHAIN:
        answer = await provider(system_prompt, user_prompt)
        if answer:
            return answer, provider_names.get(provider, provider.__name__)

    # 4. Repli sans LLM : extrait du premier document, présenté comme tel
    source = context_chunks[0]
    title = source.get("title", "Sans titre")
    excerpt = source.get("content", "").strip()[:700]
    return (
        f"""## Réponse en mode dégradé

Aucun modèle n'est disponible pour le moment. Voici un extrait du document **{title}** \
qui peut vous aider :

> {excerpt}

Reformulez votre question plus tard pour obtenir une réponse complète.
""",
        "Mode dégradé (aucun fournisseur LLM disponible)",
    )


async def generate_rag_answer(
    question: str,
    context_chunks: List[Dict[str, str]],
    chat_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    answer, _provider = await generate_rag_answer_with_provider(
        question,
        context_chunks,
        chat_history,
    )
    return answer
