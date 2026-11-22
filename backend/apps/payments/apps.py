from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.payments'

    def ready(self):
        from . import signals
        from .providers.factory import initialize_payment_provider

        initialize_payment_provider()
