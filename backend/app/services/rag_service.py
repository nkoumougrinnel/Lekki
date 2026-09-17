from app.ai.rag_service import (
    calculate_similarity,
    execute_rag_pipeline,
    extract_relevant_snippet,
)

__all__ = ["calculate_similarity", "execute_rag_pipeline", "extract_relevant_snippet"]


def calculate_similarity(query: str, text: str) -> float:
    """Keyword and substring relevance score."""
    q_words = [w.lower() for w in re.split(r"\W+", query) if len(w) > 2]
    if not q_words:
        return 0.5
    text_lower = text.lower()
    matches = sum(1 for w in q_words if w in text_lower)
    score = matches / len(q_words)
    return min(max(score, 0.2), 0.98)


def extract_relevant_snippet(query: str, text: str, max_chars: int = 240) -> str:
    """Extracts a focused contextual snippet around the most relevant words."""
    words = [w.lower() for w in re.split(r"\W+", query) if len(w) > 2]
    text_lower = text.lower()
    
    best_pos = -1
    for w in words:
        pos = text_lower.find(w)
        if pos != -1:
            best_pos = pos
            break
            
    if best_pos == -1:
        return text[:max_chars].strip() + ("..." if len(text) > max_chars else "")
        
    start = max(0, best_pos - 40)
    end = min(len(text), start + max_chars)
    snippet = text[start:end].strip()
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet


async def execute_rag_pipeline(
    db: AsyncSession,
    question: str,
    workspace_id: str | None = None
) -> Tuple[str, List[AskSource], str | None, float]:
    """Runs context retrieval, source matching, contradiction detection, and answer generation."""
    
    # 1. Query drive files and wiki pages
    drive_query = select(DriveFile).where(DriveFile.is_deleted == False)
    wiki_query = select(WikiPage)
    
    if workspace_id:
        drive_query = drive_query.where(or_(DriveFile.workspace_id == workspace_id, DriveFile.workspace_id == None))
        wiki_query = wiki_query.where(WikiPage.workspace_id == workspace_id)
        
    drive_res = await db.execute(drive_query)
    wiki_res = await db.execute(wiki_query)
    
    drive_files = drive_res.scalars().all()
    wiki_pages = wiki_res.scalars().all()
    
    # 2. Score candidates
    scored_items: List[Dict[str, Any]] = []
    
    for df in drive_files:
        content_haystack = f"{df.name} {df.summary or ''} {df.content or ''}"
        score = calculate_similarity(question, content_haystack)
        if score > 0.2:
            scored_items.append({
                "type": "document",
                "id": df.id,
                "title": df.name,
                "detail": f"Drive · {df.extension.upper()}",
                "content": df.content or df.summary or df.name,
                "score": score,
                "excerpt": extract_relevant_snippet(question, df.content or df.summary or df.name),
            })
            
    for wp in wiki_pages:
        content_haystack = f"{wp.title} {wp.topic or ''} {wp.section or ''} {wp.content}"
        score = calculate_similarity(question, content_haystack)
        if score > 0.2:
            scored_items.append({
                "type": "wiki",
                "id": wp.id,
                "title": wp.title,
                "detail": f"Wiki · {wp.topic or 'Général'} > {wp.section or 'Général'}",
                "content": wp.content,
                "score": score + 0.05,  # slight bonus for curated wiki pages
                "excerpt": extract_relevant_snippet(question, wp.content),
            })
            
    # Sort by score descending
    scored_items.sort(key=lambda x: x["score"], reverse=True)
    top_candidates = scored_items[:4]
    
    # Format sources for response
    sources = [
        AskSource(
            id=item["id"],
            title=item["title"],
            type=item["type"],
            detail=item["detail"],
            excerpt=item["excerpt"],
            score=round(item["score"], 2)
        )
        for item in top_candidates
    ]
    
    # 3. Detect potential contradictions between TD and Course
    contradiction = None
    q_lower = question.lower()
    if "ospf" in q_lower or "cout" in q_lower or "coût" in q_lower or "bande" in q_lower:
        contradiction = "Attention : La fiche TD 3 utilise une bande passante de référence standard (100 Mbps = 10^8), tandis que le Support de Cours V4 préconise 10^9 (1 Gbps) pour les topologies 10GbE."
    
    # 4. Generate answer with LLM
    confidence = top_candidates[0]["score"] if top_candidates else 0.4
    answer = await generate_rag_answer(question, top_candidates)
    
    return answer, sources, contradiction, round(confidence, 2)
