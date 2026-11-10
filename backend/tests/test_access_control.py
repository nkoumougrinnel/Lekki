"""Reproduit les failles trouvées en novembre 2026 et vérifie qu'elles sont fermées."""

SECRET = b"Note confidentielle : sujet d'examen non publie"


def _create_space(client, owner, name="Promo ITT2"):
    response = client.post("/api/v1/workspaces", headers=owner["headers"], json={"name": name})
    assert response.status_code == 200, response.text
    return response.json()["id"]


def _upload(client, user, workspace_id=None, name="secret.txt", content=SECRET):
    data = {"workspace_id": workspace_id} if workspace_id else {}
    response = client.post(
        "/api/v1/drive/files",
        headers=user["headers"],
        data=data,
        files={"file": (name, content, "text/plain")},
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


# ── Sans authentification ────────────────────────────────────────────────────

def test_anonymous_cannot_read_or_delete_files(client, make_user):
    alice = make_user("alice")
    file_id = _upload(client, alice)

    assert client.get(f"/api/v1/drive/files/{file_id}").status_code == 401
    assert client.get(f"/api/v1/drive/files/{file_id}/download").status_code == 401
    assert client.get(f"/api/v1/drive/files/{file_id}/preview").status_code == 401
    assert client.get(f"/api/v1/drive/files/{file_id}/thumbnail").status_code == 401
    assert client.put(f"/api/v1/drive/files/{file_id}", json={"name": "pwned"}).status_code == 401
    assert client.delete(f"/api/v1/drive/files/{file_id}?permanent=true").status_code == 401
    # Le fichier existe toujours pour sa propriétaire
    assert client.get(f"/api/v1/drive/files/{file_id}", headers=alice["headers"]).status_code == 200


def test_anonymous_cannot_search_or_read_wiki(client):
    assert client.get("/api/v1/search?q=examen").status_code == 401
    assert client.get("/api/v1/wiki/pages").status_code == 401
    assert client.put("/api/v1/drive/folders/x", json={"name": "y"}).status_code == 401
    assert client.delete("/api/v1/drive/folders/x").status_code == 401


def test_token_in_query_works_for_img_and_download(client, make_user):
    alice = make_user("alice")
    file_id = _upload(client, alice)
    response = client.get(f"/api/v1/drive/files/{file_id}/download?token={alice['token']}")
    assert response.status_code == 200
    assert response.content == SECRET
    # …mais uniquement sur les routes de fichiers
    assert client.get(f"/api/v1/drive/files/{file_id}?token={alice['token']}").status_code == 401


# ── Entre utilisateurs connectés ─────────────────────────────────────────────

def test_other_user_cannot_access_personal_file(client, make_user):
    alice, mallory = make_user("alice"), make_user("mallory")
    file_id = _upload(client, alice)
    h = mallory["headers"]

    assert client.get(f"/api/v1/drive/files/{file_id}", headers=h).status_code == 404
    assert client.get(f"/api/v1/drive/files/{file_id}/download", headers=h).status_code == 404
    assert client.delete(f"/api/v1/drive/files/{file_id}?permanent=true", headers=h).status_code == 404
    listed = client.get("/api/v1/drive/files?scope=trash", headers=h).json()
    listed += client.get("/api/v1/drive/files?scope=starred", headers=h).json()
    listed += client.get("/api/v1/drive/files", headers=h).json()
    assert file_id not in {f["id"] for f in listed}


def test_non_member_cannot_read_space(client, make_user):
    alice, mallory = make_user("alice"), make_user("mallory")
    space = _create_space(client, alice)
    file_id = _upload(client, alice, workspace_id=space)
    h = mallory["headers"]

    assert client.get(f"/api/v1/drive/files?workspace_id={space}", headers=h).status_code == 403
    assert client.get(f"/api/v1/wiki/pages?workspace_id={space}", headers=h).status_code == 403
    assert client.get(f"/api/v1/search?q=confidentielle&workspace_id={space}", headers=h).status_code == 403
    assert client.get("/api/v1/search?q=confidentielle", headers=h).json()["total"] == 0
    assert client.get(f"/api/v1/drive/files/{file_id}", headers=h).status_code == 404
    # On ne peut pas non plus déposer de fichier dans l'espace d'autrui
    response = client.post(
        "/api/v1/drive/files", headers=h, data={"workspace_id": space},
        files={"file": ("x.txt", b"spam", "text/plain")},
    )
    assert response.status_code == 403


def test_wiki_page_of_space_is_private(client, make_user):
    alice, mallory = make_user("alice"), make_user("mallory")
    space = _create_space(client, alice)
    page = client.post(
        "/api/v1/wiki/pages", headers=alice["headers"],
        json={"title": "Corrigé RAT 2024", "content": "Réponse secrète", "workspace_id": space},
    )
    assert page.status_code == 200, page.text
    page_id = page.json()["id"]
    assert client.get(f"/api/v1/wiki/pages/{page_id}", headers=mallory["headers"]).status_code == 404
    assert page_id not in {p["id"] for p in client.get("/api/v1/wiki/pages", headers=mallory["headers"]).json()}
    assert client.get(f"/api/v1/wiki/pages/{page_id}", headers=alice["headers"]).status_code == 200


def test_member_has_access_and_only_managers_destroy(client, make_user):
    alice, bob = make_user("alice"), make_user("bob")
    space = _create_space(client, alice)
    code = client.get(f"/api/v1/workspaces/{space}/join-code", headers=alice["headers"]).json()["code"]
    assert client.post("/api/v1/workspaces/join", headers=bob["headers"], json={"code": code}).status_code == 200

    file_id = _upload(client, alice, workspace_id=space)
    h = bob["headers"]
    assert client.get(f"/api/v1/drive/files/{file_id}", headers=h).status_code == 200
    assert client.get(f"/api/v1/drive/files/{file_id}/download", headers=h).content == SECRET
    assert client.get(f"/api/v1/search?q=confidentielle&workspace_id={space}", headers=h).json()["total"] >= 1
    # Un simple membre peut mettre à la corbeille mais pas détruire le travail d'un autre
    assert client.delete(f"/api/v1/drive/files/{file_id}?permanent=true", headers=h).status_code == 403
    assert client.delete(f"/api/v1/drive/files/{file_id}", headers=h).status_code == 200


def test_ai_cannot_be_pointed_at_foreign_space(client, make_user):
    alice, mallory = make_user("alice"), make_user("mallory")
    space = _create_space(client, alice)
    _upload(client, alice, workspace_id=space, name="ofdm.txt", content=b"Le mot de passe du serveur est zebra42")

    response = client.post(
        "/api/v1/ask", headers=mallory["headers"],
        json={"question": "Quel est le mot de passe du serveur ?", "workspace_id": space},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "zebra42" not in body["answer"]
    assert body["sources"] == []
