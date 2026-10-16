# Navis Social Messaging Foundation — v0.4.0

This patch preserves the current FastAPI + Ollama + SQLite app and adds a persistent, human-reviewed social reply queue. It does **not** connect accounts or send messages yet.

## Install
1. Stop Navis (`Ctrl+C`).
2. Back up `app/main.py` and `data/navis.db`.
3. Extract this ZIP into the Navis project root, allowing `app/main.py` to be replaced.
4. Start Navis as usual:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   python -m uvicorn app.main:app --reload
   ```
5. Open `http://127.0.0.1:8000/api/docs` and try the `/api/v1/social/*` endpoints.

The SQLite table is created automatically in the existing `NAVIS_DB_PATH` database. Existing chat tables/data are left intact.

## Endpoints
- `GET /api/v1/social/status` — official API eligibility and next steps for the selected personal accounts.
- `GET /api/v1/social/drafts?status=pending_approval` — list drafts.
- `POST /api/v1/social/drafts` — create a pending draft.
- `PATCH /api/v1/social/drafts/{id}` — edit a pending draft.
- `POST /api/v1/social/drafts/{id}/approve` — record approval; **does not send**.
- `POST /api/v1/social/drafts/{id}/reject` — reject a pending draft.

Example draft body:
```json
{
  "platform": "instagram",
  "recipient_name": "Example contact",
  "recipient_id": "",
  "source_message": "Hey, are you free this weekend?",
  "draft_text": "I think so! What did you have in mind?"
}
```

## Official integration decision
- **Instagram first (recommended, after account conversion):** Meta's official Instagram Messaging API supports professional Creator/Business accounts, not consumer/personal accounts. It requires an Instagram professional account, Meta app setup, and the `instagram_business_manage_messages` permission. Start here: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-fdf7020f-3cd0-4a5d-859b-66fb856b80b6
- **WhatsApp:** the official Cloud API is for the WhatsApp Business Platform and requires a Meta business portfolio, WhatsApp Business Account, and business phone number. It is not a direct API for the regular personal inbox. Docs: https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=folder-c4f0f9be-ddf1-4d2b-8bdc-d97f00ae4e34
- **LinkedIn:** communication APIs exist, but personal inbox access requires the relevant product/partner access; basic self-service permissions do not include inbox read/reply. Docs: https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/overview and https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access

## Safety
- No passwords, cookies, or access tokens are requested or stored by this patch.
- Approval is an audit status only. It cannot trigger a send until a separate official provider connector is implemented.
- Keep Navis bound to `127.0.0.1` while the API has no application-level authentication. Do not expose these endpoints to the public internet.
