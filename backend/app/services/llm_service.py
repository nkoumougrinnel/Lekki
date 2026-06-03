import os
from google import genai
from typing import List
from app.models.chunk import Chunk

class LLMService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

    async def ask_question(self, question: str, chunks: List[Chunk]) -> str:
        prompt = self._build_prompt(question, chunks)
        response = self.client.models.generate_content(
            model="gemini-1.5-flash", contents=prompt
        )
        return response.text