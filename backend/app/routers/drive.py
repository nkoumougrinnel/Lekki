from typing import List, Optional
import json
import uuid
import os
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
from app.knowledge.drive.service import build_index_meta
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

    out = []
    for f in files:
        tags = []
        try:
            tags = json.loads(f.tags or "[]")
        except Exception:
            pass
        shared_with = []
        try:
            shared_with = json.loads(f.shared_with or "[]")
        except Exception:
            pass
        out.append(FileOut(
            id=f.id,
            name=f.name,
            extension=f.extension,
            size=f.size,
            content=f.content,
            structured_text=f.structured_text,
            summary=f.summary,
            thumbnail_path=f.thumbnail_path,
            workspace_id=f.workspace_id,
            folder_id=f.folder_id,
            scope=f.scope,
            shared_with=shared_with,
            is_starred=f.is_starred,
            is_deleted=f.is_deleted,
            tags=tags,
            created_at=f.created_at,
            updated_at=f.updated_at
        ))
    return out


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
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.txt"'},
        )

    return FileResponse(file_path, filename=drive_file.name)


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
    blocks = []
    for line in text.splitlines():
        safe_line = escape(line)
        if line.startswith("# "):
            blocks.append(f"<h1>{escape(line[2:])}</h1>")
        elif line.startswith("## "):
            blocks.append(f"<h2>{escape(line[3:])}</h2>")
        elif line.startswith("[Diapositive ") or line.startswith("[Page "):
            blocks.append(f"<h2>{safe_line}</h2>")
        elif line.strip():
            blocks.append(f"<p>{safe_line}</p>")

    html = """<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body{margin:0;padding:32px;background:#f4f4f5;color:#18181b;font:16px/1.65 system-ui,sans-serif}
      main{max-width:850px;margin:0 auto;padding:40px 52px;background:white;min-height:90vh;box-shadow:0 2px 16px #0001}
      h1{font-size:1.8rem;margin:1.4em 0 .6em}h2{font-size:1.25rem;margin:1.5em 0 .5em;color:#047857}
      p{white-space:pre-wrap;margin:.45em 0}@media(max-width:600px){body{padding:0}main{padding:24px 20px}}
    </style></head><body><main>""" + "".join(blocks) + "</main></body></html>"
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
    thumbnail_path = drive_file.thumbnail_path
    if not thumbnail_path or not os.path.isfile(thumbnail_path):
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
    tags = []
    try:
        tags = json.loads(f.tags or "[]")
    except Exception:
        pass
    return FileOut(
        id=f.id,
        name=f.name,
        extension=f.extension,
        size=f.size,
        content=f.content,
        structured_text=f.structured_text,
        summary=f.summary,
        workspace_id=f.workspace_id,
        folder_id=f.folder_id,
        scope=f.scope,
        is_starred=f.is_starred,
        is_deleted=f.is_deleted,
        tags=tags,
        created_at=f.created_at,
        updated_at=f.updated_at
    )


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

    return FileOut(
        id=f.id,
        name=f.name,
        extension=f.extension,
        size=f.size,
        content=f.content,
        summary=f.summary,
        workspace_id=f.workspace_id,
        folder_id=f.folder_id,
        scope=f.scope,
        is_starred=f.is_starred,
        is_deleted=f.is_deleted,
        tags=json.loads(f.tags or "[]"),
        thumbnail_path=f.thumbnail_path,
        index_meta=build_index_meta(f.content),
        created_at=f.created_at,
        updated_at=f.updated_at
    )


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
    tags = []
    try:
        tags = json.loads(f.tags or "[]")
    except Exception:
        pass
    return FileOut(
        id=f.id,
        name=f.name,
        extension=f.extension,
        size=f.size,
        content=f.content,
        structured_text=f.structured_text,
        summary=f.summary,
        workspace_id=f.workspace_id,
        folder_id=f.folder_id,
        scope=f.scope,
        is_starred=f.is_starred,
        is_deleted=f.is_deleted,
        tags=tags,
        thumbnail_path=f.thumbnail_path,
        created_at=f.created_at,
        updated_at=f.updated_at
    )


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
