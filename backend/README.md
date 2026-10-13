# QRShield FastAPI backend

The FastAPI service implements `/api/qr/generate`, `/api/qr/tamper`, `/api/qr/verify`, `/api/history`, `/api/stats`, `/api/health`, and `/api/healthz`.

## Local run

From the project root:

```sh
python -m pip install -r backend/requirements.txt
QRSHIELD_HMAC_SECRET="use-a-long-random-local-demo-value" \
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080
```

The API requires `QRSHIELD_HMAC_SECRET`, or the Replit backend-only `SESSION_SECRET` fallback. Configure secrets through the platform secret manager; never commit a real key. `QRSHIELD_CORS_ORIGINS` can be set to a comma-separated list of explicitly allowed browser origins for local development.

## Tests

```sh
python -m unittest discover -s backend/tests -v
```

No database is used. The activity list is held in process memory, is capped at 500 events, may be shared between visitors, and is cleared when the process restarts.
