"""Import depuis Google Drive : arborescence SUP'DOCS recopiée, doublons évités, droits vérifiés."""
import pytest

from app.config import settings
from app.integrations.google_drive import FOLDER, DriveError, DriveItem
from app.routers import integrations

ROOT = "supdocsRoot0001"


class FakeDrive:
    """Un petit SUP'DOCS en mémoire : ITT2 / S3 / IT311 · Traitement du signal / SUJETS."""

    def __init__(self):
        self.items = {
            ROOT: DriveItem(ROOT, "SUP'DOCS", FOLDER),
            "itt2Folder0001": DriveItem("itt2Folder0001", "ITT2", FOLDER, parents=(ROOT,)),
            "s3Folder000001": DriveItem("s3Folder000001", "S3", FOLDER, parents=("itt2Folder0001",)),
            "tsFolder000001": DriveItem("tsFolder000001", "IT311 · Traitement du signal", FOLDER, parents=("s3Folder000001",)),
            "sujetsFolder01": DriveItem("sujetsFolder01", "SUJETS", FOLDER, parents=("tsFolder000001",)),
            "examFile000001": DriveItem("examFile000001", "TS_Examen_CL_2024.md", "text/markdown", 80, ("sujetsFolder01",)),
            "slidesFile0001": DriveItem("slidesFile0001", "TS_cours_chap1.xlsx", "application/vnd.ms-excel", 10, ("tsFolder000001",)),
            "hiddenFolder01": DriveItem("hiddenFolder01", "_À VÉRIFIER", FOLDER, parents=(ROOT,)),
            "outsideFile001": DriveItem("outsideFile001", "Perso.md", "text/markdown", 10, ("someoneElse01",)),
            "someoneElse01": DriveItem("someoneElse01", "Mon Drive", FOLDER),
        }

    async def get(self, file_id):
        if file_id not in self.items:
            raise DriveError("Élément introuvable sur Google Drive.", 404)
        return self.items[file_id]

    async def children(self, folder_id):
        return [item for item in self.items.values() if folder_id in item.parents]

    async def download(self, item):
        return "# Examen de traitement du signal\n\nÉnoncer le théorème de Shannon.".encode()


@pytest.fixture(autouse=True)
def fake_drive(monkeypatch):
    drive = FakeDrive()
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "test-key")
    monkeypatch.setattr(settings, "SUPDOCS_FOLDER_ID", ROOT)
    monkeypatch.setattr(integrations, "supdocs_drive", lambda: drive)
    monkeypatch.setattr(integrations, "user_drive", lambda token: drive)
    monkeypatch.setattr(integrations, "RUN_INLINE", True)
    return drive


def _promo(client, owner, academic=True):
    payload = {"name": "ITT2 promo"}
    if academic:
        payload["academic"] = {"program": "supptic-itt", "level": 2, "specialty": "IR"}
    response = client.post("/api/v1/workspaces", headers=owner["headers"], json=payload)
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_browse_supdocs_hides_draft_folders_and_refuses_outside(client, make_user):
    user = make_user("gd")
    root = client.get("/api/v1/integrations/google-drive/supdocs", headers=user["headers"]).json()
    assert [item["name"] for item in root["items"]] == ["ITT2"]
    assert root["path"] == [{"id": ROOT, "name": "SUP'DOCS"}]

    inside = client.get(
        "/api/v1/integrations/google-drive/supdocs", params={"folder_id": "tsFolder000001"}, headers=user["headers"]
    ).json()
    assert [step["name"] for step in inside["path"]] == ["SUP'DOCS", "ITT2", "S3", "IT311 · Traitement du signal"]

    outside = client.get(
        "/api/v1/integrations/google-drive/supdocs", params={"folder_id": "someoneElse01"}, headers=user["headers"]
    )
    assert outside.status_code == 403


def test_supdocs_import_copies_the_tree_once(client, make_user):
    owner = make_user("gd")
    space = _promo(client, owner)
    body = {"source": "supdocs", "item_ids": ["s3Folder000001"], "workspace_id": space}

    job = client.post("/api/v1/integrations/google-drive/import", headers=owner["headers"], json=body).json()
    assert job["state"] == "done", job
    assert job["imported"] == 1
    assert job["folders_created"] == 3  # S3 / IT311 · … / SUJETS
    assert [entry["name"] for entry in job["skipped"]] == ["TS_cours_chap1.xlsx"]

    status = client.get(f"/api/v1/integrations/google-drive/jobs/{job['id']}", headers=owner["headers"])
    assert status.json()["imported"] == 1

    folders = client.get("/api/v1/drive/folders", params={"workspace_id": space}, headers=owner["headers"]).json()
    assert {folder["name"] for folder in folders} == {"S3", "IT311 · Traitement du signal", "SUJETS"}
    sujets = next(folder for folder in folders if folder["name"] == "SUJETS")
    files = client.get(
        "/api/v1/drive/files", params={"workspace_id": space, "folder_id": sujets["id"]}, headers=owner["headers"]
    ).json()
    assert [f["name"] for f in files] == ["TS_Examen_CL_2024.md"]

    # Relancer ne crée ni dossier ni fichier en double.
    again = client.post("/api/v1/integrations/google-drive/import", headers=owner["headers"], json=body).json()
    assert again["imported"] == 0 and again["folders_created"] == 0
    assert any(entry["reason"] == "Déjà présent dans Lekki." for entry in again["skipped"])


def test_supdocs_only_for_promo_members_and_inside_supdocs(client, make_user):
    owner, stranger = make_user("gd"), make_user("gd")
    club = _promo(client, owner, academic=False)
    promo = _promo(client, owner)

    not_promo = client.post(
        "/api/v1/integrations/google-drive/import",
        headers=owner["headers"],
        json={"source": "supdocs", "item_ids": ["s3Folder000001"], "workspace_id": club},
    )
    assert not_promo.status_code == 400

    not_member = client.post(
        "/api/v1/integrations/google-drive/import",
        headers=stranger["headers"],
        json={"source": "supdocs", "item_ids": ["s3Folder000001"], "workspace_id": promo},
    )
    assert not_member.status_code == 403

    outside = client.post(
        "/api/v1/integrations/google-drive/import",
        headers=owner["headers"],
        json={"source": "supdocs", "item_ids": ["outsideFile001"], "workspace_id": promo},
    )
    assert outside.status_code == 403

    bad_id = client.post(
        "/api/v1/integrations/google-drive/import",
        headers=owner["headers"],
        json={"source": "supdocs", "item_ids": ["x' or name contains '"], "workspace_id": promo},
    )
    assert bad_id.status_code == 400


def test_personal_google_import_needs_a_token_and_lands_in_my_documents(client, make_user):
    user = make_user("gd")
    missing = client.post(
        "/api/v1/integrations/google-drive/import",
        headers=user["headers"],
        json={"source": "google", "item_ids": ["examFile000001"]},
    )
    assert missing.status_code == 400

    job = client.post(
        "/api/v1/integrations/google-drive/import",
        headers=user["headers"],
        json={"source": "google", "item_ids": ["examFile000001"], "access_token": "ya29.test"},
    ).json()
    assert job["imported"] == 1
    mine = client.get("/api/v1/drive/files", params={"scope": "personal"}, headers=user["headers"]).json()
    assert "TS_Examen_CL_2024.md" in [f["name"] for f in mine]

    other = make_user("gd")
    assert client.get(f"/api/v1/integrations/google-drive/jobs/{job['id']}", headers=other["headers"]).status_code == 404


def test_importing_a_subject_keeps_its_semester(client, make_user):
    owner = make_user("gd")
    space = _promo(client, owner)
    job = client.post(
        "/api/v1/integrations/google-drive/import",
        headers=owner["headers"],
        json={"source": "supdocs", "item_ids": ["tsFolder000001"], "workspace_id": space},
    ).json()
    assert job["imported"] == 1
    folders = client.get("/api/v1/drive/folders", params={"workspace_id": space}, headers=owner["headers"]).json()
    by_id = {folder["id"]: folder for folder in folders}
    subject = next(folder for folder in folders if folder["name"].startswith("IT311"))
    assert by_id[subject["parent_id"]]["name"] == "S3"
