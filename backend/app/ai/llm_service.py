import os
import httpx
from typing import Dict, List, Optional, Callable, Awaitable
from app.config import settings

# --- PROVIDER IMPLEMENTATIONS ---

async def call_gemini(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Calls Google Gemini API."""
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if not api_key:
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
]

async def generate_rag_answer(
    question: str,
    context_chunks: List[Dict[str, str]],
    chat_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    # 1. Build the System Prompt
    context_text = "\n\n".join(
        f"--- Source [{chunk.get('type', 'doc').upper()}]: {chunk.get('title')} ---\n{chunk.get('content', '')[:700]}"
        for chunk in context_chunks
    )

    system_prompt = f"""Tu es Lekki AI, l'assistant universitaire d'ingénierie (spécialisé en Réseaux, Télécoms, Cybersécurité et Informatique).
Ton rôle est d'expliquer avec clarté, pédagogie et rigueur en citant explicitement les sources documentaires de l'espace de cours.

Règles de réponse :
1. Commence par une réponse directe en 1 ou 2 phrases.
2. Développe ensuite avec des titres courts et des puces concrètes.
3. Explique les notions présentes dans les documents, sans inventer ce qui n'est pas fourni.
4. Cite les documents par leur titre entre parenthèses, sans recopier les en-têtes techniques ni les octets PDF.
5. Signale clairement toute divergence entre supports de cours et TD.
6. Termine par une phrase de révision ou un exemple seulement s'il est pertinent.

DOCUMENTS SOURCES DE L'ESPACE :
{context_text}
"""

    user_prompt = f"QUESTION DE L'ÉTUDIANT :\n{question}"

    # 2. Iterate through the failover chain
    for provider in LLM_CHAIN:
        answer = await provider(system_prompt, user_prompt)
        if answer:
            return answer

    # 3. Absolute Fallback: Return raw content if no LLM is available
    if context_chunks:
        source = context_chunks[0]
        content = source.get("content", "").strip()
        return f"""## Réponse (Mode Dégradé)

Voici l'essentiel à retenir à partir de **{source.get('title')}** :

### Points clés
- {content[:700]}

### Source
Cette réponse s'appuie sur « {source.get('title')} ».
"""

    return "Aucun document correspondant n'a été trouvé dans votre espace pour répondre avec certitude à cette question."
