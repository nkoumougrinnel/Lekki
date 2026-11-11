"""Import depuis Google Drive.

Deux sources :
- « supdocs » : les annales partagées de l'école, lues avec la clé du serveur. Réservé aux
  espaces de promo ; l'arborescence (semestre / matière / COURS, SUJETS…) est recopiée telle quelle.
- « google » : des fichiers choisis par l'étudiant dans son propre Drive avec le Google Picker
  (accès limité aux fichiers choisis). Le jeton ne sert qu'à cet import et n'est jamais stocké.

L'import tourne en tâche de fond : on renvoie un identifiant, le client suit l'avancement.
"""
from __future__ import annotations

import asyncio
import re
import time
import uuid
from dataclasses import dataclass, field
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.access import can_access_folder, require_workspace_member
from app.core.database import AsyncSessionLocal
from app.database import get_db
from app.integrations.google_drive import DriveError, DriveItem, GoogleDrive
from app.knowledge.drive.ingest import IngestError, build_document
from app.knowledge.drive.models import DriveFile, DriveFolder
from app.middleware.auth import get_current_user
from app.models.user import User
from app.workspaces.models import Workspace

router = APIRouter(prefix="/integrations/google-drive", tags=["Google Drive"])

DRIVE_ID = re.compile(r"^[A-Za-z0-9_-]{10,120}$")
MAX_FILES = 400
MAX_DEPTH = 8
JOB_TTL_SECONDS = 2 * 3600
# Les tests exécutent l'import directement, sans tâche de fond.
RUN_INLINE = False


def supdocs_drive() -> GoogleDrive:
    return GoogleDrive(api_key=settings.GOOGLE_API_KEY)


def user_drive(access_token: str) -> GoogleDrive:
    return GoogleDrive(access_token=access_token)


def _drive_id(value: str) -> str:
    if not DRIVE_ID.match(value or ""):
        raise HTTPException(status_code=400, detail="Identifiant Google Drive invalide.")
    return value


def _http(error: DriveError) -> HTTPException:
    return HTTPException(status_code=error.status, detail=str(error))


# ── Configuration publique ───────────────────────────────────────────────────
@router.get("/config")
async def drive_config(current_user: User = Depends(get_current_user)):
    picker = bool(settings.GOOGLE_PICKER_API_KEY and settings.GOOGLE_CLIENT_ID)
    return {
        "supdocs": bool(settings.GOOGLE_API_KEY),
        "picker": picker,
        "client_id": settings.GOOGLE_CLIENT_ID if picker else None,
        "api_key": settings.GOOGLE_PICKER_API_KEY if picker else None,
        "app_id": settings.GOOGLE_APP_ID or None,
    }


# ── Parcourir SUP'DOCS ───────────────────────────────────────────────────────
async def _supdocs_path(drive: GoogleDrive, folder_id: str) -> list[dict]:
    """Chemin depuis la racine SUP'DOCS ; refuse tout dossier qui n'en fait pas partie."""
    root = settings.SUPDOCS_FOLDER_ID
    path: list[dict] = []
    current = folder_id
    for _ in range(MAX_DEPTH + 2):
        item = await drive.get(current)
        path.append({"id": item.id, "name": "SUP'DOCS" if item.id == root else item.name})
        if item.id == root:
            return list(reversed(path))
        if not item.parents:
            break
        current = item.parents[0]
    raise HTTPException(status_code=403, detail="Ce dossier ne fait pas partie de SUP'DOCS.")


@router.get("/supdocs")
async def browse_supdocs(
    folder_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    drive = supdocs_drive_or_503()
    target = _drive_id(folder_id) if folder_id else settings.SUPDOCS_FOLDER_ID
    try:
        path = await _supdocs_path(drive, target)
        items = await drive.children(target)
    except DriveError as error:
        raise _http(error)
    # Les dossiers « _À VÉRIFIER » et autres brouillons préfixés « _ » ne sont pas proposés.
    visible = [item for item in items if not item.name.startswith("_")]
    return {"path": path, "items": [item.to_dict() for item in visible]}


def supdocs_drive_or_503() -> GoogleDrive:
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="L'import SUP'DOCS n'est pas encore activé sur ce serveur.")
    return supdocs_drive()


# ── Suivi des imports ────────────────────────────────────────────────────────
@dataclass
class ImportJob:
    id: str
    user_id: str
    state: str = "preparing"  # preparing → importing → done | failed
    total: int = 0
    processed: int = 0
    imported: int = 0
    folders_created: int = 0
    current: Optional[str] = None
    skipped: list[dict] = field(default_factory=list)
    error: Optional[str] = None
    created: float = field(default_factory=time.time)

    def out(self) -> dict:
        return {
            "id": self.id,
            "state": self.state,
            "total": self.total,
            "processed": self.processed,
            "imported": self.imported,
            "folders_created": self.folders_created,
            "current": self.current,
            "skipped": self.skipped[-50:],
            "skipped_count": len(self.skipped),
            "error": self.error,
        }


_jobs: dict[str, ImportJob] = {}
_running: set[asyncio.Task] = set()  # garde une référence : sinon la tâche peut être ramassée


def _forget_old_jobs() -> None:
    limit = time.time() - JOB_TTL_SECONDS
    for job_id in [key for key, job in _jobs.items() if job.created < limit]:
        _jobs.pop(job_id, None)


@router.get("/jobs/{job_id}")
async def import_status(job_id: str, current_user: User = Depends(get_current_user)):
    job = _jobs.get(job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Import introuvable.")
    return job.out()


# ── Lancer un import ─────────────────────────────────────────────────────────
class ImportRequest(BaseModel):
    source: Literal["supdocs", "google"]
    item_ids: list[str] = Field(..., min_length=1, max_length=200)
    workspace_id: Optional[str] = None
    folder_id: Optional[str] = None  # dossier Lekki de destination
    access_token: Optional[str] = Field(None, max_length=4096)


@dataclass
class _Planned:
    item: DriveItem
    path: tuple[str, ...]  # dossiers à recréer sous la destination


SEMESTER = re.compile(r"^S\d{1,2}$", re.IGNORECASE)


async def _plan(drive: GoogleDrive, roots: list[DriveItem], prefixes: Optional[list[tuple[str, ...]]] = None) -> list[_Planned]:
    """Liste les fichiers à importer. `prefixes` : dossiers à recréer au-dessus de chaque racine
    (pour SUP'DOCS, le semestre : importer « IT311 · … » le range sous « S3 »)."""
    planned: list[_Planned] = []

    async def walk(item: DriveItem, path: tuple[str, ...], depth: int) -> None:
        if len(planned) >= MAX_FILES:
            return
        if item.is_folder:
            if depth >= MAX_DEPTH or item.name.startswith("_"):
                return
            for child in await drive.children(item.id):
                await walk(child, (*path, item.name), depth + 1)
        else:
            planned.append(_Planned(item, path))

    for index, root in enumerate(roots):
        await walk(root, prefixes[index] if prefixes else (), 0)
    return planned


async def _run_import(job: ImportJob, drive: GoogleDrive, request: ImportRequest, user_id: str) -> None:
    try:
        roots = [await drive.get(item_id) for item_id in request.item_ids]
        prefixes = None
        if request.source == "supdocs":
            prefixes = []
            for root in roots:
                ancestors = [step["name"] for step in (await _supdocs_path(drive, root.id))[:-1]]
                prefixes.append(tuple(name for name in ancestors if SEMESTER.match(name.strip())))
        planned = await _plan(drive, roots, prefixes)
        job.total = len(planned)
        job.state = "importing"

        async with AsyncSessionLocal() as db:
            folders = (
                await db.execute(select(DriveFolder).where(DriveFolder.workspace_id == request.workspace_id))
            ).scalars().all() if request.workspace_id else (
                await db.execute(
                    select(DriveFolder).where(DriveFolder.workspace_id.is_(None), DriveFolder.owner_id == user_id)
                )
            ).scalars().all()
            by_place = {(folder.parent_id or None, folder.name.strip().lower()): folder for folder in folders}

            async def folder_for(path: tuple[str, ...]) -> Optional[str]:
                parent = request.folder_id
                for name in path:
                    clean = " ".join(name.split())[:150]
                    key = (parent, clean.lower())
                    folder = by_place.get(key)
                    if not folder:
                        folder = DriveFolder(
                            id=f"folder-{uuid.uuid4().hex[:8]}",
                            name=clean,
                            workspace_id=request.workspace_id,
                            parent_id=parent,
                            owner_id=user_id,
                        )
                        db.add(folder)
                        await db.flush()
                        by_place[key] = folder
                        job.folders_created += 1
                    parent = folder.id
                return parent

            for entry in planned:
                item = entry.item
                job.current = item.name
                try:
                    if not item.importable:
                        raise IngestError("Format non pris en charge.")
                    target_folder = await folder_for(entry.path)
                    name = item.target_name
                    place = (
                        DriveFile.workspace_id == request.workspace_id
                        if request.workspace_id
                        else (DriveFile.workspace_id.is_(None)) & (DriveFile.owner_id == user_id)
                    )
                    duplicate = await db.execute(
                        select(DriveFile.id).where(
                            place,
                            DriveFile.folder_id.is_(None) if target_folder is None else DriveFile.folder_id == target_folder,
                            DriveFile.name == name,
                            DriveFile.is_deleted.is_(False),
                        )
                    )
                    if duplicate.first():
                        raise IngestError("Déjà présent dans Lekki.")
                    data = await drive.download(item)
                    document = await asyncio.to_thread(
                        build_document,
                        data,
                        name,
                        workspace_id=request.workspace_id,
                        folder_id=target_folder,
                        owner_id=user_id,
                        tags='["google-drive"]' if request.source == "google" else '["supdocs"]',
                    )
                    db.add(document)
                    await db.commit()
                    job.imported += 1
                except (IngestError, DriveError) as error:
                    job.skipped.append({"name": item.name, "reason": str(error)})
                    await db.commit()  # garde les dossiers déjà créés
                except Exception as error:  # un fichier défectueux n'arrête pas tout l'import
                    await db.rollback()
                    job.skipped.append({"name": item.name, "reason": "Lecture impossible."})
                    print(f"[google-drive] {item.name}: {error}")
                finally:
                    job.processed += 1
            await db.commit()
        job.state = "done"
    except DriveError as error:
        job.state = "failed"
        job.error = str(error)
    except Exception as error:
        job.state = "failed"
        job.error = "L'import s'est interrompu."
        print(f"[google-drive] import interrompu : {error}")
    finally:
        job.current = None


@router.post("/import")
async def start_import(
    request: ImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for item_id in request.item_ids:
        _drive_id(item_id)

    # Destination : membre de l'espace, dossier de ce même espace.
    await require_workspace_member(db, current_user, request.workspace_id)
    if request.folder_id:
        folder = await db.get(DriveFolder, request.folder_id)
        if not folder or not await can_access_folder(db, current_user, folder):
            raise HTTPException(status_code=404, detail="Dossier de destination introuvable.")
        if (folder.workspace_id or None) != (request.workspace_id or None):
            raise HTTPException(status_code=400, detail="Ce dossier n'appartient pas à cet espace.")

    if request.source == "supdocs":
        workspace = await db.get(Workspace, request.workspace_id) if request.workspace_id else None
        if not workspace or not workspace.academic:
            raise HTTPException(status_code=400, detail="SUP'DOCS s'importe dans un espace de promo.")
        drive = supdocs_drive_or_503()
        try:
            for item_id in request.item_ids:
                await _supdocs_path(drive, item_id)
        except DriveError as error:
            raise _http(error)
    else:
        if not request.access_token:
            raise HTTPException(status_code=400, detail="Connexion Google requise.")
        drive = user_drive(request.access_token)

    _forget_old_jobs()
    job = ImportJob(id=uuid.uuid4().hex, user_id=current_user.id)
    _jobs[job.id] = job
    runner = _run_import(job, drive, request, current_user.id)
    if RUN_INLINE:
        await runner
    else:
        task = asyncio.create_task(runner)
        _running.add(task)
        task.add_done_callback(_running.discard)
    return job.out()
