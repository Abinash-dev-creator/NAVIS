"""Optional quick checks after starting Navis locally. Requires requests."""
import requests
BASE = "http://127.0.0.1:8000/api/v1/social"
status = requests.get(f"{BASE}/status", timeout=10)
status.raise_for_status()
print("status:", status.json()["sending_mode"])
created = requests.post(f"{BASE}/drafts", json={
    "platform": "instagram",
    "recipient_name": "Smoke test",
    "source_message": "Hi",
    "draft_text": "Hello! This is a local test draft."
}, timeout=10)
created.raise_for_status()
draft = created.json()
print("created:", draft["id"], draft["status"])
approved = requests.post(f"{BASE}/drafts/{draft['id']}/approve", timeout=10)
approved.raise_for_status()
assert approved.json()["status"] == "approved"
assert "not sent" in approved.json()["delivery_note"]
print("approval queue works; no message was sent")
