"""Mode révision : quiz généré depuis les documents et correction d'anciens sujets.

Deux principes :
- l'IA ne travaille QUE sur les documents que l'étudiant a le droit de lire ;
- si aucun fournisseur d'IA ne répond, on renvoie quand même quelque chose d'utile
  (fiches question/réponse tirées des titres du cours, extraits de cours par question).
"""

from __future__ import annotations

import json
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_service import generate_text
from app.ai.rag_service import _query_terms, calculate_similarity, document_text, extract_relevant_snippet
from app.ai.schemas import AskSource
from app.core.access import (
    accessible_workspace_ids,
    can_read_file,
    can_read_wiki,
    filter_visible_files,
    file_visibility_clause,
)
from app.core.database import get_db
from app.identity.models import User
from app.knowledge.drive.models import DriveFile
from app.knowledge.wiki.models import WikiPage
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/revision", tags=["Révision"])

EXAM_PATTERN = re.compile(r"(sujet|examen|exam|rat|rattrapage|cc|controle|contrôle|partiel|devoir|ds)", re.I)


def is_exam_name(name: str) -> bool:
    tokens = re.split(r"[\s_\-.()]+", name.lower())
    return any(EXAM_PATTERN.fullmatch(token) for token in tokens if token)


# ── Schémas ──────────────────────────────────────────────────────────────────

class QuizRequest(BaseModel):
    file_ids: List[str] = Field(default_factory=list, max_length=5)
    wiki_ids: List[str] = Field(default_factory=list, max_length=5)
    count: int = Field(default=5, ge=3, le=10)
    focus: Optional[str] = Field(default=None, max_length=200, description="Chapitre ou notion à cibler")


class QuizQuestion(BaseModel):
    question: str
    choices: List[str] = []
    answer_index: Optional[int] = None
    answer: str
    explanation: str = ""
    source_title: str = ""


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    provider: Optional[str] = None
    degraded: bool = False


class CorrectionRequest(BaseModel):
    file_id: str


class CorrectionResponse(BaseModel):
    subject_title: str
    answer: str
    sources: List[AskSource] = []
    provider: Optional[str] = None
    degraded: bool = False


# ── Utilitaires ──────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    text = re.sub(r"\[(Page|Diapositive)\s+\d+\]", " ", text, flags=re.I)
    return re.sub(r"[ \t]+", " ", text).strip()


def best_passage(question: str, text: str, max_chars: int = 320) -> str:
    """La ligne du cours qui partage le plus de mots avec la question (+ la suivante)."""
    terms = _query_terms(question)
    lines = [
        " ".join(re.sub(r"^\s*(#{1,6}|[-*•]|\d+(?:\.\d+)*[.)]?)\s+", "", line).split())
        for line in text.splitlines()
    ]
    lines = [line for line in lines if len(line) > 15]
    if not lines or not terms:
        return ""
    scores = [len(terms & _query_terms(line)) for line in lines]
    best = max(range(len(lines)), key=lambda index: scores[index])
    if scores[best] == 0:
        return ""
    passage = lines[best]
    if best + 1 < len(lines) and len(passage) < 160:
        passage += " " + lines[best + 1]
    return passage[:max_chars] + ("…" if len(passage) > max_chars else "")


def _extract_json_array(raw: str) -> list:
    """Les modèles entourent parfois le JSON de texte ou de ```json … ```."""
    raw = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", raw, flags=re.S)
    if fenced:
        raw = fenced.group(1)
    start, end = raw.find("["), raw.rfind("]")
    if start == -1 or end <= start:
        return []
    try:
        value = json.loads(raw[start:end + 1])
    except ValueError:
        return []
    return value if isinstance(value, list) else []


def _sanitize_questions(items: list, count: int, default_source: str) -> List[QuizQuestion]:
    questions: List[QuizQuestion] = []
    for item in items:
        if not isinstance(item, dict) or not str(item.get("question", "")).strip():
            continue
        choices = [str(choice).strip() for choice in item.get("choices") or [] if str(choice).strip()][:5]
        answer_index = item.get("answer_index")
        if not isinstance(answer_index, int) or not (0 <= answer_index < len(choices)):
            answer_index = None
        if len(choices) < 2:
            choices, answer_index = [], None
        answer = str(item.get("answer") or (choices[answer_index] if answer_index is not None else "")).strip()
        if not answer:
            continue
        questions.append(QuizQuestion(
            question=str(item["question"]).strip()[:400],
            choices=choices,
            answer_index=answer_index,
            answer=answer[:600],
            explanation=str(item.get("explanation") or "").strip()[:800],
            source_title=str(item.get("source_title") or default_source).strip()[:200],
        ))
        if len(questions) >= count:
            break
    return questions


def _flashcards_from_headings(sources: list[tuple[str, str]], count: int) -> List[QuizQuestion]:
    """Repli sans IA : une fiche par section titrée du cours."""
    cards: List[QuizQuestion] = []
    for title, text in sources:
        lines = text.splitlines()
        for index, line in enumerate(lines):
            heading = re.match(r"^\s*(#{1,4}\s+|\d+(?:\.\d+)*[.)]?\s+)(.{4,120})$", line)
            if not heading:
                continue
            body: list[str] = []
            for following in lines[index + 1:]:
                if re.match(r"^\s*(#{1,4}\s+|\d+(?:\.\d+)*[.)]?\s+)\S", following):
                    break
                if following.strip():
                    body.append(following.strip(" -•*"))
                if sum(len(part) for part in body) > 320:
                    break
            answer = " ".join(body).strip()
            if len(answer) < 25:
                continue
            cards.append(QuizQuestion(
                question=f"Que retenir de « {heading.group(2).strip(' #:')} » ?",
                answer=answer[:400],
                explanation="Fiche générée à partir des titres du document (IA indisponible).",
                source_title=title,
            ))
            if len(cards) >= count:
                return cards
    return cards


async def _readable_sources(db: AsyncSession, user: User, data: QuizRequest) -> list[tuple[str, str]]:
    sources: list[tuple[str, str]] = []
    for file_id in dict.fromkeys(data.file_ids):
        drive_file = await db.get(DriveFile, file_id)
        if not drive_file or drive_file.is_deleted or not await can_read_file(db, user, drive_file):
            raise HTTPException(status_code=404, detail="Document introuvable")
        sources.append((drive_file.name, _clean(document_text(drive_file))))
    for wiki_id in dict.fromkeys(data.wiki_ids):
        page = await db.get(WikiPage, wiki_id)
        if not page or not await can_read_wiki(db, user, page):
            raise HTTPException(status_code=404, detail="Page Wiki introuvable")
        sources.append((page.title, _clean(page.content or "")))
    return [(title, text) for title, text in sources if text]


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(
    data: QuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.file_ids and not data.wiki_ids:
        raise HTTPException(status_code=400, detail="Choisissez au moins un cours ou une fiche.")
    sources = await _readable_sources(db, current_user, data)
    if not sources:
        raise HTTPException(status_code=422, detail="Ces documents ne contiennent pas de texte exploitable.")

    budget = 7000 // len(sources)
    context = "\n\n".join(f"=== {title} ===\n{text[:budget]}" for title, text in sources)
    focus = f"\nConcentre-toi sur : {data.focus.strip()}." if data.focus and data.focus.strip() else ""

    system_prompt = (
        "Tu es Lekki AI, un répétiteur pour des étudiants ingénieurs en télécommunications. "
        "Tu crées des questions de révision UNIQUEMENT à partir des documents fournis, jamais "
        "à partir de connaissances extérieures. Tu réponds en français et uniquement en JSON."
    )
    user_prompt = f"""DOCUMENTS :
{context}

Crée {data.count} questions à choix multiples pour vérifier la compréhension de ces documents.{focus}
Varie les types : définition, propriété, calcul simple, application.
Chaque question a 4 propositions plausibles et une seule bonne réponse.

Réponds UNIQUEMENT par un tableau JSON, sans texte autour, de la forme :
[{{"question": "…", "choices": ["…", "…", "…", "…"], "answer_index": 0,
  "answer": "la bonne proposition", "explanation": "pourquoi, en une ou deux phrases, d'après le document",
  "source_title": "titre exact du document utilisé"}}]"""

    raw, provider = await generate_text(system_prompt, user_prompt, max_tokens=1800)
    questions = _sanitize_questions(_extract_json_array(raw or ""), data.count, sources[0][0])
    if questions:
        return QuizResponse(questions=questions, provider=provider)

    cards = _flashcards_from_headings(sources, data.count)
    if not cards:
        raise HTTPException(
            status_code=503,
            detail="L'IA est momentanément indisponible et ce document n'a pas de titres exploitables.",
        )
    return QuizResponse(questions=cards, provider="Fiches (sans IA)", degraded=True)


@router.post("/correction", response_model=CorrectionResponse)
async def correct_exam(
    data: CorrectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = await db.get(DriveFile, data.file_id)
    if not subject or subject.is_deleted or not await can_read_file(db, current_user, subject):
        raise HTTPException(status_code=404, detail="Sujet introuvable")
    subject_text = _clean(document_text(subject))
    if not subject_text:
        raise HTTPException(status_code=422, detail="Ce sujet ne contient pas de texte exploitable.")

    # Cours de référence : documents lisibles du même espace, hors autres sujets.
    workspace_ids = await accessible_workspace_ids(db, current_user)
    query = select(DriveFile).where(
        DriveFile.is_deleted == False,  # noqa: E712
        DriveFile.id != subject.id,
        file_visibility_clause(current_user, workspace_ids),
    )
    if subject.workspace_id:
        query = query.where(DriveFile.workspace_id == subject.workspace_id)
    else:
        query = query.where(or_(DriveFile.workspace_id == None, DriveFile.owner_id == current_user.id))  # noqa: E711
    candidates = filter_visible_files(current_user, workspace_ids, (await db.execute(query)).scalars().all())

    probe = subject_text[:2500]
    scored = []
    for drive_file in candidates:
        if is_exam_name(drive_file.name):
            continue
        text = _clean(document_text(drive_file))
        score = calculate_similarity(probe, f"{drive_file.name} {text}")
        if score > 0:
            scored.append((score, drive_file, text))
    wiki_query = select(WikiPage).where(WikiPage.workspace_id == subject.workspace_id) if subject.workspace_id else None
    if wiki_query is not None:
        for page in (await db.execute(wiki_query)).scalars().all():
            text = _clean(page.content or "")
            score = calculate_similarity(probe, f"{page.title} {text}")
            if score > 0:
                scored.append((score + 0.02, page, text))
    scored.sort(key=lambda item: item[0], reverse=True)
    references = scored[:3]

    sources = []
    for score, item, text in references:
        is_file = isinstance(item, DriveFile)
        sources.append(AskSource(
            id=item.id,
            title=item.name if is_file else item.title,
            type="document" if is_file else "wiki",
            detail=("Cours · " + (item.extension or "").lstrip(".").upper()) if is_file else "Wiki",
            excerpt=extract_relevant_snippet(probe, text),
            score=round(score, 2),
            workspace_id=item.workspace_id,
            file_extension=(item.extension or "").lstrip(".") if is_file else None,
        ))

    course_context = "\n\n".join(
        f"=== {(item.name if isinstance(item, DriveFile) else item.title)} ===\n{text[:2500]}"
        for _, item, text in references
    ) or "(aucun cours correspondant n'a été trouvé dans l'espace)"

    system_prompt = (
        "Tu es Lekki AI, un répétiteur pour des étudiants ingénieurs en télécommunications. "
        "Tu proposes la correction d'un ancien sujet d'examen en t'appuyant sur les cours fournis. "
        "Quand un cours justifie une étape, cite son titre entre parenthèses. Quand tu dois utiliser "
        "une connaissance absente des cours, écris-le clairement (« hors cours fournis »). "
        "Réponds en français, en Markdown, question par question : démarche d'abord, résultat ensuite. "
        "Termine par 2 ou 3 conseils de révision pour ce type de sujet."
    )
    user_prompt = f"SUJET « {subject.name} » :\n{subject_text[:5000]}\n\nCOURS DE RÉFÉRENCE :\n{course_context}"

    answer, provider = await generate_text(system_prompt, user_prompt, max_tokens=2200)
    if answer:
        return CorrectionResponse(subject_title=subject.name, answer=answer, sources=sources, provider=provider)

    # Repli sans IA : pour chaque question du sujet, l'extrait de cours le plus proche.
    questions = [
        line.strip() for line in subject_text.splitlines()
        if re.match(r"^\s*(question|exercice|q\d|\d+[.)])", line.strip(), flags=re.I)
    ] or [subject_text[:300]]
    blocks = ["## Pistes de correction (IA indisponible)", "",
              "Pour chaque question, voici le passage de cours le plus proche :", ""]
    for question in questions[:8]:
        blocks.append(f"**{question[:220]}**")
        found = None
        for _, item, text in references:
            passage = best_passage(question, text)
            if passage:
                found = (passage, item.name if isinstance(item, DriveFile) else item.title)
                break
        if found:
            blocks.append(f"> {found[0]}")
            blocks.append(f"> — *{found[1]}*")
        else:
            blocks.append("> Aucun passage de cours correspondant dans cet espace.")
        blocks.append("")
    return CorrectionResponse(
        subject_title=subject.name,
        answer="\n".join(blocks),
        sources=sources,
        provider="Extraits de cours (sans IA)",
        degraded=True,
    )
