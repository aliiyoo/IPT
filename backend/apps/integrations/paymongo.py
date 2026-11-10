import os
import base64
import hmac
import hashlib
import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class PayMongoError(Exception):
    pass


class PayMongoClient:
    BASE_URL = "https://api.paymongo.com/v1"

    def __init__(self, secret_key=None, public_key=None, webhook_secret=None):
        self.secret_key = secret_key or getattr(settings, 'PAYMONGO_SECRET_KEY', '') or os.getenv('PAYMONGO_SECRET_KEY', '')
        self.public_key = public_key or getattr(settings, 'PAYMONGO_PUBLIC_KEY', '') or os.getenv('PAYMONGO_PUBLIC_KEY', '')
        self.webhook_secret = webhook_secret or getattr(settings, 'PAYMONGO_WEBHOOK_SECRET', '') or os.getenv('PAYMONGO_WEBHOOK_SECRET', '')

    def _get_auth_header(self):
        token = base64.b64encode(f"{self.secret_key}:".encode('utf-8')).decode('utf-8')
        return {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def create_checkout_session(self, order, line_items, success_url=None, cancel_url=None):
        """
        Creates a PayMongo Checkout Session (v1/checkout_sessions).
        Amount in centavos (PHP 100.00 -> 10000).
        """
        if not self.secret_key:
            # Mock session for sandbox testing when no API key is provided
            logger.warning("No PAYMONGO_SECRET_KEY set. Simulating checkout session response.")
            mock_id = f"cs_test_mock_{order.id}"
            return {
                "id": mock_id,
                "checkout_url": f"{success_url}?mock_session_id={mock_id}&order_id={order.id}",
                "payment_intent": None
            }

        url = f"{self.BASE_URL}/checkout_sessions"

        # Format line items for PayMongo
        paymongo_line_items = []
        for item in line_items:
            # PayMongo expects amount in smallest currency unit (centavos for PHP)
            amount_cents = int(float(item['price']) * 100)
            paymongo_line_items.append({
                "currency": "PHP",
                "amount": amount_cents,
                "name": item['name'],
                "quantity": int(item['quantity']),
                "description": item.get('description', f"Digital License / Key: {item['name']}")
            })

        payload = {
            "data": {
                "attributes": {
                    "billing": {
                        "name": getattr(order.customer, 'get_full_name', lambda: order.customer.username)() or order.customer.username,
                        "email": order.customer.email or "customer@example.com",
                    },
                    "send_email_receipt": True,
                    "show_description": True,
                    "show_line_items": True,
                    "description": f"Order #{order.id} - PixelPink Digital Storefront",
                    "line_items": paymongo_line_items,
                    "payment_method_types": ["card", "gcash", "paymaya", "grab_pay", "dob"],
                    "success_url": success_url or f"{settings.FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
                    "cancel_url": cancel_url or f"{settings.FRONTEND_URL}/cart",
                }
            }
        }

        try:
            response = requests.post(url, headers=self._get_auth_header(), json=payload, timeout=20)
            if response.status_code in (200, 201):
                res_data = response.json().get('data', {})
                return {
                    "id": res_data.get('id'),
                    "checkout_url": res_data.get('attributes', {}).get('checkout_url'),
                    "payment_intent": res_data.get('attributes', {}).get('payment_intent')
                }
            else:
                logger.error(f"PayMongo API error {response.status_code}: {response.text}")
                raise PayMongoError(f"PayMongo returned {response.status_code}: {response.text}")
        except requests.RequestException as e:
            logger.error(f"PayMongo request failed: {e}")
            raise PayMongoError(f"Network error communicating with PayMongo: {e}")

    def verify_webhook_signature(self, raw_body_bytes, signature_header):
        """
        Verifies the Paymongo-Signature header:
        Header format: t=1612345678,te=...,li=...
        """
        if not self.webhook_secret:
            # In test mode without configured webhook secret, log and pass
            logger.warning("No PAYMONGO_WEBHOOK_SECRET configured. Skipping signature verification in dev.")
            return True

        if not signature_header:
            return False

        try:
            parts = dict(item.split('=', 1) for item in signature_header.split(','))
            timestamp = parts.get('t')
            test_signature = parts.get('te')
            live_signature = parts.get('li')
            signature_to_check = test_signature or live_signature

            if not timestamp or not signature_to_check:
                return False

            # Signed payload is: <timestamp>.<raw_body>
            payload_to_sign = f"{timestamp}.".encode('utf-8') + raw_body_bytes
            expected_signature = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload_to_sign,
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(expected_signature, signature_to_check)
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False

    def create_refund(self, payment_id, amount_cents=None, reason="requested_by_customer"):
        """
        Calls PayMongo Refund API: POST https://api.paymongo.com/v1/refunds
        """
        if not self.secret_key:
            return {"id": f"ref_mock_{payment_id}", "status": "refunded"}

        url = f"{self.BASE_URL}/refunds"
        payload = {
            "data": {
                "attributes": {
                    "payment_id": payment_id,
                    "reason": reason,
                    "notes": "Customer requested digital key refund"
                }
            }
        }
        if amount_cents:
            payload["data"]["attributes"]["amount"] = int(amount_cents)

        response = requests.post(url, headers=self._get_auth_header(), json=payload, timeout=20)
        if response.status_code in (200, 201):
            return response.json().get('data', {})
        else:
            raise PayMongoError(f"PayMongo Refund Failed: {response.text}")
