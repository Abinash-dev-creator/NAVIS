NAVIS INSTAGRAM WEBHOOK PATCH v0.4.2

WHAT THIS PATCH ADDS
- GET /api/v1/social/instagram/webhook : Meta verification handshake
- POST /api/v1/social/instagram/webhook : verifies X-Hub-Signature-256 using META_APP_SECRET
- GET /api/v1/social/instagram/inbox : inspect recent saved inbound text messages
- SQLite table instagram_inbox_messages, deduplicated by Meta message ID
- Each new inbound text message creates a pending_approval starter draft in the existing social_drafts table
- It does NOT send messages. The starter draft is generic and should be reviewed/edited.

INSTALL
1. Stop Navis. Back up your existing app/main.py.
2. Replace app/main.py with the app/main.py in this ZIP. This version was built from the main.py you uploaded.
3. Copy the two entries from .env.instagram.example into your existing project .env and replace placeholders locally. Do not upload .env or share secrets.
4. Restart Navis. Check http://127.0.0.1:8000/api/v1/health and confirm version 0.4.2.
5. Test the local handshake (PowerShell):
   Invoke-WebRequest 'http://127.0.0.1:8000/api/v1/social/instagram/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345'
   Expected response body: 12345 (use your actual configured token).
6. Expose port 8000 through a trusted HTTPS tunnel. The public URL must end with /api/v1/social/instagram/webhook.
7. In Meta > Instagram API setup with Instagram Login > Configure webhooks, enter that HTTPS URL and the exact same verify token, then Verify and Save. Subscribe to the messages field if the dashboard offers it.
8. Send a test DM to your professional Instagram account from another account. Check /api/v1/social/instagram/inbox and the existing Social Inbox UI.

SECURITY / LIMITATIONS
- Use a long random verify token. App secret and verify token belong only in local .env.
- POST requests with missing/invalid X-Hub-Signature-256 are rejected.
- Only text messages with a message ID are saved in this milestone. Attachments, reactions, and non-message events are ignored.
- This patch does not implement OAuth, token storage, sending, AI-generated replies, or App Review. It uses the generic starter draft as a safe first pass.
- Meta must be able to reach the HTTPS endpoint; localhost is not publicly reachable.
