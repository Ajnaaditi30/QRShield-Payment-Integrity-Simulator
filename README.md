# QRShield — QR Payment Integrity Simulator

QRShield is an academic cybersecurity demonstration. It creates fictional payment payloads, signs them with backend-only HMAC-SHA256, simulates untrusted changes, and verifies integrity. It does not connect to UPI or banking services, initiate payments, or process money.

## Architecture

- `artifacts/qrshield/` — React, TypeScript, and Vite frontend.
- `backend/main.py` — FastAPI backend, Pydantic validation, canonical JSON, HMAC signing, tampering simulation, verification, and temporary history.
- `lib/api-spec/openapi.yaml` — source of truth for the API and generated TypeScript client.
- `backend/tests/` — standard-library automated security tests.
- No database is used. The activity list is stored in backend memory, is shared by users of the same process, and resets when that process restarts.

## Running in Replit

The project has separate web and API services. Start the QRShield web app and API Server workflows. The backend reads its signing key from `QRSHIELD_HMAC_SECRET`, falling back to the existing Replit `SESSION_SECRET`. For a separate deployment, configure `QRSHIELD_HMAC_SECRET` using the platform's secret manager; never put a real secret in frontend code or commit it.

The API is served at `/api`. The web app uses relative same-origin API routes, and the API service handles its own routing. No database setup is required.

## Running on Windows 11

Install Python 3.11 or newer, Node.js, and pnpm. Open two PowerShell terminals in the project directory.

### Terminal 1 — FastAPI

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
$env:QRSHIELD_HMAC_SECRET = "replace-with-a-long-random-local-demo-secret"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8080
```

Set the local demo value in the shell only. Do not reuse a production secret.

### Terminal 2 — React

```powershell
pnpm install
pnpm --filter @workspace/qrshield run dev
```

The Vite development server proxies `/api` requests to FastAPI on port 8080.

## Automated checks

```powershell
python -m unittest discover -s backend/tests -v
pnpm --filter @workspace/qrshield run typecheck
```

The tests cover valid signatures, modified merchant/amount/reference values, missing and malformed signatures, and in-memory history clearing.

## Three-minute demonstration

1. On Overview, select **Generate QR** and create the fictional ₹150 payload.
2. Open **Tampering Lab**, choose an attack, and inspect the changed fields.
3. Select **Verify Modified QR**; the backend reports `TAMPERING DETECTED`.
4. Restore the original payload and verify again; the backend reports `INTEGRITY VERIFIED`.
5. Open **Activity History** to review or clear the real session events.

HMAC verifies that the signed fields match data produced using a trusted shared secret. It does not independently prove a merchant's identity. The QR image is a data container, not a real payment QR.

## Source code

All source is in this project. To keep a copy locally, download the project from Replit or connect it to a GitHub repository in the Version Control pane and push the project. Keep `.env` and all real signing secrets out of Git.
