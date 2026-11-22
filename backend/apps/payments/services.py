import json
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from .crypto import encrypt_key, generate_digital_key, hash_key
from .email_api import deliver_key_email
from .models import (
    CheckoutSession,
    CreditLedger,
    EmailDeliveryLog,
    PaymentDigitalKey,
    PaymentOrder,
    Wallet,
    WebhookEvent,
)
from .providers import get_payment_provider


PAID_EVENT_TYPES = {'payment.paid', 'checkout_session.payment.paid'}
FAILED_EVENT_TYPES = {'payment.failed', 'checkout_session.payment.failed'}


def create_checkout_session(*, user, variant, quantity, idempotency_key):
    credits_required = variant.price_credits * quantity
    provider = get_payment_provider()

    if idempotency_key:
        existing = CheckoutSession.objects.filter(
            user=user,
            idempotency_key=idempotency_key,
        ).first()
        if existing:
            if not existing.provider_session_id:
                _attach_provider_session(existing, variant)
            return existing

    wallet, _ = Wallet.objects.get_or_create(user=user, defaults={'balance': 5000})
    if wallet.balance < credits_required:
        raise InsufficientCreditsError('Your wallet does not have enough credits for this purchase.')

    now = timezone.now()
    session = CheckoutSession.objects.create(
        user=user,
        product=variant,
        quantity=quantity,
        credits_required=credits_required,
        reference_number=f'ORDER-{secrets.token_hex(6).upper()}',
        provider=provider.name,
        expires_at=now + timedelta(minutes=settings.PAYMENT_SESSION_TTL_MINUTES),
        idempotency_key=idempotency_key,
        success_url='',
        cancel_url='',
    )
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    session.success_url = f'{frontend_url}/payment/success?session_id={session.pk}'
    session.cancel_url = f'{frontend_url}/?payment_cancelled={session.pk}'
    session.save(update_fields=['success_url', 'cancel_url'])
    _attach_provider_session(session, variant)
    return session


def _attach_provider_session(session, variant):
    provider = get_payment_provider()
    product = variant.product
    provider_session = provider.create_session({
        'referenceNumber': session.reference_number,
        'amountInCredits': session.credits_required,
        'amountMinor': int(variant.price * 100) * session.quantity,
        'currency': 'PHP',
        'description': f'{product.name} x{session.quantity}',
        'successUrl': session.success_url,
        'cancelUrl': session.cancel_url,
        'expiresAt': session.expires_at,
        'metadata': {
            'userId': str(session.user_id),
            'productId': str(variant.pk),
            'quantity': str(session.quantity),
            'orderId': str(session.pk),
            'sessionId': str(session.pk),
        },
    })
    session.provider_session_id = provider_session['providerSessionId']
    session.checkout_url = provider_session['checkoutUrl']
    session.expires_at = provider_session['expiresAt']
    session.save(update_fields=['provider_session_id', 'checkout_url', 'expires_at'])


def process_payment_webhook(provider_name, raw_body, headers):
    provider = get_payment_provider()
    if provider_name != provider.name:
        raise ValueError('Webhook provider does not match the configured payment provider.')

    event_data = provider.verify_webhook(raw_body, headers)
    payload = json.loads(raw_body.decode('utf-8'))
    event, created = WebhookEvent.objects.get_or_create(
        provider=provider_name,
        event_id=event_data.event_id,
        defaults={
            'event_type': event_data.event_type,
            'payload': payload,
        },
    )

    if not created and event.status == 'processed':
        return {'duplicate': True, 'status': 'processed', 'order_id': _event_order_id(event)}

    order_id = None
    outcome = 'ignored'
    try:
        with transaction.atomic():
            event = WebhookEvent.objects.select_for_update().get(pk=event.pk)
            if event.status == 'processed':
                return {'duplicate': True, 'status': 'processed', 'order_id': _event_order_id(event)}

            session = CheckoutSession.objects.select_for_update().filter(
                provider=provider_name,
                provider_session_id=event_data.provider_session_id,
            ).first()
            if not session:
                event.status = 'processed'
                event.processed_at = timezone.now()
                event.save(update_fields=['status', 'processed_at'])
                return {'duplicate': not created, 'status': 'ignored', 'order_id': None}

            if event_data.reference_number and event_data.reference_number != session.reference_number:
                event.status = 'failed'
                event.error = 'Webhook reference number did not match the checkout session.'
                event.save(update_fields=['status', 'error'])
                raise ValueError(event.error)

            if event_data.event_type in FAILED_EVENT_TYPES:
                if session.status == 'pending':
                    session.status = 'failed'
                    session.save(update_fields=['status'])
                outcome = session.status
            elif event_data.event_type in PAID_EVENT_TYPES:
                if session.status != 'pending':
                    outcome = session.status
                elif session.expires_at <= timezone.now():
                    session.status = 'expired'
                    session.save(update_fields=['status'])
                    outcome = 'expired'
                else:
                    wallet, _ = Wallet.objects.get_or_create(
                        user_id=session.user_id,
                        defaults={'balance': 5000},
                    )
                    updated = Wallet.objects.filter(
                        pk=wallet.pk,
                        balance__gte=session.credits_required,
                    ).update(
                        balance=F('balance') - session.credits_required,
                        updated_at=timezone.now(),
                    )
                    if not updated:
                        session.status = 'failed'
                        session.save(update_fields=['status'])
                        outcome = 'insufficient_credits'
                    else:
                        order = PaymentOrder.objects.create(
                            user_id=session.user_id,
                            session=session,
                            product=session.product,
                            quantity=session.quantity,
                            credits_spent=session.credits_required,
                        )
                        digital_keys = []
                        for _ in range(session.quantity):
                            raw_key = generate_digital_key()
                            digital_keys.append(PaymentDigitalKey.objects.create(
                                order=order,
                                user_id=session.user_id,
                                key_encrypted=encrypt_key(raw_key),
                                key_hash=hash_key(raw_key),
                            ))
                        EmailDeliveryLog.objects.create(
                            order=order,
                            digital_key=digital_keys[0],
                            idempotency_key=f'key-email:{order.pk}',
                        )
                        CreditLedger.objects.create(
                            user_id=session.user_id,
                            delta=-session.credits_required,
                            reason='purchase',
                            ref_type='order',
                            ref_id=order.pk,
                        )
                        session.status = 'paid'
                        session.paid_at = event_data.paid_at or timezone.now()
                        session.save(update_fields=['status', 'paid_at'])
                        order_id = str(order.pk)
                        outcome = 'paid'

            event.status = 'processed'
            event.processed_at = timezone.now()
            event.save(update_fields=['status', 'processed_at'])
    except ValueError:
        raise
    except Exception as exc:
        WebhookEvent.objects.filter(pk=event.pk).update(status='failed', error=str(exc)[:1000])
        raise

    if order_id:
        delivery_log = EmailDeliveryLog.objects.filter(order_id=order_id).first()
        if delivery_log:
            deliver_key_email(delivery_log)

    return {'duplicate': not created, 'status': outcome, 'order_id': order_id}


def _event_order_id(event):
    session_id = event.payload.get('data', {}).get('provider_session_id')
    if not session_id:
        resource = event.payload.get('data', {}).get('attributes', {}).get('data', {})
        session_id = resource.get('id')
    session = CheckoutSession.objects.filter(provider_session_id=session_id).first()
    if session and hasattr(session, 'order'):
        return str(session.order.pk)
    return None


class InsufficientCreditsError(Exception):
    pass