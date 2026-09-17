import re
from typing import Any


def build_index_meta(content: str | None) -> dict[str, Any]:
    text = content or ""
    headings = [
        match.group(1).strip()
        for match in re.finditer(r"^#{1,3}\s+(.+)$", text, flags=re.MULTILINE)
    ]
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    return {
        "total_pages_analyzed": max(1, len(paragraphs)),
        "total_chunks": max(1, len(paragraphs)),
        "chapters_detected": headings[:12],
    }
