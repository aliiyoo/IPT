from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CreditLedger, Wallet


@receiver(post_save, sender=get_user_model())
def provision_user_wallet(sender, instance, created, **kwargs):
    if not created:
        return

    with transaction.atomic():
        wallet, wallet_created = Wallet.objects.get_or_create(
            user=instance,
            defaults={'balance': 5000},
        )
        if wallet_created:
            CreditLedger.objects.create(
                user=instance,
                delta=5000,
                reason='seed',
                ref_type='wallet',
            )