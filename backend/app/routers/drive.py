from typing import List, Optional
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.drive import DriveFolder, DriveFile
from app.schemas.drive import FolderOut, FolderCreate, FolderUpdate, FileOut, FileCreate, FileUpdate
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/drive", tags=["Drive"])


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
    folder = DriveFolder(
        id=f"folder-{uuid.uuid4().hex[:8]}",
        name=data.name,
        workspace_id=data.workspace_id,
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
    if folder:
        await db.delete(folder)
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
        out.append(FileOut(
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
            tags=tags,
            created_at=f.created_at,
            updated_at=f.updated_at
        ))
    return out


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
    data: FileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    f = DriveFile(
        id=f"file-{uuid.uuid4().hex[:8]}",
        name=data.name,
        extension=data.extension or "pdf",
        content=data.content or f"Contenu extrait de {data.name}",
        summary=data.summary or f"Document de cours/TD : {data.name}",
        size=1024 * 250,
        tags=json.dumps(data.tags or []),
        workspace_id=data.workspace_id,
        folder_id=data.folder_id,
        owner_id=current_user.id,
        scope="workspace" if data.workspace_id else "personal"
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
        tags=data.tags or [],
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
