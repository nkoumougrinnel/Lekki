import requests

BASE_URL = "http://localhost:8000/api/v1"
INTERNAL_KEY = "lekki-internal-secret-key"

def get_token():
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin@lekki.local", "password": "lekki123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"Login status: {response.status_code}")
    print(f"Login response: {response.text}")
    if response.status_code != 200:
        raise Exception(f"Login failed: {response.status_code} - {response.text}")
    return response.json()["access_token"]


def test_crud():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Création
    payload = {
        "title": "Test Automatisé",
        "content": "Contenu du test",
        "category": "rh"
    }
    response = requests.post(
        f"{BASE_URL}/pages/",
        json=payload,
        headers=headers
    )
    
    if response.status_code != 201:
        print(f"Erreur création: {response.status_code} - {response.text}")
        return

    page_id = response.json()["id"]
    print(f"Page créée : {page_id}")

    # 2. Lecture
    response = requests.get(f"{BASE_URL}/pages/{page_id}", headers=headers)
    assert response.status_code == 200
    print(f"Lecture réussie : {response.json()['title']}")

    # 3. Liste
    response = requests.get(f"{BASE_URL}/pages/", headers=headers)
    print(f"Nombre de pages en base : {len(response.json())}")

    # 4. Test RAG
    print(f"Vérification de l'indexation RAG pour {page_id}...")
    embed_resp = requests.post(
        f"{BASE_URL}/internal/embed/{page_id}",
        headers={"X-Internal-Key": INTERNAL_KEY}
    )
    print(f"Résultat embedding: {embed_resp.status_code} - {embed_resp.json()}")

    # 5. Recherche FTS5
    print("Test de la recherche FTS5...")
    search_resp = requests.get(
        f"{BASE_URL}/pages/search",
        params={"q": "Test"},
        headers=headers
    )
    print(f"Résultats recherche: {len(search_resp.json())} page(s) trouvée(s)")

if __name__ == "__main__":
    try:
        test_crud()
    except Exception as e:
        print(f"Erreur : {e}")