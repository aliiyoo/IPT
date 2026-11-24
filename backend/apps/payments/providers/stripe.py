import secrets
import string
from datetime import datetime, timezone

import stripe
from django.conf import settings

from .base import PaymentProvider, WebhookResult


class StripeProvider(PaymentProvider):
    name = 'stripe'

    def __init__(self):
        self.client = stripe.StripeClient(
            settings.STRIPE_SECRET_KEY,
            stripe_version=settings.STRIPE_API_VERSION,
        )

    def create_session(self, input_data):
        metadata = input_data['metadata']
        quantity = int(metadata['quantity'])
        unit_amount = int(input_data['amountMinor']) // quantity
        params = {
            'mode': 'payment',
            'success_url': input_data['successUrl'],
            'cancel_url': input_data['cancelUrl'],
            'client_reference_id': input_data['referenceNumber'],
            'customer_email': metadata.get('customerEmail') or None,
            'line_items': [{
                'price_data': {
                    'currency': input_data['currency'].lower(),
                    'unit_amount': unit_amount,
                    'product_data': {
                        'name': input_data['description'][:255],
                    },
                },
                'quantity': quantity,
            }],
            'metadata': {
                **metadata,
                'creditsRequired': str(input_data['amountInCredits']),
                'referenceNumber': input_data['referenceNumber'],
            },
            'integration_identifier': 'pixelpink_' + ''.join(
                secrets.choice(string.ascii_lowercase) for _ in range(8)
            ),
            'expires_at': int(input_data['expiresAt'].timestamp()),
        }
        session = self.client.v1.checkout.sessions.create(
            params=params,
            options={'idempotency_key': f"stripe-checkout-{metadata['sessionId']}"},
        )
        return {
            'providerSessionId': session.id,
            'checkoutUrl': session.url,
            'expiresAt': _from_timestamp(session.expires_at) or input_data['expiresAt'],
        }

    def get_session(self, provider_session_id):
        session = self.client.v1.checkout.sessions.retrieve(provider_session_id)
        if session.status == 'expired':
            status = 'expired'
        elif session.status == 'complete' and session.payment_status == 'paid':
            status = 'paid'
        else:
            status = 'pending'
        paid_at = _from_timestamp(getattr(session, 'created', None)) if status == 'paid' else None
        return {'status': status, 'paidAt': paid_at}

    def verify_webhook(self, raw_body, headers):
        signature = next(
            (value for key, value in headers.items() if key.lower() == 'stripe-signature'),
            '',
        )
        try:
            event = stripe.Webhook.construct_event(
                raw_body,
                signature,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.SignatureVerificationError) as exc:
            raise ValueError('Invalid Stripe webhook signature or payload.') from exc

        event_data = event['data']['object']
        event_type = event['type']
        if event_type == 'checkout.session.completed':
            normalized_type = 'payment.paid' if event_data.get('payment_status') == 'paid' else 'payment.pending'
        elif event_type == 'checkout.session.async_payment_succeeded':
            normalized_type = 'payment.paid'
        elif event_type == 'checkout.session.async_payment_failed':
            normalized_type = 'payment.failed'
        elif event_type == 'checkout.session.expired':
            normalized_type = 'payment.expired'
        else:
            normalized_type = 'payment.ignored'

        metadata = event_data.get('metadata') or {}
        return WebhookResult(
            event_id=event['id'],
            event_type=normalized_type,
            provider_session_id=event_data.get('id', ''),
            reference_number=event_data.get('client_reference_id') or metadata.get('referenceNumber'),
            paid_at=_from_timestamp(event.get('created')),
        )


def _from_timestamp(value):
    if value is None:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc)