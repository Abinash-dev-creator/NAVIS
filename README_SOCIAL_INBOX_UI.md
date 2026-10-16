# Navis Social Inbox UI patch

This patch adds a separate social inbox page without overwriting the existing chat UI or backend. It uses the social endpoints introduced in Navis v0.4.0.

## Install
1. Stop the Navis server (`Ctrl+C`).
2. Back up `app/static`.
3. Extract this ZIP into your existing NAVIS project root, preserving folders. It adds:
   - `app/static/social.html`
   - `app/static/social.css`
   - `app/static/social.js`
4. Restart Navis using your usual command:

```powershell
cd "C:\Users\rayab\OneDrive\Desktop\Hell\Abhi\NAVIS"
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

5. Open `http://127.0.0.1:8000/static/social.html`.

## Features
- Platform API-readiness cards for Instagram, WhatsApp, and LinkedIn.
- Draft queue filters for pending, approved, rejected, and all.
- Create local test drafts, edit pending replies, approve locally, or reject.
- Explicit messaging that approvals do not send messages.

## Important
This UI requires the Navis v0.4.0 backend social endpoints. It does not connect accounts, ingest real messages, or send replies. Keep Navis local; the current app's API does not provide user authentication.
