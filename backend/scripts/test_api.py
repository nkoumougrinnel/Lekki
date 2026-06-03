import requests

BASE_URL = "http://localhost:8000/api/v1"
CREATOR_ID = "a0000000-0000-4000-8000-000000000002"
INTERNAL_KEY = "lekki-internal-secret-key"

def test_crud():
    # 1. Création
    payload = {
        "title": "Test Automatisé",
        "content": "Contenu du test",
        "category": "rh"
    }
    response = requests.post(f"{BASE_URL}/pages/", params={"creator_id": CREATOR_ID}, json=payload)
    
    if response.status_code != 201:
        print(f"❌ Erreur création: {response.status_code} - {response.text}")
        return

    page_id = response.json()["id"]
    print(f"Page créée : {page_id}")

    # 2. Lecture
    response = requests.get(f"{BASE_URL}/pages/{page_id}")
    assert response.status_code == 200
    print(f"Lecture réussie : {response.json()['title']}")

    # 3. Liste
    response = requests.get(f"{BASE_URL}/pages/")
    print(f"Nombre de pages en base : {len(response.json())}")

    # 4. Test RAG / Internal Embed
    print(f"Vérification de l'indexation RAG pour {page_id}...")
    embed_resp = requests.post(
        f"{BASE_URL}/internal/embed/{page_id}",
        headers={"X-Internal-Key": INTERNAL_KEY}
    )
    print(f"Résultat embedding: {embed_resp.status_code} - {embed_resp.json()}")

    # 5. Test Recherche
    print("Test de la recherche FTS5...")
    search_resp = requests.get(f"{BASE_URL}/pages/search", params={"q": "Automatisé"})
    print(f"Résultats recherche: {len(search_resp.json())} page(s) trouvée(s)")

if __name__ == "__main__":
    try:
        test_crud()
    except Exception as e:
        print(f"Erreur : {e}")