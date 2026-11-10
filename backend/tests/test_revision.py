import json

import app.ai.revision as revision

COURSE = """# Traitement du signal — Chapitre 3
## 3.1 Théorème de Shannon
Pour reconstruire un signal de bande B, la fréquence d'échantillonnage doit vérifier fe >= 2B.
Sinon les répliques du spectre se chevauchent : c'est le repliement spectral.
## 3.2 Théorème de Parseval
L'énergie d'un signal se conserve entre le domaine temporel et le domaine fréquentiel.
"""
SUBJECT = """Examen de Traitement du signal 2024
Question 1 : énoncer le théorème de Shannon et expliquer le repliement spectral.
Question 2 : énoncer le théorème de Parseval.
"""


def _space_with_docs(client, user):
    space = client.post("/api/v1/workspaces", headers=user["headers"], json={"name": "ITT2"}).json()["id"]
    ids = {}
    for name, text in [("Cours_TS_Chap3.md", COURSE), ("TS_Examen_CL_2024.md", SUBJECT)]:
        response = client.post(
            "/api/v1/drive/files", headers=user["headers"], data={"workspace_id": space},
            files={"file": (name, text.encode(), "text/markdown")},
        )
        assert response.status_code == 200, response.text
        ids[name] = response.json()["id"]
    return space, ids


def _no_llm(monkeypatch):
    async def fake(*args, **kwargs):
        return None, None
    monkeypatch.setattr(revision, "generate_text", fake)


def test_quiz_falls_back_to_flashcards_without_llm(client, make_user, monkeypatch):
    _no_llm(monkeypatch)
    alice = make_user("alice")
    _, ids = _space_with_docs(client, alice)
    response = client.post("/api/v1/revision/quiz", headers=alice["headers"],
                           json={"file_ids": [ids["Cours_TS_Chap3.md"]], "count": 3})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["degraded"] is True
    assert any("Shannon" in q["question"] for q in body["questions"])


def test_quiz_parses_llm_json(client, make_user, monkeypatch):
    payload = [
        {"question": "Condition de Shannon ?", "choices": ["fe >= 2B", "fe = B", "fe < B", "fe = B/2"],
         "answer_index": 0, "answer": "fe >= 2B", "explanation": "Cours chap. 3", "source_title": "Cours_TS_Chap3.md"},
        {"question": "Mauvais item sans réponse", "choices": []},
        {"question": "Que conserve Parseval ?", "choices": ["L'énergie", "La phase", "Le retard", "Rien"],
         "answer_index": 0, "answer": "L'énergie", "explanation": "", "source_title": "Cours_TS_Chap3.md"},
    ]

    async def fake(*args, **kwargs):
        return "Voici le quiz :\n```json\n" + json.dumps(payload, ensure_ascii=False) + "\n```", "Groq"
    monkeypatch.setattr(revision, "generate_text", fake)

    alice = make_user("alice")
    _, ids = _space_with_docs(client, alice)
    response = client.post("/api/v1/revision/quiz", headers=alice["headers"],
                           json={"file_ids": [ids["Cours_TS_Chap3.md"]], "count": 5})
    body = response.json()
    assert response.status_code == 200
    assert body["degraded"] is False and body["provider"] == "Groq"
    assert [q["question"] for q in body["questions"]] == ["Condition de Shannon ?", "Que conserve Parseval ?"]


def test_quiz_refuses_foreign_documents(client, make_user, monkeypatch):
    _no_llm(monkeypatch)
    alice, mallory = make_user("alice"), make_user("mallory")
    _, ids = _space_with_docs(client, alice)
    response = client.post("/api/v1/revision/quiz", headers=mallory["headers"],
                           json={"file_ids": [ids["Cours_TS_Chap3.md"]]})
    assert response.status_code == 404
    response = client.post("/api/v1/revision/correction", headers=mallory["headers"],
                           json={"file_id": ids["TS_Examen_CL_2024.md"]})
    assert response.status_code == 404


def test_correction_uses_course_and_not_other_subjects(client, make_user, monkeypatch):
    _no_llm(monkeypatch)
    alice = make_user("alice")
    _, ids = _space_with_docs(client, alice)
    response = client.post("/api/v1/revision/correction", headers=alice["headers"],
                           json={"file_id": ids["TS_Examen_CL_2024.md"]})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["degraded"] is True
    assert [s["title"] for s in body["sources"]] == ["Cours_TS_Chap3.md"]
    assert "Shannon" in body["answer"]


def test_exam_name_detection():
    assert revision.is_exam_name("TS_Examen_ALT_2024.pdf")
    assert revision.is_exam_name("TS_RAT_CL_2022.pdf")
    assert revision.is_exam_name("Sujet CC Antennes 2023.pdf")
    assert not revision.is_exam_name("Cours_TS_Chap3_Transformee.pdf")
    assert not revision.is_exam_name("Ratio signal bruit.pdf")
