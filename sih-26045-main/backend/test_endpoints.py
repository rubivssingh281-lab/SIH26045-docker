import httpx
import time
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    print("Testing GET /health...")
    try:
        r = httpx.get(f"{BASE_URL}/health")
        print(f"Status: {r.status_code}, Body: {r.text}\n")
    except Exception as e:
        print(f"Error: {e}\n")

def test_signup_and_login():
    print("Testing POST /api/auth/signup...")
    try:
        r = httpx.post(f"{BASE_URL}/api/auth/signup", json={"email": "test@example.com", "password": "password123"})
        print(f"Status: {r.status_code}, Body: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

    # Manually verify user in the database to allow login
    try:
        import sqlite3
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_verified = 1 WHERE email = 'test@example.com'")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to manually verify user: {e}")

    print("Testing POST /api/auth/login...")
    token = None
    try:
        # JSON payload for login based on UserLogin schema
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": "test@example.com", "password": "password123"})
        print(f"Status: {r.status_code}, Body: {r.text}\n")
        if r.status_code == 200:
            token = r.json().get("access_token")
    except Exception as e:
        print(f"Error: {e}\n")
    return token

def test_formulation_submit(token):
    print("Testing POST /api/formulation/submit...")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    formulation_id = None
    try:
        r = httpx.post(
            f"{BASE_URL}/api/formulation/submit",
            json={"title": "Headache Relief", "disease": "headache", "ingredients": "ginger, tulsi"},
            headers=headers
        )
        print(f"Status: {r.status_code}, Body: {r.text}\n")
        if r.status_code in [200, 201]:
            formulation_id = r.json().get("id")
    except Exception as e:
        print(f"Error: {e}\n")
    return formulation_id

def test_formulation_get(token, formulation_id):
    if not formulation_id:
        print("Skipping GET /api/formulation/{id} because no formulation_id was returned.")
        return
    
    print(f"Testing GET /api/formulation/{formulation_id}...")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        r = httpx.get(f"{BASE_URL}/api/formulation/{formulation_id}", headers=headers)
        print(f"Status: {r.status_code}, Body: {r.text}\n")
    except Exception as e:
        print(f"Error: {e}\n")

def test_tkdl_search():
    print("Testing GET /api/tkdl/search...")
    try:
        r = httpx.get(f"{BASE_URL}/api/tkdl/search", params={"query": "tulsi"})
        print(f"Status: {r.status_code}, Body: {r.text}\n")
    except Exception as e:
        print(f"Error: {e}\n")

def run_tests():
    print("Starting tests in 3 seconds...")
    time.sleep(3)
    test_health()
    token = test_signup_and_login()
    form_id = test_formulation_submit(token)
    test_formulation_get(token, form_id)
    test_tkdl_search()

if __name__ == "__main__":
    run_tests()
