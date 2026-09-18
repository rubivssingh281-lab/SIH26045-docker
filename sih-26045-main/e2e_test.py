import httpx
import time

API_BASE = "http://localhost:8000"

def run_smoke_test():
    with httpx.Client(timeout=60.0) as client:
        print("1. Create Case")
        res = client.post(f"{API_BASE}/cases", json={
            "title": "Neem Extract Formulation",
            "description": "Formulation containing neem (azadirachta indica) and turmeric.",
            "as_of_date": "2024-01-01",
            "jurisdiction": "INDIA",
            "tool": "ip-navigator"
        })
        assert res.status_code == 201, f"Failed to create case: {res.text}"
        case_id = res.json()["id"]
        print(f"Created Case: {case_id}")
        
        print("2. Extract Facts")
        res = client.post(f"{API_BASE}/cases/{case_id}/facts")
        assert res.status_code == 200, f"Failed to extract facts: {res.text}"
        facts = res.json()["facts"]
        print(f"Extracted {len(facts)} facts.")
        
        print("3. Confirm Facts")
        for f in facts:
            f["status"] = "CONFIRMED"
        res = client.post(f"{API_BASE}/cases/{case_id}/facts", json={"facts": facts})
        assert res.status_code == 200, f"Failed to confirm facts: {res.text}"
        print("Facts confirmed.")
        
        print("4. Analyze Case")
        res = client.post(f"{API_BASE}/cases/{case_id}/analyze", json={
            "jurisdiction": "INDIA",
            "as_of_date": "2024-01-01",
            "tool": "ip-navigator"
        })
        assert res.status_code == 200, f"Failed to analyze case: {res.text}"
        analysis = res.json()
        print(f"Analysis result: {analysis.get('classification')} with confidence {analysis.get('confidence', {}).get('band')}")
        
        print("5. Explainability")
        res = client.get(f"{API_BASE}/cases/{case_id}/explain")
        assert res.status_code == 200, f"Failed to get explanation: {res.text}"
        explain = res.json()
        print(f"Trace steps: {len(explain.get('steps', []))}")
        
        print("Smoke test completed successfully!")

if __name__ == "__main__":
    run_smoke_test()
