import app.ai.revision as revision


def _join(client, owner, member, space):
    code = client.get(f"/api/v1/workspaces/{space}/join-code", headers=owner["headers"]).json()["code"]
    assert client.post("/api/v1/workspaces/join", headers=member["headers"], json={"code": code}).status_code == 200


def test_space_keeps_its_study_programme(client, make_user):
    alice, bob = make_user("alice"), make_user("bob")
    created = client.post(
        "/api/v1/workspaces", headers=alice["headers"],
        json={"name": "ITT2 IR", "icon": "GraduationCap", "academic": {"program": "supptic-itt", "level": 2, "specialty": "IR"}},
    )
    assert created.status_code == 200, created.text
    space = created.json()
    assert space["academic"] == {"program": "supptic-itt", "level": 2, "specialty": "IR"}

    # Valeurs inconnues refusées
    bad = client.post("/api/v1/workspaces", headers=alice["headers"],
                      json={"name": "x", "academic": {"program": "supptic-itt", "level": 4}})
    assert bad.status_code == 422

    # Seuls les responsables modifient l'espace
    _join(client, alice, bob, space["id"])
    assert client.patch(f"/api/v1/workspaces/{space['id']}", headers=bob["headers"], json={"name": "pirate"}).status_code == 403
    updated = client.patch(
        f"/api/v1/workspaces/{space['id']}", headers=alice["headers"],
        json={"academic": {"program": "supptic-itt", "level": 3, "specialty": "RT"}},
    ).json()
    assert updated["academic"]["level"] == 3 and updated["name"] == "ITT2 IR"
    listed = client.get("/api/v1/workspaces", headers=bob["headers"]).json()
    assert [w["academic"]["specialty"] for w in listed if w["id"] == space["id"]] == ["RT"]
    cleared = client.patch(f"/api/v1/workspaces/{space['id']}", headers=alice["headers"], json={"clear_academic": True}).json()
    assert cleared["academic"] is None


def test_user_directory_is_limited_to_classmates(client, make_user):
    alice, bob, stranger = make_user("alice"), make_user("bob"), make_user("stranger")
    space = client.post("/api/v1/workspaces", headers=alice["headers"], json={"name": "Club"}).json()["id"]
    _join(client, alice, bob, space)

    seen_by_bob = {u["id"] for u in client.get("/api/v1/users", headers=bob["headers"]).json()}
    assert {alice["id"], bob["id"]} <= seen_by_bob
    assert stranger["id"] not in seen_by_bob
    assert client.get(f"/api/v1/users/{alice['id']}", headers=stranger["headers"]).status_code == 404
    assert {u["id"] for u in client.get("/api/v1/users", headers=stranger["headers"]).json()} == {stranger["id"]}


def test_sharing_a_personal_document_with_a_classmate(client, make_user):
    alice, bob, stranger = make_user("alice"), make_user("bob"), make_user("stranger")
    space = client.post("/api/v1/workspaces", headers=alice["headers"], json={"name": "Groupe"}).json()["id"]
    _join(client, alice, bob, space)
    file_id = client.post(
        "/api/v1/drive/files", headers=alice["headers"],
        files={"file": ("fiche.txt", b"Ma fiche de revision OFDM", "text/plain")},
    ).json()["id"]

    assert client.get(f"/api/v1/drive/files/{file_id}", headers=bob["headers"]).status_code == 404
    # Seule l'autrice partage, et seulement avec ses camarades
    assert client.post(f"/api/v1/drive/files/{file_id}/share", headers=bob["headers"], json={"user_ids": [bob["id"]]}).status_code == 404
    assert client.post(f"/api/v1/drive/files/{file_id}/share", headers=alice["headers"], json={"user_ids": [stranger["id"]]}).status_code == 400

    shared = client.post(f"/api/v1/drive/files/{file_id}/share", headers=alice["headers"], json={"user_ids": [bob["id"]]})
    assert shared.status_code == 200 and shared.json()["shared_with"] == [bob["id"]]
    assert client.get(f"/api/v1/drive/files/{file_id}", headers=bob["headers"]).status_code == 200
    inbox = client.get("/api/v1/drive/files?scope=shared_with_me", headers=bob["headers"]).json()
    assert [f["id"] for f in inbox] == [file_id]
    # Bob peut lire mais pas modifier un document personnel partagé
    assert client.put(f"/api/v1/drive/files/{file_id}", headers=bob["headers"], json={"name": "x"}).status_code == 403

    client.post(f"/api/v1/drive/files/{file_id}/share", headers=alice["headers"], json={"user_ids": []})
    assert client.get(f"/api/v1/drive/files/{file_id}", headers=bob["headers"]).status_code == 404


def test_correction_can_be_limited_to_the_subject_courses(client, make_user, monkeypatch):
    async def no_llm(*args, **kwargs):
        return None, None
    monkeypatch.setattr(revision, "generate_text", no_llm)
    alice = make_user("alice")
    space = client.post("/api/v1/workspaces", headers=alice["headers"], json={"name": "ITT2"}).json()["id"]
    ids = {}
    for name, text in [
        ("TS_Examen_CL_2024.txt", "Question 1 : enoncer le theoreme de Shannon et le repliement."),
        ("Cours_TS_Chap3.txt", "Theoreme de Shannon : fe superieure a 2B sinon repliement du spectre."),
        ("Cours_Antennes.txt", "Shannon repliement theoreme antennes propagation Friis."),
        ("CorrectionCcTS_2023.txt", "Correction : le theoreme de Shannon impose fe >= 2B."),
    ]:
        ids[name] = client.post("/api/v1/drive/files", headers=alice["headers"], data={"workspace_id": space},
                                files={"file": (name, text.encode(), "text/plain")}).json()["id"]
    body = client.post("/api/v1/revision/correction", headers=alice["headers"], json={
        "file_id": ids["TS_Examen_CL_2024.txt"],
        "course_file_ids": [ids["Cours_TS_Chap3.txt"], ids["CorrectionCcTS_2023.txt"]],
    }).json()
    titles = [s["title"] for s in body["sources"]]
    assert "Cours_Antennes.txt" not in titles
    assert titles[0] == "CorrectionCcTS_2023.txt"  # le corrigé passe en premier


def test_correction_files_are_not_exam_subjects():
    assert not revision.is_exam_name("CorrectionCcGenieCivilTelecom_2025.pdf")
    assert not revision.is_exam_name("correction CC genie Civil des Telecoms 2022.pdf")
    assert revision.is_exam_name("Algèbre_I_RAT_2024+CC_2024+CC_2025.pdf")
