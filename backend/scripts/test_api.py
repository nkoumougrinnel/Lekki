"""
Test d'intégration manuel — auth, CRUD pages, embedding Gemini, FTS5.

Prérequis (depuis backend/) :
  pip install -r requirements.txt
  cp .env.example .env   # GEMINI_API_KEY requis pour l'embedding
  python -m scripts.seed
  uvicorn app.main:app --reload --port 8000
  python scripts/test_api.py
"""
import os
import sys

import requests

BASE_URL = os.getenv("LEKKI_API_URL", "http://localhost:8000/api/v1")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "lekki-internal-secret-key")
SEED_PASSWORD = os.getenv("SEED_PASSWORD", "lekki123")


def _fail(msg: str) -> None:
    print(f"ÉCHEC : {msg}")
    sys.exit(1)


def get_token() -> str:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin@lekki.local", "password": SEED_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    print(f"Login status: {response.status_code}")
    if response.status_code != 200:
        _fail(f"Login — {response.text}")
    data = response.json()
    print(f"Connecté : {data['user']['email']} ({data['user']['role']})")
    return data["access_token"]


def test_crud() -> None:
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Test Automatisé",
        "content": "Contenu du test automatisé pour FTS et RAG.",
        "category": "rh",
    }
    response = requests.post(
        f"{BASE_URL}/pages/",
        json=payload,
        headers=headers,
        timeout=120,
    )
    if response.status_code != 201:
        _fail(f"Création page — {response.status_code} {response.text}")

    page = response.json()
    page_id = page["id"]
    print(f"Page créée : {page_id}")

    response = requests.get(f"{BASE_URL}/pages/{page_id}", headers=headers, timeout=30)
    if response.status_code != 200:
        _fail(f"Lecture page — {response.status_code}")
    print(f"Lecture réussie : {response.json()['title']}")

    response = requests.get(f"{BASE_URL}/pages/", headers=headers, timeout=30)
    if response.status_code != 200:
        _fail(f"Liste pages — {response.status_code}")
    pages = response.json()
    print(f"Nombre de pages en base : {len(pages)}")
    if not any(p["id"] == page_id for p in pages):
        _fail("La page créée n'apparaît pas dans la liste")

    print(f"Vérification de l'indexation RAG pour {page_id}...")
    embed_resp = requests.post(
        f"{BASE_URL}/internal/embed/{page_id}",
        headers={"X-Internal-Key": INTERNAL_KEY},
        timeout=120,
    )
    if embed_resp.status_code != 200:
        _fail(
            f"Embedding — {embed_resp.status_code} {embed_resp.text}\n"
            "Vérifiez GEMINI_API_KEY dans .env et que le serveur a été redémarré."
        )
    embed_data = embed_resp.json()
    chunks_created = embed_data.get("chunks_created", 0)
    print(f"Résultat embedding: {embed_data}")
    if chunks_created < 1:
        _fail("Aucun chunk créé — embedding Gemini a échoué")

    print("Test de la recherche FTS5...")
    search_resp = requests.get(
        f"{BASE_URL}/pages/search",
        params={"q": "Test"},
        headers=headers,
        timeout=30,
    )
    if search_resp.status_code != 200:
        _fail(f"Recherche FTS5 — {search_resp.status_code} {search_resp.text}")
    results = search_resp.json()
    print(f"Résultats recherche: {len(results)} page(s) trouvée(s)")
    if not any(r["id"] == page_id for r in results):
        _fail("La page créée n'est pas retrouvée par FTS5 (q=Test)")

    del_resp = requests.delete(f"{BASE_URL}/pages/{page_id}", headers=headers, timeout=30)
    if del_resp.status_code != 204:
        print(f"Avertissement : suppression page test — {del_resp.status_code}")
    else:
        print(f"Page test supprimée : {page_id}")

    print("\nTous les tests ont réussi.")


if __name__ == "__main__":
    try:
        requests.get(f"{BASE_URL.replace('/api/v1', '')}/health", timeout=5)
    except requests.RequestException:
        _fail(
            f"API inaccessible sur {BASE_URL}. "
            "Lancez : uvicorn app.main:app --reload --port 8000"
        )
    test_crud()
