import logging
from django.db import transaction
from django.utils import timezone
from apps.store.models import DigitalKey
from apps.store.utils import generate_random_digital_key
from apps.orders.models import Order, Fulfillment
from apps.integrations.email_service import send_pixelpink_fulfillment_email

logger = logging.getLogger(__name__)


def fulfill_order(order, paymongo_payment_id=None, verified_location=None):
    """
    Fulfills a paid order:
    1. Generates new unique digital keys in XXXX-XXXX-XXXX-XXXX format using
       django.utils.crypto.get_random_string for each item.
    2. Saves the key to DigitalKey model with status='revealed'.
    3. Creates Fulfillment records linking order_item to digital_key.
    4. Syncs product variant stock.
    5. Dispatches HTML receipt with digital keys via Gmail SMTP (DEFAULT_FROM_EMAIL = PixelPink).
    """
    with transaction.atomic():
        # Prevent double-fulfillment
        if order.status in ('fulfilled', 'refunded'):
            logger.info(f"Order #{order.id} is already {order.status}. Skipping duplicate fulfillment.")
            return order

        order.status = 'paid'
        if paymongo_payment_id:
            order.paymongo_payment_id = paymongo_payment_id

        created_fulfillments = []
        now = timezone.now()

        for item in order.items.select_related('variant', 'variant__product', 'variant__product__vendor').all():
            variant = item.variant
            if not variant:
                continue

            # 1. Claim existing available digital keys for this variant first
            available_keys = list(variant.digital_keys.filter(status='available')[:item.quantity])
            for key in available_keys:
                key.status = 'revealed'
                key.assigned_order_item = item
                key.save(update_fields=['status', 'assigned_order_item'])

                fulfillment = Fulfillment.objects.create(
                    order_item=item,
                    digital_key=key,
                    email_sent_at=now,
                    brevo_message_id="gmail_smtp_dispatch"
                )
                created_fulfillments.append(fulfillment)

            # 2. If more keys needed than available in stock, generate remaining
            remaining_needed = item.quantity - len(available_keys)
            for _ in range(remaining_needed):
                code = generate_random_digital_key()
                while DigitalKey.objects.filter(code=code).exists():
                    code = generate_random_digital_key()

                key = DigitalKey.objects.create(
                    variant=variant,
                    code=code,
                    status='revealed',
                    assigned_order_item=item
                )

                fulfillment = Fulfillment.objects.create(
                    order_item=item,
                    digital_key=key,
                    email_sent_at=now,
                    brevo_message_id="gmail_smtp_dispatch"
                )
                created_fulfillments.append(fulfillment)

            # 3. Synchronize variant stock count based on remaining available keys
            variant.sync_stock()

        order.status = 'fulfilled'
        order.save(update_fields=['status', 'paymongo_payment_id', 'updated_at'])

    # Send Gmail SMTP email (fail_silently=False ensures SMTP exceptions are raised)
    try:
        send_pixelpink_fulfillment_email(order, created_fulfillments, verified_location=verified_location)
    except Exception as e:
        logger.error(f"Gmail SMTP email dispatch error for Order #{order.id}: {e}")
        raise e

    return order
