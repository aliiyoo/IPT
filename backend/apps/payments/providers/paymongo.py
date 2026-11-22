import base64
import hashlib
import hmac
import json
import re
from datetime import datetime

import requests
from django.conf import settings

from .base import PaymentProvider, WebhookResult


class PayMongoProvider(PaymentProvider):
    name = 'paymongo'
    base_url = 'https://api.paymongo.com/v2'

    def __init__(self):
        self.secret_key = settings.PAYMONGO_SECRET_KEY
        self.webhook_secret = settings.PAYMONGO_WEBHOOK_SECRET
        token = base64.b64encode(f'{self.secret_key}:'.encode('utf-8')).decode('ascii')
        self.headers = {
            'Authorization': f'Basic {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

    def create_session(self, input_data):
        payload = {
            'data': {
                'attributes': {
                    'cancel_url': input_data['cancelUrl'],
                    'success_url': input_data['successUrl'],
                    'reference_number': input_data['referenceNumber'],
                    'description': input_data['description'],
                    'payment_method_types': ['card', 'gcash', 'paymaya'],
                    'line_items': [{
                        'currency': input_data['currency'],
                        'amount': input_data['amountMinor'],
                        'name': input_data['description'][:255],
                        'quantity': 1,
                    }],
                    'metadata': input_data['metadata'],
                },
            },
        }
        response = requests.post(
            f'{self.base_url}/checkout_sessions',
            headers=self.headers,
            json=payload,
            timeout=20,
        )
        if response.status_code not in (200, 201):
            raise RuntimeError(f'PayMongo checkout creation failed with HTTP {response.status_code}.')
        data = response.json().get('data', {})
        attributes = data.get('attributes', {})
        checkout_url = attributes.get('checkout_url') or data.get('checkout_url')
        if not data.get('id') or not checkout_url:
            raise RuntimeError('PayMongo returned an incomplete checkout session.')
        expires_at = attributes.get('expires_at')
        return {
            'providerSessionId': data['id'],
            'checkoutUrl': checkout_url,
            'expiresAt': _parse_datetime(expires_at) or input_data['expiresAt'],
        }

    def get_session(self, provider_session_id):
        response = requests.get(
            f'{self.base_url}/checkout_sessions/{provider_session_id}',
            headers=self.headers,
            timeout=20,
        )
        if response.status_code != 200:
            raise RuntimeError(f'PayMongo session lookup failed with HTTP {response.status_code}.')
        attributes = response.json().get('data', {}).get('attributes', {})
        status = attributes.get('status', 'pending')
        if status in ('paid', 'active') and attributes.get('payments'):
            status = 'paid'
        return {'status': _normalize_status(status), 'paidAt': _parse_datetime(attributes.get('paid_at'))}

    def verify_webhook(self, raw_body, headers):
        signature_header = next(
            (value for key, value in headers.items() if key.lower() == 'paymongo-signature'),
            '',
        )
        parts = dict(
            part.split('=', 1)
            for part in re.split(r'[,;]', signature_header)
            if '=' in part
        )
        timestamp = parts.get('t', '')
        signature = parts.get('te') or parts.get('li') or ''
        expected = hmac.new(
            self.webhook_secret.encode('utf-8'),
            timestamp.encode('utf-8') + b'.' + raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not timestamp or not signature or not hmac.compare_digest(expected, signature):
            raise ValueError('Invalid PayMongo webhook signature.')

        payload = json.loads(raw_body)
        event_data = payload.get('data', {})
        attributes = event_data.get('attributes', {})
        resource = attributes.get('data', {}) or {}
        resource_attributes = resource.get('attributes', {}) or {}
        provider_session_id = (
            resource.get('id')
            or attributes.get('checkout_session_id')
            or resource_attributes.get('checkout_session_id')
        )
        if not provider_session_id:
            raise ValueError('PayMongo webhook did not include a checkout session id.')

        event_id = event_data.get('id') or payload.get('id')
        if not event_id:
            raise ValueError('PayMongo webhook did not include an event id.')
        return WebhookResult(
            event_id=str(event_id),
            event_type=str(attributes.get('type') or payload.get('type') or ''),
            provider_session_id=str(provider_session_id),
            reference_number=attributes.get('reference_number') or resource_attributes.get('reference_number'),
            paid_at=_parse_datetime(attributes.get('paid_at') or resource_attributes.get('paid_at')),
        )


def _parse_datetime(value):
    if not value:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value).astimezone()
    return datetime.fromisoformat(str(value).replace('Z', '+00:00'))


def _normalize_status(status):
    value = str(status).lower()
    if value in ('paid', 'completed', 'succeeded'):
        return 'paid'
    if value in ('expired', 'cancelled', 'failed'):
        return value
    return 'pending'
