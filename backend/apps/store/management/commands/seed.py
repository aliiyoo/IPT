import random
import string
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import Profile
from apps.store.models import Vendor, Category, Product, ProductVariant, DigitalKey


def generate_readable_key(prefix="PK"):
    chars = string.ascii_uppercase + string.digits
    part1 = "".join(random.choices(chars, k=4))
    part2 = "".join(random.choices(chars, k=4))
    part3 = "".join(random.choices(chars, k=4))
    part4 = "".join(random.choices(chars, k=4))
    return f"{prefix}-{part1}-{part2}-{part3}-{part4}"


class Command(BaseCommand):
    help = "Seeds database with exact project requirements for vendors, products, variations, and keys"

    def handle(self, *args, **options):
        self.stdout.write("--- Resetting and Reseeding Store Catalog ---")

        # 1. Superuser
        superuser, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@pixelpink.store", "is_staff": True, "is_superuser": True}
        )
        superuser.set_password("admin123")
        superuser.is_staff = True
        superuser.is_superuser = True
        superuser.save()
        self.stdout.write(self.style.SUCCESS("[OK] Superuser: admin / admin123"))

        # 2. Demo Customer
        customer, _ = User.objects.get_or_create(
            username="customer",
            defaults={"email": "customer@example.com"}
        )
        customer.set_password("customer123")
        customer.save()
        customer.profile.role = "customer"
        customer.profile.save()
        self.stdout.write(self.style.SUCCESS("[OK] Demo Customer: customer / customer123"))

        # 3. Categories
        cat_games, _ = Category.objects.get_or_create(name="Games", defaults={"slug": "games"})
        cat_gifts, _ = Category.objects.get_or_create(name="Gift Cards", defaults={"slug": "gift-cards"})
        cat_software, _ = Category.objects.get_or_create(name="Software Licenses", defaults={"slug": "software-licenses"})

        # 4. Vendors & Vendor Users
        vendors_data = [
            {
                "username": "gamehub",
                "email": "vendor.gamehub@pixelpink.store",
                "vendor_name": "GameHub Digital",
                "slug": "gamehub-digital",
                "desc": "Your trusted source for authentic digital game keys across Xbox, Nintendo, PlayStation, and Steam.",
                "logo": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&q=80",
            },
            {
                "username": "topup",
                "email": "vendor.topup@pixelpink.store",
                "vendor_name": "TopUp Central",
                "slug": "topup-central",
                "desc": "Instant prepaid gaming wallet codes and gift cards in Philippine Peso denominations.",
                "logo": "https://images.unsplash.com/photo-1556742049-0a67e55722c3?auto=format&fit=crop&w=160&q=80",
            },
            {
                "username": "codevault",
                "email": "vendor.codevault@pixelpink.store",
                "vendor_name": "CodeVault Software",
                "slug": "codevault-software",
                "desc": "Verified digital software licenses, operating systems, antivirus, and productivity subscriptions.",
                "logo": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=160&q=80",
            },
        ]

        vendor_instances = {}
        for v in vendors_data:
            user, _ = User.objects.get_or_create(username=v["username"], defaults={"email": v["email"]})
            user.set_password("vendor123")
            user.save()

            vendor_obj, _ = Vendor.objects.get_or_create(
                slug=v["slug"],
                defaults={
                    "name": v["vendor_name"],
                    "description": v["desc"],
                    "logo": v["logo"],
                    "is_active": True,
                }
            )
            vendor_instances[v["slug"]] = vendor_obj

            user.profile.role = "vendor"
            user.profile.vendor = vendor_obj
            user.profile.save()
            self.stdout.write(self.style.SUCCESS(f"[OK] Vendor: {v['username']} / vendor123 ({v['vendor_name']})"))

        # Clean existing catalog to ensure exact variation specification
        DigitalKey.objects.all().delete()
        ProductVariant.objects.all().delete()
        Product.objects.all().delete()

        # Helper for common GameHub variations (Xbox, Nintendo, PlayStation, Steam)
        def create_game_variants(prefix, pc_price, console_price=None):
            if console_price is None:
                console_price = pc_price
            return [
                {"sku": f"{prefix}-STEAM", "attrs": {"platform": "Steam"}, "price": pc_price},
                {"sku": f"{prefix}-XBOX", "attrs": {"platform": "Xbox"}, "price": console_price},
                {"sku": f"{prefix}-NINTENDO", "attrs": {"platform": "Nintendo"}, "price": console_price},
                {"sku": f"{prefix}-PLAYSTATION", "attrs": {"platform": "PlayStation"}, "price": console_price},
            ]

        # Helper for common TopUp Peso variations (₱100, ₱300, ₱500, ₱1000)
        def create_gift_variants(prefix):
            return [
                {"sku": f"{prefix}-PHP100", "attrs": {"denomination": "₱100"}, "price": Decimal("100.00")},
                {"sku": f"{prefix}-PHP300", "attrs": {"denomination": "₱300"}, "price": Decimal("300.00")},
                {"sku": f"{prefix}-PHP500", "attrs": {"denomination": "₱500"}, "price": Decimal("500.00")},
                {"sku": f"{prefix}-PHP1000", "attrs": {"denomination": "₱1000"}, "price": Decimal("1000.00")},
            ]

        # 5. Products Catalog
        catalog = [
            # ==========================================
            # Vendor 1: GameHub Digital (5 Games)
            # Variations for EACH game: Xbox, Nintendo, PlayStation, Steam
            # ==========================================
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Minecraft Digital Edition",
                "slug": "minecraft-digital-edition",
                "desc": "Build, create, and explore infinite worlds in the global best-seller. Instant key activation.",
                "base_price": Decimal("1249.00"),
                "cover_image": "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=600&q=80",
                "variants": create_game_variants("MC", Decimal("1249.00"), Decimal("1249.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Stardew Valley",
                "slug": "stardew-valley",
                "desc": "Create the farm of your dreams in this beloved cozy farming RPG. Features single player and co-op.",
                "base_price": Decimal("799.00"),
                "cover_image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                "variants": create_game_variants("SV", Decimal("799.00"), Decimal("899.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Animal Crossing: New Horizons",
                "slug": "animal-crossing-new-horizons",
                "desc": "Escape to a deserted island getaway and create your personal paradise with customized islands.",
                "base_price": Decimal("2695.00"),
                "cover_image": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80",
                "variants": create_game_variants("ACNH", Decimal("2695.00"), Decimal("2695.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Hollow Knight",
                "slug": "hollow-knight",
                "desc": "An atmospheric, action-packed 2D indie masterpiece set in the vast subterranean kingdom of Hallownest.",
                "base_price": Decimal("649.00"),
                "cover_image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
                "variants": create_game_variants("HK", Decimal("649.00"), Decimal("699.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Overcooked! 2",
                "slug": "overcooked-2",
                "desc": "Chop, fry, and bake your way across eccentric kitchens in this hilarious co-op cooking chaos party game.",
                "base_price": Decimal("999.00"),
                "cover_image": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
                "variants": create_game_variants("OC2", Decimal("999.00"), Decimal("1099.00")),
            },

            # ==========================================
            # Vendor 2: TopUp Central (5 Gift Cards)
            # Variations for EACH: ₱100, ₱300, ₱500, ₱1000
            # ==========================================
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Nintendo eShop Gift Card",
                "slug": "nintendo-eshop-gift-card",
                "desc": "Instantly fund your Nintendo Account to buy games, DLCs, and Nintendo Switch Online memberships.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1612287233261-267923795551?auto=format&fit=crop&w=600&q=80",
                "variants": create_gift_variants("NESHOP"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Xbox Gift Card",
                "slug": "xbox-gift-card",
                "desc": "Instant digital prepaid credits for Xbox consoles and Windows Store PC games.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
                "variants": create_gift_variants("XBOX"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "PlayStation Store Gift Card",
                "slug": "playstation-store-gift-card",
                "desc": "Redeem for full games, seasons passes, PlayStation Plus subscriptions, and in-game currencies.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
                "variants": create_gift_variants("PSN"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Steam Wallet Code",
                "slug": "steam-wallet-code",
                "desc": "Direct wallet credit for your Steam account. Works seamlessly during Steam seasonal sales.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80",
                "variants": create_gift_variants("STEAM"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Google Play Gift Card",
                "slug": "google-play-gift-card",
                "desc": "Top up your Google Play balance to purchase Android apps, mobile games, books, and movies.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
                "variants": create_gift_variants("GPLAY"),
            },

            # ==========================================
            # Vendor 3: CodeVault Software (5 Software Licenses)
            # Variations: Different editions/terms
            # ==========================================
            {
                "vendor": vendor_instances["codevault-software"],
                "category": cat_software,
                "name": "Windows 11 Pro",
                "slug": "windows-11-pro",
                "desc": "Genuine Windows 11 OEM digital activation licenses with BitLocker and remote desktop support.",
                "base_price": Decimal("1499.00"),
                "cover_image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"sku": "WIN11-HOME", "attrs": {"edition": "Home"}, "price": Decimal("1499.00")},
                    {"sku": "WIN11-PRO", "attrs": {"edition": "Pro"}, "price": Decimal("2199.00")},
                    {"sku": "WIN11-ENT", "attrs": {"edition": "Enterprise"}, "price": Decimal("3499.00")},
                ]
            },
            {
                "vendor": vendor_instances["codevault-software"],
                "category": cat_software,
                "name": "Microsoft Office 2021",
                "slug": "microsoft-office-2021",
                "desc": "Lifetime license for Word, Excel, PowerPoint, Outlook, and OneNote. No monthly recurring fees.",
                "base_price": Decimal("1999.00"),
                "cover_image": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"sku": "OFFICE21-HS", "attrs": {"edition": "Home & Student"}, "price": Decimal("1999.00")},
                    {"sku": "OFFICE21-HB", "attrs": {"edition": "Home & Business"}, "price": Decimal("2799.00")},
                    {"sku": "OFFICE21-PRO", "attrs": {"edition": "Professional Plus"}, "price": Decimal("3499.00")},
                ]
            },
            {
                "vendor": vendor_instances["codevault-software"],
                "category": cat_software,
                "name": "Kaspersky Antivirus",
                "slug": "kaspersky-antivirus",
                "desc": "Real-time award-winning cyber security protection against viruses, phishing, and ransomware.",
                "base_price": Decimal("499.00"),
                "cover_image": "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"sku": "KASP-1Y-1D", "attrs": {"term": "1 Year", "devices": "1 Device"}, "price": Decimal("499.00")},
                    {"sku": "KASP-1Y-3D", "attrs": {"term": "1 Year", "devices": "3 Devices"}, "price": Decimal("899.00")},
                    {"sku": "KASP-2Y-1D", "attrs": {"term": "2 Years", "devices": "1 Device"}, "price": Decimal("899.00")},
                    {"sku": "KASP-2Y-3D", "attrs": {"term": "2 Years", "devices": "3 Devices"}, "price": Decimal("1499.00")},
                ]
            },
            {
                "vendor": vendor_instances["codevault-software"],
                "category": cat_software,
                "name": "Adobe Creative Cloud",
                "slug": "adobe-creative-cloud",
                "desc": "Full suite access to Photoshop, Illustrator, Premiere Pro, After Effects, and 100GB cloud storage.",
                "base_price": Decimal("2499.00"),
                "cover_image": "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"sku": "ADOBE-1M", "attrs": {"term": "1 Month"}, "price": Decimal("2499.00")},
                    {"sku": "ADOBE-3M", "attrs": {"term": "3 Months"}, "price": Decimal("6999.00")},
                    {"sku": "ADOBE-1Y", "attrs": {"term": "1 Year"}, "price": Decimal("24999.00")},
                ]
            },
            {
                "vendor": vendor_instances["codevault-software"],
                "category": cat_software,
                "name": "NordVPN",
                "slug": "nordvpn",
                "desc": "Top-tier privacy VPN with threat protection, malware scanning, and ultra-fast global server access.",
                "base_price": Decimal("399.00"),
                "cover_image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"sku": "NORD-1M", "attrs": {"term": "1 Month"}, "price": Decimal("399.00")},
                    {"sku": "NORD-1Y", "attrs": {"term": "1 Year"}, "price": Decimal("2899.00")},
                    {"sku": "NORD-2Y", "attrs": {"term": "2 Years"}, "price": Decimal("4499.00")},
                ]
            },
        ]

        total_variants = 0
        total_keys = 0

        # Keys per variant: 10 (exceeds the 5 minimum requested for safe testing)
        KEYS_PER_VARIANT = 10

        for item in catalog:
            prod = Product.objects.create(
                vendor=item["vendor"],
                category=item["category"],
                name=item["name"],
                slug=item["slug"],
                description=item["desc"],
                base_price=item["base_price"],
                cover_image=item["cover_image"],
                is_digital=True,
                is_active=True,
            )

            for v in item["variants"]:
                variant = ProductVariant.objects.create(
                    product=prod,
                    sku=v["sku"],
                    attributes=v["attrs"],
                    price=v["price"],
                )
                total_variants += 1

                prefix = v["sku"].split("-")[0]
                for _ in range(KEYS_PER_VARIANT):
                    code = generate_readable_key(prefix)
                    while DigitalKey.objects.filter(code=code).exists():
                        code = generate_readable_key(prefix)
                    DigitalKey.objects.create(
                        variant=variant,
                        code=code,
                        status="available"
                    )
                    total_keys += 1

                variant.sync_stock()

        self.stdout.write(self.style.SUCCESS(f"[OK] Created 15 Products across 3 Vendors."))
        self.stdout.write(self.style.SUCCESS(f"[OK] Created {total_variants} Product Variants with realistic pricing."))
        self.stdout.write(self.style.SUCCESS(f"[OK] Generated {total_keys} Digital Keys ({KEYS_PER_VARIANT} keys per variant, status='available')."))
        self.stdout.write(self.style.SUCCESS("--- Seeding Successfully Completed ---"))
