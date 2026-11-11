"""Transformer des octets en document Lekki : stockage, extraction du texte, miniature.

Partagé par l'envoi de fichiers, l'import de dossier et l'import depuis Google Drive,
pour que tous les chemins produisent exactement le même document.
"""
from __future__ import annotations

import json
import os
import uuid
from typing import Optional

from app.knowledge.drive.models import DriveFile
from app.knowledge.drive.parser import DocumentParserService
from app.knowledge.drive.photos import PHOTO_EXTENSIONS, PhotoError, photos_to_pdf
from app.knowledge.drive.preview import PreviewService

STORAGE_DIR = "storage/files"
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md"}

_parser = DocumentParserService()
_preview = PreviewService()


class IngestError(Exception):
    """Document refusé : format non pris en charge ou aucun texte lisible."""


def accepted_extension(filename: str) -> bool:
    extension = os.path.splitext(filename)[1].lower()
    return extension in SUPPORTED_EXTENSIONS or extension in PHOTO_EXTENSIONS


def build_document(
    data: bytes,
    filename: str,
    *,
    workspace_id: Optional[str],
    folder_id: Optional[str],
    owner_id: str,
    tags: str = "[]",
) -> DriveFile:
    """Écrit le fichier, en extrait le texte et renvoie l'enregistrement (non ajouté à la session).

    Travail bloquant (lecture PDF, OCR) : à appeler hors de la boucle asynchrone si besoin."""
    name = filename.strip() or "document.pdf"
    extension = os.path.splitext(name)[1].lower()
    if extension in PHOTO_EXTENSIONS:
        try:
            data = photos_to_pdf([data])
        except PhotoError as error:
            raise IngestError(str(error)) from error
        name = os.path.splitext(name)[0] + ".pdf"
        extension = ".pdf"
    if extension not in SUPPORTED_EXTENSIONS:
        raise IngestError("Format non pris en charge (PDF, DOCX, PPTX, TXT, MD ou photo).")

    os.makedirs(STORAGE_DIR, exist_ok=True)
    file_id = f"file-{uuid.uuid4().hex[:8]}"
    file_path = os.path.join(STORAGE_DIR, f"{file_id}{extension}")
    with open(file_path, "wb") as buffer:
        buffer.write(data)

    try:
        parsed = _parser.parse(file_path, extension)
        content = (parsed.get("raw_text") or "").strip()
        structured_text = (parsed.get("structured_text") or "").strip()
        if not content and not structured_text:
            raise IngestError("Aucun texte lisible (document vide, protégé ou scan illisible).")

        thumb_path = None
        if extension == ".pdf":
            thumb_path = _preview.generate_pdf_thumbnail(file_path, file_id)
        elif extension in {".docx", ".pptx"}:
            thumb_path = _preview.generate_office_thumbnail(file_path, file_id)
    except Exception:
        if os.path.isfile(file_path):
            os.remove(file_path)
        raise

    return DriveFile(
        id=file_id,
        name=name,
        extension=extension,
        content=content,
        structured_text=structured_text,
        page_count=parsed.get("page_count"),
        slide_count=parsed.get("slide_count"),
        content_unit=parsed.get("content_unit"),
        detected_chapters=json.dumps(parsed.get("detected_chapters") or [], ensure_ascii=False),
        summary=_preview.get_text_snippet(content),
        size=os.path.getsize(file_path),
        tags=tags,
        thumbnail_path=thumb_path,
        workspace_id=workspace_id,
        folder_id=folder_id,
        owner_id=owner_id,
        scope="workspace" if workspace_id else "personal",
    )
