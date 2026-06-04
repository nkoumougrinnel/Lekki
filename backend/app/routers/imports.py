"""
Lekki Wiki — Router Imports (import documentaire intelligent)

  POST /imports             upload de fichiers → extraction → pages → RAG (en tâche de fond)
  GET  /imports             liste des imports de l'utilisateur
  GET  /imports/{id}        progression d'un import
"""

from typing import List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.import_job import Import
from app.models.user import User
from app.schemas.import_job import ImportResponse
from app.schemas.page import PageCategory
from app.services import import_service, workspace_service
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/imports", tags=["imports"])

# Taille max par fichier (20 Mo) pour éviter de saturer la mémoire.
MAX_FILE_SIZE = 20 * 1024 * 1024


@router.post("", response_model=ImportResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_import(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="Fichiers PDF, DOCX, TXT ou Markdown"),
    workspace_id: str = Form(..., description="Workspace de destination"),
    category: Optional[PageCategory] = Form(None, description="Catégorie des pages créées"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "editor")),
):
    """
    Importe un ou plusieurs documents dans le workspace courant.

    L'extraction de texte, la création des pages et la vectorisation RAG
    s'exécutent en arrière-plan : la réponse renvoie immédiatement l'objet
    d'import à suivre via `GET /imports/{id}`.
    """
    # Le workspace doit exister et être accessible à l'utilisateur.
    await workspace_service.require_workspace_access(db, workspace_id, current_user)

    # Lecture des fichiers pendant la requête (les UploadFile sont liés à celle-ci).
    payload: list[tuple[str, bytes]] = []
    skipped: list[str] = []
    for f in files:
        filename = f.filename or "document"
        if not import_service.is_supported(filename):
            skipped.append(f"{filename}: type non supporté")
            continue
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            skipped.append(f"{filename}: fichier trop volumineux (> 20 Mo)")
            continue
        payload.append((filename, data))

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Aucun fichier exploitable. Formats acceptés : PDF, DOCX, TXT, Markdown. "
                + ("Détails : " + "; ".join(skipped) if skipped else "")
            ),
        )

    if len(payload) == 1:
        source_name = payload[0][0]
        source_type = import_service.detect_source_type(payload[0][0]) or "mixed"
    else:
        source_name = f"{len(payload)} fichiers"
        types = {import_service.detect_source_type(name) for name, _ in payload}
        source_type = next(iter(types)) if len(types) == 1 else "mixed"

    job = Import(
        user_id=current_user.id,
        workspace_id=workspace_id,
        source_type=source_type or "mixed",
        source_name=source_name,
        status="pending",
        total_files=len(payload),
        processed_files=0,
        error_log="\n".join(skipped) if skipped else None,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Lancement du pipeline en arrière-plan (FastAPI BackgroundTasks).
    background_tasks.add_task(
        import_service.process_import,
        job.id,
        payload,
        current_user.id,
        workspace_id,
        category.value if category else "guides",
    )

    return job


@router.get("", response_model=List[ImportResponse])
async def list_imports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Import)
        .where(Import.user_id == current_user.id)
        .order_by(Import.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{id}", response_model=ImportResponse)
async def get_import_progress(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = await db.get(Import, id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import introuvable")
    if job.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé à cet import",
        )
    return job
