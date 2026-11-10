import logging
from django.db import transaction
from django.utils import timezone
from apps.store.models import DigitalKey
from apps.orders.models import Order, Fulfillment
from apps.integrations.brevo import BrevoClient

logger = logging.getLogger(__name__)


def fulfill_order(order, paymongo_payment_id=None):
    """
    Fulfills a paid order:
    1. Allocates available digital keys for each order item.
    2. Updates key status to 'revealed' (or 'assigned').
    3. Creates Fulfillment records.
    4. Syncs product variant stock.
    5. Dispatches customer keys email and vendor sale notification via Brevo.
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
        vendor_items = {}

        for item in order.items.select_related('variant', 'variant__product', 'variant__product__vendor').all():
            variant = item.variant
            vendor = variant.product.vendor

            if vendor not in vendor_items:
                vendor_items[vendor] = []
            vendor_items[vendor].append(item)

            # Find available keys for this variant
            available_keys = list(DigitalKey.objects.select_for_update().filter(
                variant=variant,
                status='available'
            )[:item.quantity])

            if len(available_keys) < item.quantity:
                logger.warning(
                    f"Insufficient keys for {variant.sku}! Needed {item.quantity}, found {len(available_keys)}."
                )

            for key in available_keys:
                key.status = 'revealed'
                key.assigned_order_item = item
                key.save(update_fields=['status', 'assigned_order_item'])

                fulfillment = Fulfillment.objects.create(
                    order_item=item,
                    digital_key=key,
                    email_sent_at=None
                )
                created_fulfillments.append(fulfillment)

            variant.sync_stock()

        order.status = 'fulfilled'
        order.save(update_fields=['status', 'paymongo_payment_id', 'updated_at'])

    # External Brevo dispatch (outside atomic transaction so DB doesn't roll back if email fails)
    brevo = BrevoClient()
    try:
        msg_id = brevo.send_keys_fulfillment_email(order, created_fulfillments)
        now = timezone.now()
        for f in created_fulfillments:
            f.brevo_message_id = msg_id
            f.email_sent_at = now
            f.save(update_fields=['brevo_message_id', 'email_sent_at'])
    except Exception as e:
        logger.error(f"Failed to send Brevo customer fulfillment email for Order #{order.id}: {e}")

    # Notify vendors
    for vendor, items in vendor_items.items():
        try:
            brevo.send_vendor_sale_notification(vendor, order, items)
        except Exception as e:
            logger.error(f"Failed to notify vendor {vendor.name} for Order #{order.id}: {e}")

    return order
