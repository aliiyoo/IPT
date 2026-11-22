from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .custom import CustomProvider
from .paymongo import PayMongoProvider

_provider = None


def initialize_payment_provider():
    global _provider
    name = settings.PAYMENT_PROVIDER
    if name == 'custom':
        if not settings.GATEWAY_WEBHOOK_SECRET:
            raise ImproperlyConfigured('GATEWAY_WEBHOOK_SECRET must be configured for custom payments.')
        _provider = CustomProvider()
    elif name == 'paymongo':
        secret = settings.PAYMONGO_SECRET_KEY
        if secret.startswith('sk_live_'):
            raise ImproperlyConfigured('Live PayMongo keys are not permitted; configure an sk_test_ key.')
        if not secret.startswith('sk_test_'):
            raise ImproperlyConfigured('PAYMONGO_SECRET_KEY must be a PayMongo test-mode key.')
        if not settings.PAYMONGO_WEBHOOK_SECRET:
            raise ImproperlyConfigured('PAYMONGO_WEBHOOK_SECRET must be configured for PayMongo.')
        _provider = PayMongoProvider()
    else:
        raise ImproperlyConfigured('PAYMENT_PROVIDER must be either custom or paymongo.')
    return _provider


def get_payment_provider():
    global _provider
    return _provider or initialize_payment_provider()


def reset_payment_provider():
    global _provider
    _provider = None