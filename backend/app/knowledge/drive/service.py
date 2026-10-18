import re
from typing import Any


def detect_chapters(structured_text: str | None, extension: str = "") -> list[dict[str, Any]]:
    """Build a lightweight outline from stored structural markers for older files."""
    chapters: list[dict[str, Any]] = []
    current_page: int | None = None
    current_location: str | None = None

    for line in (structured_text or "").splitlines():
        page_match = re.match(r"^\[Page\s+(\d+)\]$", line.strip(), re.IGNORECASE)
        slide_match = re.match(r"^\[Diapositive\s+(\d+)\]$", line.strip(), re.IGNORECASE)
        if page_match:
            current_page = int(page_match.group(1))
            current_location = f"Page {current_page}"
            continue
        if slide_match:
            current_page = None
            current_location = f"Diapositive {slide_match.group(1)}"
            continue

        heading = re.match(r"^#{1,6}\s+(.+)$", line.strip())
        if heading:
            chapters.append({
                "number": str(len(chapters) + 1),
                "title": heading.group(1).strip(),
                "page": current_page,
                "location": current_location or ("Section" if extension == ".docx" else None),
                "subtopics": [],
            })
    return chapters


def infer_structural_counts(structured_text: str | None, extension: str) -> tuple[int | None, int | None]:
    text = structured_text or ""
    page_numbers = [
        int(match.group(1))
        for match in re.finditer(r"^\[Page\s+(\d+)\]$", text, flags=re.MULTILINE | re.IGNORECASE)
    ]
    slide_numbers = [
        int(match.group(1))
        for match in re.finditer(r"^\[Diapositive\s+(\d+)\]$", text, flags=re.MULTILINE | re.IGNORECASE)
    ]
    page_count = max(page_numbers) if page_numbers else None
    slide_count = max(slide_numbers) if slide_numbers else None
    if extension == ".pdf":
        return page_count, None
    if extension == ".pptx":
        return None, slide_count
    return page_count, slide_count


def build_index_meta(
    structured_text: str | None,
    extension: str = "",
    page_count: int | None = None,
    slide_count: int | None = None,
    chapters: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    unit_count = page_count if extension == ".pdf" else slide_count if extension == ".pptx" else page_count
    content_unit = "slides" if extension == ".pptx" else "pages" if extension in {".pdf", ".docx"} else "document"
    outline = chapters if chapters is not None else detect_chapters(structured_text, extension)
    return {
        "total_pages_analyzed": unit_count or 0,
        # Chunking/embedding is not performed by this upload path; do not claim paragraphs are indexed chunks.
        "total_chunks": 0,
        "chapters_detected": [chapter["title"] for chapter in outline[:12]],
        "content_unit": content_unit,
    }
