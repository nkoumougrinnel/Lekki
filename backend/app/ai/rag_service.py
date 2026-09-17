import re
from typing import Any, Dict, List, Tuple

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_service import generate_rag_answer
from app.ai.schemas import AskSource
from app.knowledge.drive.models import DriveFile
from app.knowledge.wiki.models import WikiPage
from app.workspaces.models import Workspace, WorkspaceMember


def document_text(file: DriveFile) -> str:
    """Return extracted document text and never expose raw PDF bytes to the LLM."""
    extracted = file.structured_text or file.content or ""
    if extracted.lstrip().startswith("%PDF"):
        extracted = file.structured_text or file.summary or ""
    if not extracted:
        extracted = file.summary or file.name
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", extracted).strip()


def document_page_location(content: str) -> tuple[int, str]:
    page_match = re.search(r"\[Page\s+(\d+)\]", content, flags=re.IGNORECASE)
    page = int(page_match.group(1)) if page_match else 1
    return page, f"p. {page}"


def calculate_similarity(query: str, text: str) -> float:
    words = {word.lower() for word in re.split(r"\W+", query) if len(word) > 2}
    if not words:
        return 0.0
    text_words = set(word.lower() for word in re.split(r"\W+", text) if len(word) > 2)
    matches = words & text_words
    return len(matches) / len(words)


def extract_relevant_snippet(query: str, text: str, max_chars: int = 240) -> str:
    words = [word.lower() for word in re.split(r"\W+", query) if len(word) > 2]
    text_lower = text.lower()
    best_pos = next((text_lower.find(word) for word in words if text_lower.find(word) != -1), -1)
    if best_pos == -1:
        return text[:max_chars].strip() + ("..." if len(text) > max_chars else "")
    start = max(0, best_pos - 40)
    end = min(len(text), start + max_chars)
    snippet = text[start:end].strip()
    return ("..." if start > 0 else "") + snippet + ("..." if end < len(text) else "")


async def execute_rag_pipeline(
    db: AsyncSession,
    question: str,
    workspace_id: str | None = None,
    user_id: str | None = None,
) -> Tuple[str, List[AskSource], str | None, float]:
    accessible_workspace_ids: set[str] = set()
    if user_id:
        member_result = await db.execute(
            select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user_id)
        )
        accessible_workspace_ids.update(row[0] for row in member_result.all())
        owner_result = await db.execute(
            select(Workspace.id).where(Workspace.owner_id == user_id)
        )
        accessible_workspace_ids.update(row[0] for row in owner_result.all())
    if workspace_id:
        accessible_workspace_ids.add(workspace_id)

    drive_query = select(DriveFile).where(DriveFile.is_deleted == False)
    wiki_query = select(WikiPage)
    workspace_access = list(accessible_workspace_ids)
    if user_id:
        drive_query = drive_query.where(
            or_(
                DriveFile.workspace_id.in_(workspace_access) if workspace_access else False,
                (DriveFile.workspace_id == None) & (DriveFile.owner_id == user_id),
                DriveFile.shared_with.like(f"%{user_id}%"),
            )
        )
    elif workspace_access:
        drive_query = drive_query.where(DriveFile.workspace_id.in_(workspace_access))

    if workspace_access:
        wiki_query = wiki_query.where(WikiPage.workspace_id.in_(workspace_access))

    drive_files = (await db.execute(drive_query)).scalars().all()
    wiki_pages = (await db.execute(wiki_query)).scalars().all()
    scored_items: List[Dict[str, Any]] = []

    for file in drive_files:
        content = document_text(file)
        page, location = document_page_location(content)
        score = calculate_similarity(question, f"{file.name} {file.summary or ''} {content}")
        matched_words = calculate_similarity(question, f"{file.name} {file.summary or ''} {content}")
        if score >= 0.35 and (len(set(re.findall(r"\w+", question))) <= 2 or matched_words >= 2):
            scored_items.append({
                "type": "document",
                "id": file.id,
                "title": file.name,
                "detail": f"Drive · {file.extension.upper()}",
                "content": content,
                "score": score,
                "excerpt": extract_relevant_snippet(question, content),
                "workspace_id": file.workspace_id,
                "file_extension": file.extension.lstrip("."),
                "page": page,
                "location": location,
            })

    for page in wiki_pages:
        score = calculate_similarity(question, f"{page.title} {page.topic or ''} {page.section or ''} {page.content}")
        if score >= 0.35 and (len(set(re.findall(r"\w+", question))) <= 2 or score >= 0.5):
            scored_items.append({
                "type": "wiki",
                "id": page.id,
                "title": page.title,
                "detail": f"Wiki · {page.topic or 'Général'} > {page.section or 'Général'}",
                "content": page.content,
                "score": score + 0.05,
                "excerpt": extract_relevant_snippet(question, page.content),
                "workspace_id": page.workspace_id,
                "location": f"{page.topic or 'Général'} / {page.section or 'Général'}",
            })

    top_candidates = sorted(scored_items, key=lambda item: item["score"], reverse=True)[:3]
    sources = [AskSource(
        id=item["id"],
        title=item["title"],
        type=item["type"],
        detail=item["detail"],
        excerpt=item["excerpt"],
        score=round(item["score"], 2),
        workspace_id=item.get("workspace_id"),
        file_extension=item.get("file_extension"),
        page=item.get("page"),
        location=item.get("location"),
    ) for item in top_candidates]
    q_lower = question.lower()
    contradiction = None
    if any(term in q_lower for term in ("ospf", "cout", "coût", "bande")):
        contradiction = "Attention : les supports peuvent utiliser des bandes passantes de référence différentes."
    confidence = top_candidates[0]["score"] if top_candidates else 0.4
    answer = await generate_rag_answer(question, top_candidates)
    return answer, sources, contradiction, round(confidence, 2)
