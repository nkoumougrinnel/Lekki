from typing import List, Optional
import json
import uuid
import os
import re
import shutil
from html import escape
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, HTMLResponse, Response
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.knowledge.drive.models import DriveFolder, DriveFile
from app.knowledge.drive.schemas import FolderOut, FolderCreate, FolderUpdate, FileOut, FileCreate, FileUpdate
from app.knowledge.drive.service import build_index_meta, detect_chapters, infer_structural_counts
from app.knowledge.drive.parser import DocumentParserService
from app.knowledge.drive.preview import PreviewService
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/drive", tags=["Drive"])

# Storage config
STORAGE_DIR = "storage/files"
os.makedirs(STORAGE_DIR, exist_ok=True)

# Services
parser_service = DocumentParserService()
preview_service = PreviewService()


def _normalized_extension(extension: Optional[str]) -> str:
    if not extension:
        return ""
    return extension if extension.startswith(".") else f".{extension}"


def _fallback_thumbnail(drive_file: DriveFile) -> str:
    os.makedirs(preview_service.thumbnail_dir, exist_ok=True)
    thumbnail_path = os.path.join(preview_service.thumbnail_dir, f"{drive_file.id}.jpg")
    image = Image.new("RGB", (600, 400), (22, 26, 34))
    draw = ImageDraw.Draw(image)
    title = drive_file.name or "Document"
    text = drive_file.summary or drive_file.content or "Apercu non disponible"
    draw.text((32, 32), title[:70], fill=(236, 253, 245))
    draw.text((32, 92), text[:500], fill=(161, 161, 170), spacing=8)
    image.save(thumbnail_path, "JPEG", quality=85)
    return thumbnail_path


def _file_out(drive_file: DriveFile) -> FileOut:
    extension = _normalized_extension(drive_file.extension).lower()
    try:
        tags = json.loads(drive_file.tags or "[]")
        if not isinstance(tags, list):
            tags = []
    except (TypeError, ValueError):
        tags = []
    try:
        shared_with = json.loads(drive_file.shared_with or "[]")
        if not isinstance(shared_with, list):
            shared_with = []
    except (TypeError, ValueError):
        shared_with = []

    inferred_pages, inferred_slides = infer_structural_counts(drive_file.structured_text, extension)
    page_count = drive_file.page_count or inferred_pages
    slide_count = drive_file.slide_count or inferred_slides
    try:
        chapters = json.loads(drive_file.detected_chapters or "[]")
        if not isinstance(chapters, list):
            chapters = []
    except (TypeError, ValueError):
        chapters = []
    if not chapters:
        chapters = detect_chapters(drive_file.structured_text, extension)

    thumbnail_path = drive_file.thumbnail_path
    if not thumbnail_path and extension in {".pdf", ".docx", ".pptx"}:
        # Advertise the lazy thumbnail endpoint for older files uploaded before
        # page previews were generated; the endpoint will render it on demand.
        source_path = os.path.join(STORAGE_DIR, f"{drive_file.id}{extension}")
        expected_thumbnail = os.path.join(preview_service.thumbnail_dir, f"{drive_file.id}.jpg")
        if os.path.isfile(source_path) and not os.path.isfile(expected_thumbnail):
            thumbnail_path = expected_thumbnail
        elif os.path.isfile(expected_thumbnail):
            thumbnail_path = expected_thumbnail

    return FileOut(
        id=drive_file.id,
        name=drive_file.name,
        extension=extension.lstrip("."),
        size=drive_file.size,
        content=drive_file.content,
        structured_text=drive_file.structured_text,
        page_count=page_count,
        slide_count=slide_count,
        content_unit=drive_file.content_unit or (
            "pages" if extension == ".pdf" else "slides" if extension == ".pptx" else "pages" if extension == ".docx" else "document"
        ),
        detected_chapters=chapters,
        summary=drive_file.summary,
        thumbnail_path=thumbnail_path,
        workspace_id=drive_file.workspace_id,
        folder_id=drive_file.folder_id,
        scope=drive_file.scope,
        shared_with=shared_with,
        is_starred=drive_file.is_starred,
        is_deleted=drive_file.is_deleted,
        tags=tags,
        index_meta=build_index_meta(drive_file.structured_text or drive_file.content, extension, page_count, slide_count, chapters),
        created_at=drive_file.created_at,
        updated_at=drive_file.updated_at,
    )

# ── Folders ──────────────────────────────────────────────────────────────────
# ... (list_folders, create_folder, update_folder, delete_folder stay the same)


# ── Folders ──────────────────────────────────────────────────────────────────
@router.get("/folders", response_model=List[FolderOut])
async def list_folders(
    scope: Optional[str] = None,
    workspace_id: Optional[str] = None,
    parent_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(DriveFolder)
    if workspace_id:
        query = query.where(DriveFolder.workspace_id == workspace_id)
    if parent_id is not None:
        if parent_id == "":
            query = query.where(DriveFolder.parent_id == None)
        else:
            query = query.where(DriveFolder.parent_id == parent_id)
            
    result = await db.execute(query)
    folders = result.scalars().all()
    
    out = []
    for f in folders:
        cnt_res = await db.execute(
            select(func.count(DriveFile.id)).where(DriveFile.folder_id == f.id, DriveFile.is_deleted == False)
        )
        cnt = cnt_res.scalar() or 0
        out.append(FolderOut(
            id=f.id,
            name=f.name,
            workspace_id=f.workspace_id,
            parent_id=f.parent_id,
            files_count=cnt,
            created_at=f.created_at
        ))
    return out


@router.post("/folders", response_model=FolderOut)
async def create_folder(
    data: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    parent_workspace_id = None
    if data.parent_id:
        parent_result = await db.execute(
            select(DriveFolder).where(DriveFolder.id == data.parent_id)
        )
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Dossier parent introuvable")
        parent_workspace_id = parent.workspace_id

    folder = DriveFolder(
        id=f"folder-{uuid.uuid4().hex[:8]}",
        name=data.name,
        workspace_id=parent_workspace_id if data.parent_id else data.workspace_id,
        parent_id=data.parent_id,
        owner_id=current_user.id
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return FolderOut(
        id=folder.id,
        name=folder.name,
        workspace_id=folder.workspace_id,
        parent_id=folder.parent_id,
        files_count=0,
        created_at=folder.created_at
    )


@router.put("/folders/{folder_id}", response_model=FolderOut)
async def update_folder(
    folder_id: str,
    data: FolderUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DriveFolder).where(DriveFolder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    if data.name:
        folder.name = data.name
    if data.parent_id is not None:
        folder.parent_id = data.parent_id or None
    await db.commit()
    await db.refresh(folder)
    return FolderOut(
        id=folder.id,
        name=folder.name,
        workspace_id=folder.workspace_id,
        parent_id=folder.parent_id,
        files_count=0,
        created_at=folder.created_at
    )


@router.delete("/folders/{folder_id}")
async def delete_folder(folder_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DriveFolder).where(DriveFolder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    folder_ids = [folder_id]
    pending_folder_ids = [folder_id]
    while pending_folder_ids:
        children_result = await db.execute(
            select(DriveFolder.id).where(DriveFolder.parent_id.in_(pending_folder_ids))
        )
        child_ids = [row[0] for row in children_result.all()]
        folder_ids.extend(child_ids)
        pending_folder_ids = child_ids

    files_result = await db.execute(
        select(DriveFile).where(DriveFile.folder_id.in_(folder_ids))
    )
    for drive_file in files_result.scalars().all():
        drive_file.is_deleted = True
        drive_file.folder_id = None

    folders_result = await db.execute(
        select(DriveFolder).where(DriveFolder.id.in_(folder_ids))
    )
    for child_folder in folders_result.scalars().all():
        await db.delete(child_folder)

    await db.commit()
    return None


# ── Files ────────────────────────────────────────────────────────────────────
@router.get("/files", response_model=List[FileOut])
async def list_files(
    scope: Optional[str] = None,
    workspace_id: Optional[str] = None,
    folder_id: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(DriveFile)
    
    if scope == "trash":
        query = query.where(DriveFile.is_deleted == True)
    else:
        query = query.where(DriveFile.is_deleted == False)

    if scope == "starred":
        query = query.where(DriveFile.is_starred == True)
    elif scope == "personal":
        query = query.where(DriveFile.owner_id == current_user.id, DriveFile.scope == "personal")
    elif scope == "shared_with_me":
        query = query.where(DriveFile.shared_with.like(f"%{current_user.id}%"))
    elif workspace_id:
        query = query.where(DriveFile.workspace_id == workspace_id)

    if folder_id is not None:
        if folder_id == "":
            query = query.where(DriveFile.folder_id == None)
        else:
            query = query.where(DriveFile.folder_id == folder_id)

    if search:
        s_pattern = f"%{search.lower()}%"
        query = query.where(
            or_(
                DriveFile.name.ilike(s_pattern),
                DriveFile.summary.ilike(s_pattern),
                DriveFile.content.ilike(s_pattern)
            )
        )

    result = await db.execute(query)
    files = result.scalars().all()

    return [_file_out(drive_file) for drive_file in files]


@router.get("/files/{file_id}/download")
async def download_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DriveFile).where(DriveFile.id == file_id))
    drive_file = result.scalar_one_or_none()
    if not drive_file:
        raise HTTPException(status_code=404, detail="Document introuvable")

    extension = _normalized_extension(drive_file.extension)
    file_path = os.path.join(STORAGE_DIR, f"{file_id}{extension}")
    if not os.path.isfile(file_path):
        safe_name = drive_file.name.replace('"', "")
        fallback_content = drive_file.content or drive_file.summary or (
            f"Document Lekki : {drive_file.name}\n"
            "Le fichier original n'est plus disponible dans le stockage."
        )
        return Response(
            content=fallback_content.encode("utf-8"),
            media_type="text/plain",
            headers={"Content-Disposition": f'inline; filename="{safe_name}.txt"'},
        )

    return FileResponse(
        file_path,
        filename=drive_file.name,
        content_disposition_type="inline",
    )


def _render_word_blocks(text: str) -> str:
    lines = text.splitlines()
    blocks: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            level = min(len(heading.group(1)), 4)
            blocks.append(f"<h{level}>{escape(heading.group(2))}</h{level}>")
            index += 1
            continue

        if " | " in line:
            rows = []
            while index < len(lines) and " | " in lines[index]:
                cells = [cell.strip() for cell in lines[index].split(" | ")]
                rows.append("<tr>" + "".join(f"<td>{escape(cell)}</td>" for cell in cells) + "</tr>")
                index += 1
            blocks.append("<div class='table-wrap'><table>" + "".join(rows) + "</table></div>")
            continue

        list_match = re.match(r"^(?:[-*•]\s+|\d+[.)]\s+)(.+)$", line)
        if list_match:
            ordered = bool(re.match(r"^\d+[.)]\s+", line))
            tag = "ol" if ordered else "ul"
            items = []
            while index < len(lines):
                candidate = lines[index].strip()
                item = re.match(r"^(?:[-*•]\s+|\d+[.)]\s+)(.+)$", candidate)
                if not item:
                    break
                items.append(f"<li>{escape(item.group(1))}</li>")
                index += 1
            blocks.append(f"<{tag}>" + "".join(items) + f"</{tag}>")
            continue

        blocks.append(f"<p>{escape(line)}</p>")
        index += 1

    return "".join(blocks) or "<p class='empty'>Aucun texte extractible.</p>"


def _build_word_preview(filename: str, text: str) -> str:
    body = _render_word_blocks(text)
    safe_filename = escape(filename)
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Aperçu de {safe_filename}</title><style>
      *{{box-sizing:border-box}}body{{margin:0;padding:34px 20px;background:#e9edf2;color:#252a33;font:15px/1.75 Aptos,Calibri,Arial,sans-serif}}
      .toolbar{{max-width:850px;margin:0 auto 14px;color:#64748b;font:11px/1.4 system-ui,sans-serif;display:flex;justify-content:space-between;gap:10px}}
      main{{max-width:850px;min-height:1050px;margin:0 auto;padding:70px 76px;background:#fff;border:1px solid #dbe1e8;box-shadow:0 12px 38px #17203318}}
      .doc-title{{margin:0 0 32px;padding-bottom:18px;border-bottom:1px solid #e5eaf0;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;overflow-wrap:anywhere}}
      h1{{font-size:30px}}h2{{font-size:25px}}h3{{font-size:20px}}h4{{font-size:17px}}
      main h1,main h2,main h3,main h4{{color:#202a38;line-height:1.3;margin:1.6em 0 .55em}}
      main h1:first-child,main h2:first-child,main h3:first-child{{margin-top:0}}
      p{{margin:.55em 0;white-space:pre-wrap}}ul,ol{{padding-left:1.6em}}li{{padding-left:.25em;margin:.25em 0}}
      .table-wrap{{overflow-x:auto;margin:1.2em 0}}table{{width:100%;border-collapse:collapse;font-size:13px}}td{{border:1px solid #d7dee8;padding:9px 11px;vertical-align:top}}tr:first-child td{{background:#f2f6fc;font-weight:600}}
      .empty{{color:#94a3b8;font-style:italic}}@media(max-width:600px){{body{{padding:0}}.toolbar{{padding:12px}}main{{min-height:100vh;padding:36px 22px;border:0;box-shadow:none}}}}
    </style></head><body><div class="toolbar"><span>APERÇU WORD · MISE EN PAGE RECONSTRUITE À PARTIR DU TEXTE</span><span>DOCX</span></div>
    <main><div class="doc-title">{safe_filename}</div>{body}</main></body></html>"""


def _build_presentation_preview(filename: str, text: str) -> str:
    parts = re.split(r"(?im)^\[Diapositive\s+(\d+)\]\s*$", text)
    slides: list[tuple[str, str]] = []
    if len(parts) > 1:
        for index in range(1, len(parts), 2):
            number = parts[index]
            slide_text = parts[index + 1] if index + 1 < len(parts) else ""
            slides.append((number, slide_text))
    else:
        slides = [("1", text)]

    rendered_slides = []
    for number, slide_text in slides:
        lines = [line.strip() for line in slide_text.splitlines() if line.strip()]
        if lines and lines[0].startswith("#"):
            lines[0] = re.sub(r"^#{1,6}\s+", "", lines[0])
        title = lines[0] if lines else "Diapositive sans titre"
        content_lines = lines[1:] if len(lines) > 1 else []
        content_blocks = []
        index = 0
        while index < len(content_lines):
            line = content_lines[index]
            bullet = re.match(r"^(?:[-*•]\s+|\d+[.)]\s+)(.+)$", line)
            if bullet:
                items = []
                while index < len(content_lines):
                    item = re.match(r"^(?:[-*•]\s+|\d+[.)]\s+)(.+)$", content_lines[index])
                    if not item:
                        break
                    items.append(f"<li>{escape(item.group(1))}</li>")
                    index += 1
                content_blocks.append("<ul>" + "".join(items) + "</ul>")
            else:
                content_blocks.append(f"<p>{escape(line)}</p>")
                index += 1
        if not content_blocks:
            content_blocks.append("<p class='empty'>Aucun texte extractible sur cette diapositive.</p>")
        rendered_slides.append(
            f"<section class='slide'><div class='slide-accent'></div><h2>{escape(title)}</h2>"
            f"<div class='slide-content'>{''.join(content_blocks)}</div>"
            f"<footer><span>{escape(filename)}</span><span>{escape(number)}</span></footer></section>"
        )

    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1"><title>Aperçu de {escape(filename)}</title><style>
      *{{box-sizing:border-box}}body{{margin:0;padding:26px;background:#17191e;color:#27272a;font:15px/1.65 Aptos,Calibri,Arial,sans-serif}}
      .deck-head{{max-width:1080px;margin:0 auto 18px;color:#a1a1aa;font:11px/1.4 system-ui,sans-serif;display:flex;justify-content:space-between;gap:10px}}
      .slide{{position:relative;display:flex;flex-direction:column;aspect-ratio:16/9;min-height:340px;max-width:1080px;margin:0 auto 28px;padding:clamp(28px,5vw,68px);overflow:hidden;background:linear-gradient(135deg,#fff 0%,#fff 78%,#fff7ed 100%);border:1px solid #e4e4e7;border-radius:5px;box-shadow:0 18px 48px #0005}}
      .slide-accent{{position:absolute;left:0;top:0;bottom:0;width:10px;background:#f97316}}.slide h2{{margin:0 0 24px;color:#252a34;font-size:clamp(21px,3vw,38px);line-height:1.2;overflow-wrap:anywhere}}
      .slide-content{{flex:1;overflow:hidden;color:#404554;font-size:clamp(14px,1.6vw,20px)}}.slide-content p{{margin:.6em 0;white-space:pre-wrap}}.slide-content ul{{padding-left:1.4em}}.slide-content li{{margin:.35em 0;padding-left:.2em}}.slide-content li::marker{{color:#f97316}}
      .slide footer{{display:flex;justify-content:space-between;gap:12px;margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;color:#9ca3af;font:10px system-ui,sans-serif;overflow:hidden}}.slide footer span:first-child{{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}.empty{{color:#9ca3af;font-style:italic}}
      @media(max-width:600px){{body{{padding:12px}}.deck-head{{padding:4px}}.slide{{aspect-ratio:auto;min-height:360px;padding:32px 24px 24px 30px}}.slide-accent{{width:6px}}}}
    </style></head><body><header class="deck-head"><span>APERÇU POWERPOINT · DIAPOSITIVES RECONSTRUITES À PARTIR DU TEXTE</span><span>{len(slides)} DIAPOSITIVE(S)</span></header>{''.join(rendered_slides)}</body></html>"""


@router.get("/files/{file_id}/preview")
async def preview_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DriveFile).where(DriveFile.id == file_id))
    drive_file = result.scalar_one_or_none()
    if not drive_file:
        raise HTTPException(status_code=404, detail="Document introuvable")

    extension = _normalized_extension(drive_file.extension).lower()
    file_path = os.path.join(STORAGE_DIR, f"{file_id}{extension}")
    if extension == ".pdf" and os.path.isfile(file_path):
        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename=drive_file.name,
            content_disposition_type="inline",
        )

    text = drive_file.structured_text or drive_file.content or drive_file.summary or "Aucun texte extractible."
    if extension == ".pptx":
        html = _build_presentation_preview(drive_file.name, text)
    else:
        html = _build_word_preview(drive_file.name, text)

    return HTMLResponse(
        html,
        headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline';", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/files/{file_id}/thumbnail")
async def file_thumbnail(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DriveFile).where(DriveFile.id == file_id))
    drive_file = result.scalar_one_or_none()
    if not drive_file:
        raise HTTPException(status_code=404, detail="Document introuvable")
    extension = _normalized_extension(drive_file.extension).lower()
    file_path = os.path.join(STORAGE_DIR, f"{file_id}{extension}")
    thumbnail_path = drive_file.thumbnail_path
    if not thumbnail_path or not os.path.isfile(thumbnail_path):
        if os.path.isfile(file_path):
            if extension == ".pdf":
                thumbnail_path = preview_service.generate_pdf_thumbnail(file_path, file_id)
            elif extension in {".docx", ".pptx"}:
                thumbnail_path = preview_service.generate_office_thumbnail(file_path, file_id)
        if not thumbnail_path:
            thumbnail_path = _fallback_thumbnail(drive_file)
        drive_file.thumbnail_path = thumbnail_path
        await db.commit()
    return FileResponse(thumbnail_path, media_type="image/jpeg")


@router.get("/files/{file_id}", response_model=FileOut)
async def get_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DriveFile).where(DriveFile.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Document introuvable")
    return _file_out(f)


@router.post("/files", response_model=FileOut)
async def create_file(
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    tags: Optional[str] = Form("[]"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. File basics
    file_id = f"file-{uuid.uuid4().hex[:8]}"
    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in {".pdf", ".docx", ".pptx", ".txt", ".md"}:
        raise HTTPException(status_code=415, detail="Format accepté : PDF, DOCX, PPTX, TXT ou MD")
    file_path = os.path.join(STORAGE_DIR, f"{file_id}{extension}")

    # Save file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # 2. Extraction & Parsing
    parsing_result = parser_service.parse(file_path, extension)
    content = (parsing_result.get("raw_text") or "").strip()
    structured_text = (parsing_result.get("structured_text") or "").strip()
    if not content and not structured_text:
        os.remove(file_path)
        raise HTTPException(
            status_code=422,
            detail=(
                "Aucun texte n'a pu être extrait. Vérifiez que le document n'est pas vide, "
                "protégé ou scanné sans texte OCR exploitable."
            ),
        )

    # 3. Preview Generation
    thumb_path = None
    if extension == ".pdf":
        thumb_path = preview_service.generate_pdf_thumbnail(file_path, file_id)
    elif extension in {".docx", ".pptx"}:
        thumb_path = preview_service.generate_office_thumbnail(file_path, file_id)
    elif extension in [".jpg", ".jpeg", ".png"]:
        thumb_path = preview_service.generate_image_thumbnail(file_path, file_id)

    snippet = preview_service.get_text_snippet(content)

    # 4. DB Record
    f = DriveFile(
        id=file_id,
        name=file.filename,
        extension=extension,
        content=content,
        structured_text=structured_text,
        page_count=parsing_result.get("page_count"),
        slide_count=parsing_result.get("slide_count"),
        content_unit=parsing_result.get("content_unit"),
        detected_chapters=json.dumps(parsing_result.get("detected_chapters") or [], ensure_ascii=False),
        summary=snippet,
        size=file_size,
        tags=tags,
        thumbnail_path=thumb_path,
        workspace_id=workspace_id,
        folder_id=folder_id,
        owner_id=current_user.id,
        scope="workspace" if workspace_id else "personal"
    )
    db.add(f)
    await db.commit()
    await db.refresh(f)

    return _file_out(f)


@router.post("/files/import", response_model=List[FileOut])
async def import_files(
    files: List[UploadFile] = File(...),
    folder_ids: Optional[str] = Form(None),
    workspace_id: Optional[str] = Form(None),
    tags: Optional[str] = Form("[]"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import several files at once, preserving a per-file folder destination.

    `folder_ids` is a JSON array parallel to `files` (each entry a folder_id or null).
    Folder hierarchy must be created on the client before calling this endpoint.
    """
    if not files:
        raise HTTPException(status_code=400, detail="Aucun fichier à importer.")

    try:
        folder_ids_list = json.loads(folder_ids) if folder_ids else []
    except (TypeError, ValueError):
        folder_ids_list = []

    try:
        tags_list = json.loads(tags) if tags else []
        if not isinstance(tags_list, list):
            tags_list = []
    except (TypeError, ValueError):
        tags_list = []

    results: List[FileOut] = []

    for index, file in enumerate(files):
        filename = file.filename or f"document-{index}"
        extension = os.path.splitext(filename)[1].lower()
        if extension not in {".pdf", ".docx", ".pptx", ".txt", ".md"}:
            print(f"Skipping {filename}: unsupported format {extension}")
            continue

        folder_id = folder_ids_list[index] if index < len(folder_ids_list) else None
        file_id = f"file-{uuid.uuid4().hex[:8]}"
        file_path = os.path.join(STORAGE_DIR, f"{file_id}{extension}")

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_size = os.path.getsize(file_path)

            parsing_result = parser_service.parse(file_path, extension)
            content = (parsing_result.get("raw_text") or "").strip()
            structured_text = (parsing_result.get("structured_text") or "").strip()
            if not content and not structured_text:
                os.remove(file_path)
                print(f"Skipping {filename}: no text extracted")
                continue

            thumb_path = None
            if extension == ".pdf":
                thumb_path = preview_service.generate_pdf_thumbnail(file_path, file_id)
            elif extension in {".docx", ".pptx"}:
                thumb_path = preview_service.generate_office_thumbnail(file_path, file_id)

            snippet = preview_service.get_text_snippet(content)

            f = DriveFile(
                id=file_id,
                name=filename,
                extension=extension,
                content=content,
                structured_text=structured_text,
                page_count=parsing_result.get("page_count"),
                slide_count=parsing_result.get("slide_count"),
                content_unit=parsing_result.get("content_unit"),
                detected_chapters=json.dumps(parsing_result.get("detected_chapters") or [], ensure_ascii=False),
                summary=snippet,
                size=file_size,
                tags=json.dumps(tags_list, ensure_ascii=False),
                thumbnail_path=thumb_path,
                workspace_id=workspace_id,
                folder_id=folder_id,
                owner_id=current_user.id,
                scope="workspace" if workspace_id else "personal",
            )
            db.add(f)
            await db.flush()
            await db.refresh(f)
            results.append(_file_out(f))
        except Exception as error:
            print(f"Error importing {filename}: {error}")
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except OSError:
                pass

    await db.commit()
    return results


@router.put("/files/{file_id}", response_model=FileOut)
async def update_file(
    file_id: str,
    data: FileUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DriveFile).where(DriveFile.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Document introuvable")

    if data.name:
        f.name = data.name
    if data.folder_id is not None:
        f.folder_id = data.folder_id or None
    if data.summary:
        f.summary = data.summary
    if data.content:
        f.content = data.content
    if data.is_starred is not None:
        f.is_starred = data.is_starred
    if data.is_deleted is not None:
        f.is_deleted = data.is_deleted
    if data.scope:
        f.scope = data.scope

    await db.commit()
    await db.refresh(f)
    return _file_out(f)


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    permanent: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DriveFile).where(DriveFile.id == file_id))
    f = result.scalar_one_or_none()
    if f:
        if permanent:
            await db.delete(f)
        else:
            f.is_deleted = True
        await db.commit()
    return None
