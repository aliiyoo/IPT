from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.payments.models import CreditLedger, Wallet
from apps.store.models import Category, Product, ProductVariant, Vendor


class Command(BaseCommand):
    help = 'Create one 5,000-credit demo account and two sample credit-priced products.'

    def handle(self, *args, **options):
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username='credits-demo',
            defaults={'email': 'credits-demo@example.com'},
        )
        if created:
            user.set_password('credits123')
            user.save(update_fields=['password'])

        wallet, wallet_created = Wallet.objects.get_or_create(
            user=user,
            defaults={'balance': 5000},
        )
        if wallet_created:
            CreditLedger.objects.create(
                user=user,
                delta=5000,
                reason='seed',
                ref_type='wallet',
            )

        vendor, _ = Vendor.objects.get_or_create(
            slug='credit-demo-store',
            defaults={'name': 'Credit Demo Store', 'is_active': True},
        )
        category, _ = Category.objects.get_or_create(
            slug='credit-demo',
            defaults={'name': 'Credit Demo'},
        )
        samples = [
            ('Starter Digital Key', 'credit-demo-starter', 'CREDIT-DEMO-STARTER', 100),
            ('Premium Digital Key', 'credit-demo-premium', 'CREDIT-DEMO-PREMIUM', 250),
        ]
        for name, slug, sku, credits in samples:
            product, _ = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    'vendor': vendor,
                    'category': category,
                    'name': name,
                    'description': 'Sample product for credit checkout testing.',
                    'base_price': Decimal(credits),
                    'is_digital': True,
                    'is_active': True,
                },
            )
            ProductVariant.objects.get_or_create(
                sku=sku,
                defaults={
                    'product': product,
                    'price': Decimal(credits),
                    'price_credits': credits,
                },
            )

        self.stdout.write(self.style.SUCCESS('Payment demo seed ready.'))
        self.stdout.write('Login: credits-demo / credits123 (5,000 credits)')