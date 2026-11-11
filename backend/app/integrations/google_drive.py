"""Lecture d'un Google Drive : SUP'DOCS (dossier public, clé d'API du serveur)
ou le Drive de l'étudiant (jeton OAuth obtenu dans le navigateur, jamais stocké).

Seules les métadonnées et le contenu des fichiers demandés sont lus ; rien n'est écrit sur Drive.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import httpx

API = "https://www.googleapis.com/drive/v3"
FOLDER = "application/vnd.google-apps.folder"
MAX_FILE_BYTES = 40 * 1024 * 1024

# Documents Google : convertis à la volée dans un format que Lekki sait lire.
EXPORTS = {
    "application/vnd.google-apps.document": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".docx",
    ),
    "application/vnd.google-apps.presentation": (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".pptx",
    ),
}
READABLE_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md", ".jpg", ".jpeg", ".png", ".webp", ".heic"}


class DriveError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


@dataclass
class DriveItem:
    id: str
    name: str
    mime_type: str
    size: Optional[int] = None
    parents: tuple[str, ...] = ()

    @property
    def is_folder(self) -> bool:
        return self.mime_type == FOLDER

    @property
    def target_name(self) -> str:
        """Nom du fichier tel qu'il arrivera dans Lekki (extension ajoutée pour les documents Google)."""
        if self.mime_type in EXPORTS:
            extension = EXPORTS[self.mime_type][1]
            return self.name if self.name.lower().endswith(extension) else f"{self.name}{extension}"
        return self.name

    @property
    def importable(self) -> bool:
        if self.is_folder:
            return False
        if self.mime_type in EXPORTS:
            return True
        return os.path.splitext(self.name)[1].lower() in READABLE_EXTENSIONS

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "kind": "folder" if self.is_folder else "file",
            "mime_type": self.mime_type,
            "size": self.size,
            "importable": self.is_folder or self.importable,
        }


def _item(raw: dict) -> DriveItem:
    size = raw.get("size")
    return DriveItem(
        id=raw["id"],
        name=raw.get("name") or "Sans titre",
        mime_type=raw.get("mimeType") or "",
        size=int(size) if size else None,
        parents=tuple(raw.get("parents") or ()),
    )


class GoogleDrive:
    """Client minimal de l'API Drive v3 (lecture seule)."""

    FIELDS = "id,name,mimeType,size,parents"

    def __init__(self, *, api_key: Optional[str] = None, access_token: Optional[str] = None):
        if not api_key and not access_token:
            raise DriveError("Google Drive n'est pas configuré.", 503)
        self._params = {"supportsAllDrives": "true"}
        self._headers = {}
        if access_token:
            self._headers["Authorization"] = f"Bearer {access_token}"
        else:
            self._params["key"] = api_key

    async def _get(self, client: httpx.AsyncClient, path: str, params: dict) -> httpx.Response:
        try:
            response = await client.get(f"{API}{path}", params={**self._params, **params}, headers=self._headers)
        except httpx.HTTPError as error:
            raise DriveError("Google Drive ne répond pas, réessaie dans un instant.") from error
        if response.status_code in (401, 403):
            raise DriveError("Accès refusé par Google Drive (session expirée ou dossier non partagé).", 403)
        if response.status_code == 404:
            raise DriveError("Élément introuvable sur Google Drive.", 404)
        if response.status_code >= 400:
            raise DriveError(f"Erreur Google Drive ({response.status_code}).")
        return response

    async def get(self, file_id: str) -> DriveItem:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await self._get(client, f"/files/{file_id}", {"fields": self.FIELDS})
        return _item(response.json())

    async def children(self, folder_id: str) -> list[DriveItem]:
        items: list[DriveItem] = []
        page_token = None
        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                params = {
                    "q": f"'{folder_id}' in parents and trashed = false",
                    "fields": f"nextPageToken,files({self.FIELDS})",
                    "pageSize": "200",
                    "orderBy": "folder,name",
                    "includeItemsFromAllDrives": "true",
                }
                if page_token:
                    params["pageToken"] = page_token
                data = (await self._get(client, "/files", params)).json()
                items.extend(_item(raw) for raw in data.get("files", []))
                page_token = data.get("nextPageToken")
                if not page_token or len(items) >= 2000:
                    return items

    async def download(self, item: DriveItem) -> bytes:
        if item.size and item.size > MAX_FILE_BYTES:
            raise DriveError("Fichier trop lourd (plus de 40 Mo).", 413)
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            if item.mime_type in EXPORTS:
                response = await self._get(client, f"/files/{item.id}/export", {"mimeType": EXPORTS[item.mime_type][0]})
            else:
                response = await self._get(client, f"/files/{item.id}", {"alt": "media"})
        if len(response.content) > MAX_FILE_BYTES:
            raise DriveError("Fichier trop lourd (plus de 40 Mo).", 413)
        return response.content
