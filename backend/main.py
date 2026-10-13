"""FastAPI backend for the QRShield academic integrity simulator."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

MAX_HISTORY_EVENTS = 500
SIGNATURE_PATTERN = re.compile(r"^[a-f0-9]{64}$")
ALLOWED_CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "QRSHIELD_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


NonBlank = Annotated[str, StringConstraints(min_length=1)]
SignatureHex = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]


class PaymentInput(StrictModel):
    merchant_name: NonBlank = Field(max_length=80)
    merchant_id: NonBlank = Field(max_length=40)
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    transaction_reference: NonBlank = Field(max_length=64)
    payment_note: str = Field(default="Academic demonstration", max_length=120)


class PaymentPayload(StrictModel):
    merchant_name: NonBlank = Field(max_length=80)
    merchant_id: NonBlank = Field(max_length=40)
    amount: str = Field(pattern=r"^[0-9]+\.[0-9]{2}$")
    transaction_reference: NonBlank = Field(max_length=64)
    payment_note: str | None = Field(default=None, max_length=120)

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, value: str) -> str:
        if Decimal(value) <= 0:
            raise ValueError("Amount must be greater than zero.")
        return value


class GeneratedQr(StrictModel):
    payload: PaymentPayload
    signature: SignatureHex
    qr_text: str


class TamperInput(StrictModel):
    payload: PaymentPayload
    signature: SignatureHex
    attack_type: Literal["recipient", "amount", "multiple"]
    replacement_merchant_id: NonBlank | None = Field(default=None, max_length=40)
    replacement_merchant_name: NonBlank | None = Field(default=None, max_length=80)
    replacement_amount: Decimal | None = Field(
        default=None, gt=0, max_digits=10, decimal_places=2
    )


class TamperResult(StrictModel):
    payload: PaymentPayload
    signature: SignatureHex
    changed_fields: list[str]


class VerifyInput(StrictModel):
    payload: PaymentPayload
    signature: str | None = None
    original_payload: PaymentPayload | None = None


class VerificationResult(StrictModel):
    valid: bool
    status: Literal["INTEGRITY_VERIFIED", "TAMPERING_DETECTED"]
    message: str
    checked_at: str
    changed_fields: list[str]
    expected_signature: SignatureHex
    supplied_signature: str


class ActivityEvent(StrictModel):
    id: str
    event_type: Literal[
        "QR_GENERATED",
        "TAMPERING_SIMULATED",
        "INTEGRITY_VERIFIED",
        "TAMPERING_DETECTED",
        "VERIFICATION_FAILED",
    ]
    transaction_reference: str
    timestamp: str
    description: str
    result: Literal["SUCCESS", "WARNING", "FAILED"]


class HistoryResponse(StrictModel):
    events: list[ActivityEvent]
    temporary: bool = True


class ActivityStats(StrictModel):
    qr_codes_generated: int
    tampering_attempts: int
    integrity_checks: int
    tampering_detected: int


class HistoryClearResult(StrictModel):
    cleared: bool


class HealthStatus(StrictModel):
    status: str


class ErrorResponse(StrictModel):
    error: str


app = FastAPI(
    title="QRShield API",
    description="Fictional QR payment payload signing and integrity verification.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

_history: list[ActivityEvent] = []


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    messages = [
        str(error.get("msg", "Invalid request."))
        for error in exc.errors()
    ]
    return JSONResponse(status_code=400, content={"error": "; ".join(messages)})


def _hmac_key() -> bytes:
    """Read the backend-only key; SESSION_SECRET is the Replit secret fallback."""
    secret = os.getenv("QRSHIELD_HMAC_SECRET") or os.getenv("SESSION_SECRET")
    if not secret:
        raise RuntimeError(
            "Set QRSHIELD_HMAC_SECRET (or SESSION_SECRET) before starting QRShield."
        )
    return secret.encode("utf-8")


def _canonical_payload(payload: PaymentPayload | dict[str, object]) -> bytes:
    """Serialize only the explicitly signed fields with deterministic JSON."""
    if isinstance(payload, PaymentPayload):
        fields = payload.model_dump(mode="json")
    else:
        fields = PaymentPayload.model_validate(payload).model_dump(mode="json")
    return json.dumps(
        fields,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def _sign_payload(payload: PaymentPayload | dict[str, object]) -> str:
    return hmac.new(_hmac_key(), _canonical_payload(payload), hashlib.sha256).hexdigest()


def _verify_signature(
    payload: PaymentPayload | dict[str, object], supplied_signature: str | None
) -> tuple[bool, str]:
    expected_signature = _sign_payload(payload)
    well_formed = bool(
        supplied_signature and SIGNATURE_PATTERN.fullmatch(supplied_signature)
    )
    matches = hmac.compare_digest(
        expected_signature,
        supplied_signature if well_formed and supplied_signature else "",
    )
    return bool(well_formed and matches), expected_signature


def _changed_fields(
    current: PaymentPayload, original: PaymentPayload | None
) -> list[str]:
    if original is None:
        return []
    current_fields = current.model_dump()
    original_fields = original.model_dump()
    return [
        field
        for field in current_fields
        if current_fields[field] != original_fields[field]
    ]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def _record_event(
    event_type: ActivityEvent.model_fields["event_type"].annotation,
    transaction_reference: str,
    description: str,
    result: ActivityEvent.model_fields["result"].annotation,
) -> None:
    _history.append(
        ActivityEvent(
            id=str(uuid.uuid4()),
            event_type=event_type,
            transaction_reference=transaction_reference,
            timestamp=_now(),
            description=description,
            result=result,
        )
    )
    del _history[:-MAX_HISTORY_EVENTS]


@app.post("/api/qr/generate", response_model=GeneratedQr)
def generate_qr(payment: PaymentInput) -> GeneratedQr:
    normalized_payload = PaymentPayload(
        merchant_name=payment.merchant_name,
        merchant_id=payment.merchant_id,
        amount=format(payment.amount, ".2f"),
        transaction_reference=payment.transaction_reference,
        payment_note=payment.payment_note or None,
    )
    signature = _sign_payload(normalized_payload)
    qr_text = json.dumps(
        {"payload": normalized_payload.model_dump(mode="json"), "signature": signature},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    _record_event(
        "QR_GENERATED",
        normalized_payload.transaction_reference,
        "Generated a fictional signed QR payload.",
        "SUCCESS",
    )
    return GeneratedQr(payload=normalized_payload, signature=signature, qr_text=qr_text)


@app.post("/api/qr/tamper", response_model=TamperResult)
def simulate_tampering(request: TamperInput) -> TamperResult:
    fields = request.payload.model_dump()
    if request.attack_type in ("recipient", "multiple"):
        fields["merchant_id"] = request.replacement_merchant_id or "UNKNOWN_999"
        if request.replacement_merchant_name:
            fields["merchant_name"] = request.replacement_merchant_name
        elif request.attack_type == "multiple":
            fields["merchant_name"] = "Unknown Recipient"
    if request.attack_type in ("amount", "multiple"):
        amount = request.replacement_amount or Decimal("950.00")
        fields["amount"] = format(amount, ".2f")

    modified_payload = PaymentPayload.model_validate(fields)
    changed_fields = _changed_fields(modified_payload, request.payload)
    _record_event(
        "TAMPERING_SIMULATED",
        request.payload.transaction_reference,
        f"Simulated {request.attack_type} changes to signed payment fields.",
        "WARNING",
    )
    # The original signature is preserved. This endpoint never calls _sign_payload.
    return TamperResult(
        payload=modified_payload,
        signature=request.signature,
        changed_fields=changed_fields,
    )


@app.post("/api/qr/verify", response_model=VerificationResult)
def verify_qr(request: VerifyInput) -> VerificationResult:
    valid, expected_signature = _verify_signature(request.payload, request.signature)
    changed_fields = _changed_fields(request.payload, request.original_payload)
    supplied_signature = request.signature or ""
    if valid:
        status = "INTEGRITY_VERIFIED"
        message = (
            "The supplied signature matches the current payload under the configured "
            "demo key. HMAC confirms integrity relative to a trusted shared secret; "
            "it does not independently prove merchant identity."
        )
        _record_event(
            "INTEGRITY_VERIFIED",
            request.payload.transaction_reference,
            "Backend HMAC-SHA256 verification passed.",
            "SUCCESS",
        )
    else:
        status = "TAMPERING_DETECTED"
        if not supplied_signature or not SIGNATURE_PATTERN.fullmatch(supplied_signature):
            status = "TAMPERING_DETECTED"
            description = "Verification failed because the supplied signature was missing or malformed."
            message = "The supplied signature is missing or malformed, so integrity could not be verified."
            event_type = "VERIFICATION_FAILED"
        else:
            description = "The supplied signature does not match the current payload."
            message = (
                "The supplied signature does not match the current payload. "
                "One or more signed fields may have changed."
            )
            event_type = "TAMPERING_DETECTED"
        _record_event(
            event_type,
            request.payload.transaction_reference,
            description,
            "FAILED",
        )
    return VerificationResult(
        valid=valid,
        status=status,
        message=message,
        checked_at=_now(),
        changed_fields=changed_fields,
        expected_signature=expected_signature,
        supplied_signature=supplied_signature,
    )


@app.get("/api/history", response_model=HistoryResponse)
def get_history() -> HistoryResponse:
    return HistoryResponse(events=list(reversed(_history)))


@app.delete("/api/history", response_model=HistoryClearResult)
def clear_history() -> HistoryClearResult:
    _history.clear()
    return HistoryClearResult(cleared=True)


@app.get("/api/stats", response_model=ActivityStats)
def get_stats() -> ActivityStats:
    return ActivityStats(
        qr_codes_generated=sum(event.event_type == "QR_GENERATED" for event in _history),
        tampering_attempts=sum(
            event.event_type == "TAMPERING_SIMULATED" for event in _history
        ),
        integrity_checks=sum(
            event.event_type
            in {"INTEGRITY_VERIFIED", "TAMPERING_DETECTED", "VERIFICATION_FAILED"}
            for event in _history
        ),
        tampering_detected=sum(
            event.event_type == "TAMPERING_DETECTED" for event in _history
        ),
    )


@app.get("/api/health", response_model=HealthStatus)
@app.get("/api/healthz", response_model=HealthStatus)
def health_check() -> HealthStatus:
    return HealthStatus(status="ok")
