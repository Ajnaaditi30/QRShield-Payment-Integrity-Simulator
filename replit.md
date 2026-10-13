# QRShield

QRShield is an academic simulator for generating fictional signed payment QR payloads, demonstrating tampering, and verifying integrity with backend HMAC-SHA256.

## Run & Operate

- `pnpm --filter @workspace/qrshield run dev` — run the React web app
- `uv run --project . uvicorn backend.main:app --host 0.0.0.0 --port 8080` — run the FastAPI backend
- `python -m unittest discover -s backend/tests -v` — run backend security tests
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `QRSHIELD_HMAC_SECRET` or backend-only `SESSION_SECRET`
- No database is used; activity history is temporary and resets on backend restart.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Python FastAPI + Pydantic
- Signing: Python standard-library `hmac` and `hashlib`
- Validation: Pydantic request models
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/qrshield/` — React + TypeScript + Vite application
- `backend/main.py` — FastAPI routes, canonical serialization, HMAC signing, verification, and temporary history
- `backend/tests/` — automated signature and history regression tests
- `lib/api-spec/openapi.yaml` — API contract and generated frontend types

## Architecture decisions

- FastAPI serves the shared `/api` path so the web app can call it with relative URLs.
- Signing secrets remain backend-only; the frontend receives signatures and verification results only.
- History is in memory, shared by visitors on one server process, and temporary.

## Product

Students can generate fictional signed QR payloads, compare original and simulated tampering, verify integrity, and review or clear temporary activity.

## User preferences

- Never connect to UPI or banking systems or initiate real payments.
- Do not add a database; history must remain temporary and in memory.

## Gotchas

- Keep `lib/api-spec/openapi.yaml` aligned with FastAPI request/response models and rerun codegen after spec changes.
- Use `QRSHIELD_HMAC_SECRET` for independent deployments; Replit can fall back to its backend-only `SESSION_SECRET`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
