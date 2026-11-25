import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .crypto import decrypt_key
from .models import EmailDeliveryLog


class EmailApiError(Exception):
    pass


def deliver_key_email(delivery_log):
    delivery_log.refresh_from_db()
    if delivery_log.status == 'sent':
        return delivery_log

    try:
        raw_keys = [
            decrypt_key(key.key_encrypted)
            for key in delivery_log.order.digital_keys.all()
        ]
        base_url = settings.EMAIL_API_BASE_URL.rstrip('/')
        email = delivery_log.order.user.email
        if not email:
            raise EmailApiError('The account has no email address for key delivery.')

        body = (
            f"Your keys for {delivery_log.order.product.product.name}:\n"
            + "\n".join(raw_keys)
        )
        if base_url and settings.EMAIL_API_KEY:
            response = requests.post(
                f'{base_url}/api/emails/send',
                headers={
                    'Authorization': f'Bearer {settings.EMAIL_API_KEY}',
                    'Content-Type': 'application/json',
                    'Idempotency-Key': delivery_log.idempotency_key,
                },
                json={
                    'to': email,
                    'subject': 'Your PixelPink Digital Key',
                    'body': body,
                    'template': 'digital-key',
                    'metadata': {
                        'orderId': str(delivery_log.order_id),
                        'productId': str(delivery_log.order.product.product_id),
                    },
                    'idempotencyKey': delivery_log.idempotency_key,
                },
                timeout=15,
            )
            if not 200 <= response.status_code < 300:
                raise EmailApiError(f'Email API returned HTTP {response.status_code}.')
        elif settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
            from apps.integrations.email_service import send_pixelpink_transactional_email

            verified_location = (delivery_log.order.session.metadata or {}).get('verifiedLocation', '')
            send_pixelpink_transactional_email(
                to_email=email,
                to_name=delivery_log.order.user.get_full_name() or delivery_log.order.user.username,
                subject='Your PixelPink Digital Key',
                product_name=delivery_log.order.product.product.name,
                keys=raw_keys,
                order_id=delivery_log.order_id,
                credits_spent=delivery_log.order.credits_spent,
                verified_location=verified_location,
            )
        else:
            raise EmailApiError('Email API or Gmail SMTP credentials are required.')
    except Exception as exc:
        with transaction.atomic():
            failed_log = EmailDeliveryLog.objects.select_for_update().get(pk=delivery_log.pk)
            if failed_log.status == 'sent':
                return failed_log
            failed_log.attempts += 1
            failed_log.status = 'failed'
            failed_log.last_error = str(exc)[:1000]
            failed_log.save(update_fields=['attempts', 'status', 'last_error', 'updated_at'])
        return failed_log

    with transaction.atomic():
        sent_log = EmailDeliveryLog.objects.select_for_update().get(pk=delivery_log.pk)
        if sent_log.status != 'sent':
            sent_log.attempts += 1
            sent_log.status = 'sent'
            sent_log.last_error = ''
            sent_log.save(update_fields=['attempts', 'status', 'last_error', 'updated_at'])
            sent_log.order.digital_keys.update(delivered_at=timezone.now())
        return sent_log
