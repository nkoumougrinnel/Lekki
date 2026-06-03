import requests

BASE_URL = "http://localhost:8000/api/v1"
CREATOR_ID = "a0000000-0000-4000-8000-000000000002"

def test_crud():
    # 1. Création
    payload = {
        "title": "Test Automatisé",
        "content": "Contenu du test",
        "category": "rh"
    }
    response = requests.post(f"{BASE_URL}/pages/", params={"creator_id": CREATOR_ID}, json=payload)
    page_id = response.json()["id"]
    print(f"✅ Page créée : {page_id}")

    # 2. Lecture
    response = requests.get(f"{BASE_URL}/pages/{page_id}")
    assert response.status_code == 200
    print(f"✅ Lecture réussie : {response.json()['title']}")

    # 3. Liste
    response = requests.get(f"{BASE_URL}/pages/")
    print(f"✅ Nombre de pages en base : {len(response.json())}")

if __name__ == "__main__":
    try:
        test_crud()
    except Exception as e:
        print(f"❌ Erreur : {e}")