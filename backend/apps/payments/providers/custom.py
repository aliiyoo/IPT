import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone as datetime_timezone

from django.conf import settings
from django.utils import timezone

from apps.payments.models import CheckoutSession
from .base import PaymentProvider, SignedWebhook, WebhookResult


class CustomProvider(PaymentProvider):
    name = 'custom'

    def __init__(self):
        self.secret = settings.GATEWAY_WEBHOOK_SECRET.encode('utf-8')

    def create_session(self, input_data):
        session_id = str(input_data['metadata']['sessionId'])
        return {
            'providerSessionId': session_id,
            'checkoutUrl': f'/pay/{session_id}',
            'expiresAt': input_data['expiresAt'],
        }

    def get_session(self, provider_session_id):
        session = CheckoutSession.objects.filter(
            provider=self.name,
            provider_session_id=provider_session_id,
        ).first()
        if not session:
            return {'status': 'failed'}
        if session.status == 'pending' and session.expires_at <= timezone.now():
            return {'status': 'expired'}
        return {'status': session.status, 'paidAt': session.paid_at}

    def verify_webhook(self, raw_body, headers):
        signature = next(
            (value for key, value in headers.items() if key.lower() == 'x-gateway-signature'),
            '',
        )
        expected = hmac.new(self.secret, raw_body, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature):
            raise ValueError('Invalid custom-provider webhook signature.')

        payload = json.loads(raw_body)
        data = payload.get('data', {})
        return WebhookResult(
            event_id=str(payload['id']),
            event_type=str(payload['type']),
            provider_session_id=str(data['provider_session_id']),
            reference_number=data.get('reference_number'),
            paid_at=_parse_datetime(data.get('paid_at')),
        )

    def simulate_payment(self, provider_session_id):
        session = CheckoutSession.objects.filter(
            provider=self.name,
            provider_session_id=provider_session_id,
        ).first()
        if not session:
            raise LookupError('Checkout session was not found.')
        if session.status == 'paid':
            raise AlreadyPaidError('This checkout session is already paid.')
        if session.status != 'pending' or session.expires_at <= timezone.now():
            raise ValueError('This checkout session is no longer payable.')

        payload = {
            'id': str(uuid.uuid4()),
            'type': 'payment.paid',
            'data': {
                'provider_session_id': provider_session_id,
                'reference_number': session.reference_number,
                'paid_at': timezone.now().isoformat(),
            },
        }
        raw_body = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
        signature = hmac.new(self.secret, raw_body, hashlib.sha256).hexdigest()
        return SignedWebhook(raw_body=raw_body, headers={'X-Gateway-Signature': signature})


class AlreadyPaidError(Exception):
    pass


def _parse_datetime(value):
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime_timezone.utc)
    return parsed
