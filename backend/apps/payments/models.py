import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.store.models import ProductVariant


class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    balance = models.PositiveIntegerField(default=5000)
    updated_at = models.DateTimeField(auto_now=True)


class CreditLedger(models.Model):
    REASON_CHOICES = [
        ('purchase', 'Purchase'),
        ('refund', 'Refund'),
        ('seed', 'Seed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='credit_ledger')
    delta = models.IntegerField()
    reason = models.CharField(max_length=16, choices=REASON_CHOICES)
    ref_type = models.CharField(max_length=40, blank=True)
    ref_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class CheckoutSession(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
    ]
    PROVIDER_CHOICES = [('custom', 'Custom'), ('paymongo', 'PayMongo'), ('stripe', 'Stripe')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_sessions')
    product = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name='payment_sessions')
    quantity = models.PositiveIntegerField()
    credits_required = models.PositiveIntegerField()
    reference_number = models.CharField(max_length=64, unique=True)
    provider = models.CharField(max_length=16, choices=PROVIDER_CHOICES)
    provider_session_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    checkout_url = models.URLField(max_length=1000, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending')
    expires_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    success_url = models.URLField(max_length=1000, blank=True)
    cancel_url = models.URLField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'idempotency_key'],
                condition=Q(idempotency_key__isnull=False),
                name='payment_session_user_idempotency_unique',
            ),
            models.CheckConstraint(condition=Q(quantity__gt=0), name='payment_session_quantity_positive'),
            models.CheckConstraint(condition=Q(credits_required__gt=0), name='payment_session_credits_positive'),
        ]


class PaymentOrder(models.Model):
    STATUS_CHOICES = [('paid', 'Paid'), ('refunded', 'Refunded')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_orders')
    session = models.OneToOneField(CheckoutSession, on_delete=models.PROTECT, related_name='order')
    product = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name='payment_orders')
    quantity = models.PositiveIntegerField()
    credits_spent = models.PositiveIntegerField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='paid')
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentDigitalKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(PaymentOrder, on_delete=models.CASCADE, related_name='digital_keys')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_digital_keys')
    key_encrypted = models.BinaryField()
    key_hash = models.CharField(max_length=64, unique=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class WebhookEvent(models.Model):
    STATUS_CHOICES = [('received', 'Received'), ('processed', 'Processed'), ('failed', 'Failed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=16)
    event_id = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='received')
    error = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['provider', 'event_id'], name='payment_webhook_provider_event_unique')
        ]


class EmailDeliveryLog(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(PaymentOrder, on_delete=models.CASCADE, related_name='email_delivery')
    digital_key = models.ForeignKey(PaymentDigitalKey, on_delete=models.CASCADE, related_name='email_delivery_logs')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending')
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)