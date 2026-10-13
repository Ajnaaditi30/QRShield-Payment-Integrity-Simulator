"""Security regression tests for QRShield's HMAC and in-memory history."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from backend import main


class HmacVerificationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.secret = patch.dict(os.environ, {"QRSHIELD_HMAC_SECRET": "test-only-key"})
        self.secret.start()
        self.payload = main.PaymentPayload(
            merchant_name="Demo Coffee Store",
            merchant_id="MERCHANT_001",
            amount="150.00",
            transaction_reference="QR-DEMO-001",
            payment_note="Academic demonstration",
        )

    def tearDown(self) -> None:
        self.secret.stop()

    def test_correct_signature_passes(self) -> None:
        signature = main._sign_payload(self.payload)
        valid, _ = main._verify_signature(self.payload, signature)
        self.assertTrue(valid)

    def test_modified_merchant_id_fails(self) -> None:
        signature = main._sign_payload(self.payload)
        changed = self.payload.model_copy(update={"merchant_id": "UNKNOWN_999"})
        valid, _ = main._verify_signature(changed, signature)
        self.assertFalse(valid)

    def test_modified_amount_fails(self) -> None:
        signature = main._sign_payload(self.payload)
        changed = self.payload.model_copy(update={"amount": "950.00"})
        valid, _ = main._verify_signature(changed, signature)
        self.assertFalse(valid)

    def test_modified_transaction_reference_fails(self) -> None:
        signature = main._sign_payload(self.payload)
        changed = self.payload.model_copy(
            update={"transaction_reference": "QR-CHANGED-002"}
        )
        valid, _ = main._verify_signature(changed, signature)
        self.assertFalse(valid)

    def test_missing_signature_fails(self) -> None:
        valid, _ = main._verify_signature(self.payload, None)
        self.assertFalse(valid)

    def test_malformed_signature_fails_safely(self) -> None:
        valid, _ = main._verify_signature(self.payload, "not-a-hex-signature")
        self.assertFalse(valid)

    def test_history_records_and_clears(self) -> None:
        main._history.clear()
        main._record_event(
            "QR_GENERATED",
            self.payload.transaction_reference,
            "Generated test event.",
            "SUCCESS",
        )
        self.assertEqual(len(main.get_history().events), 1)
        self.assertEqual(main.clear_history().cleared, True)
        self.assertEqual(main.get_history().events, [])


if __name__ == "__main__":
    unittest.main()
