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
    help = "Seeds database with exact project requirements, brands, manufacturers, and about_this_item data"

    def handle(self, *args, **options):
        self.stdout.write("--- Resetting and Reseeding Store Catalog with Amazon-style Metadata ---")

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

        # Helper for common GameHub variations (Steam, Xbox, Nintendo, PlayStation)
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

        # 5. Products Catalog with brand, manufacturer, about_this_item
        catalog = [
            # ==========================================
            # Vendor 1: GameHub Digital (5 Games)
            # ==========================================
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Minecraft Digital Edition",
                "slug": "minecraft-digital-edition",
                "brand": "Mojang Studios",
                "manufacturer": "Microsoft Corporation",
                "desc": "Build, create, and explore infinite worlds in the global best-seller. Instant key activation.",
                "base_price": Decimal("1249.00"),
                "cover_image": "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Infinite Creative Possibilities: Build anything you can imagine with unlimited resources in Creative mode.",
                    "Survival Mode Adventures: Journey through mysterious lands, battle dangerous mobs, and discover hidden treasures.",
                    "Cross-Platform Multiplayer: Play with up to eight friends across Windows, PlayStation, Xbox, and Nintendo Switch.",
                    "Instant Digital Delivery: Official activation code delivered directly to your verified email address."
                ],
                "variants": create_game_variants("MC", Decimal("1249.00"), Decimal("1249.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Stardew Valley",
                "slug": "stardew-valley",
                "brand": "ConcernedApe",
                "manufacturer": "ConcernedApe LLC",
                "desc": "Create the farm of your dreams in this beloved cozy farming RPG. Features single player and co-op.",
                "base_price": Decimal("799.00"),
                "cover_image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Build Your Dream Farm: Turn an overgrown field into a thriving farm with crops, trees, and livestock.",
                    "Engage in Local Community: Befriend over 30 unique villagers in Pelican Town, attend seasonal festivals, and explore caves.",
                    "Multiplayer Co-Op: Invite up to 3 other players to build a farm together, share resources, and embark on adventures.",
                    "Endless Replayability: Includes all major content updates, additional farm maps, and end-game challenges."
                ],
                "variants": create_game_variants("SV", Decimal("799.00"), Decimal("899.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Animal Crossing: New Horizons",
                "slug": "animal-crossing-new-horizons",
                "brand": "Nintendo",
                "manufacturer": "Nintendo Co., Ltd.",
                "desc": "Escape to a deserted island getaway and create your personal paradise with customized islands.",
                "base_price": Decimal("2695.00"),
                "cover_image": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Your Island Getaway: Build your community from scratch on a deserted island brimming with possibility.",
                    "Crafting & Customization: Collect materials to craft everything from tools to comfortable furniture.",
                    "Dynamic Seasons & Weather: Experience real-time seasonal events and shifting island wildlife.",
                    "Play With Friends: Up to 8 players can reside on an island, with online multiplayer party play."
                ],
                "variants": create_game_variants("ACNH", Decimal("2695.00"), Decimal("2695.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Hollow Knight",
                "slug": "hollow-knight",
                "brand": "Team Cherry",
                "manufacturer": "Team Cherry Games",
                "desc": "An atmospheric, action-packed 2D indie masterpiece set in the vast subterranean kingdom of Hallownest.",
                "base_price": Decimal("649.00"),
                "cover_image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Vast Interconnected World: Explore twisting caverns, ancient cities, and deadly wastes.",
                    "Tight Responsive Combat: Master an evolving moveset with sword techniques and powerful spells.",
                    "Over 130 Enemies & 30 Epic Bosses: Encounter bizarre beasts and vanquish ancient knights.",
                    "Award-Winning Soundtrack: Features an evocative, haunting orchestral score by Christopher Larkin."
                ],
                "variants": create_game_variants("HK", Decimal("649.00"), Decimal("699.00")),
            },
            {
                "vendor": vendor_instances["gamehub-digital"],
                "category": cat_games,
                "name": "Overcooked! 2",
                "slug": "overcooked-2",
                "brand": "Ghost Town Games",
                "manufacturer": "Team17",
                "desc": "Chop, fry, and bake your way across eccentric kitchens in this hilarious co-op cooking chaos party game.",
                "base_price": Decimal("999.00"),
                "cover_image": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Chaotic Co-op Cooking: Chop, steam, fry, and throw ingredients in wild dynamic kitchens.",
                    "Online & Local Multiplayer: Team up with up to 4 players for culinary madness.",
                    "Dynamic Shifting Kitchens: Cook aboard hot air balloons, magical academies, and alien planets.",
                    "Massive Recipe Variety: Prepare sushi, cakes, burgers, pizzas, and dim sum under time pressure."
                ],
                "variants": create_game_variants("OC2", Decimal("999.00"), Decimal("1099.00")),
            },

            # ==========================================
            # Vendor 2: TopUp Central (5 Gift Cards)
            # ==========================================
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Nintendo eShop Gift Card",
                "slug": "nintendo-eshop-gift-card",
                "brand": "Nintendo",
                "manufacturer": "Nintendo of America",
                "desc": "Instantly fund your Nintendo Account to buy games, DLCs, and Nintendo Switch Online memberships.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1612287233261-267923795551?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Instant Wallet Credit: Add official funds directly to your Nintendo eShop account balance.",
                    "Buy Digital Games & DLC: Choose from over 1,000 new, classic, and indie games on Nintendo Switch.",
                    "No Expiration Date: Funds remain safe and active in your wallet indefinitely until used.",
                    "100% Genuine Digital Code: Sent immediately via automated transactional email delivery."
                ],
                "variants": create_gift_variants("NESHOP"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Xbox Gift Card",
                "slug": "xbox-gift-card",
                "brand": "Xbox",
                "manufacturer": "Microsoft Corporation",
                "desc": "Instant digital prepaid credits for Xbox consoles and Windows Store PC games.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Ultimate Gaming Freedom: Redeemable on Microsoft Store online, on Windows, and on Xbox consoles.",
                    "Buy Full Games, Add-ons & Subscriptions: Great for Xbox Game Pass Ultimate and in-game currencies.",
                    "No Fees or Expiration Dates: Full value applies straight to your Microsoft account.",
                    "Guaranteed Authentic: Verified digital voucher with instant email fulfillment."
                ],
                "variants": create_gift_variants("XBOX"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "PlayStation Store Gift Card",
                "slug": "playstation-store-gift-card",
                "brand": "PlayStation",
                "manufacturer": "Sony Interactive Entertainment",
                "desc": "Redeem for full games, seasons passes, PlayStation Plus subscriptions, and in-game currencies.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Expand Your PlayStation Experience: Add wallet credit for PS5, PS4, and PS VR titles.",
                    "Redeem for PS Plus Memberships: Access online multiplayer, monthly game downloads, and game catalog.",
                    "Secure & Convenient: Perfect alternative to linking a credit card to your console.",
                    "Fast Digital Delivery: Code sent straight to your inbox with redemption instructions."
                ],
                "variants": create_gift_variants("PSN"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Steam Wallet Code",
                "slug": "steam-wallet-code",
                "brand": "Steam",
                "manufacturer": "Valve Corporation",
                "desc": "Direct wallet credit for your Steam account. Works seamlessly during Steam seasonal sales.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "World's Largest PC Gaming Platform: Access tens of thousands of games and community market items.",
                    "Ideal for Seasonal Sales: Pre-load your balance ready for Summer, Autumn, and Winter Steam sales.",
                    "Currency Auto-Conversion: Converts seamlessly into your local Steam account currency upon redemption.",
                    "Verified Genuine Code: 100% authentic digital pin code ready for redemption."
                ],
                "variants": create_gift_variants("STEAM"),
            },
            {
                "vendor": vendor_instances["topup-central"],
                "category": cat_gifts,
                "name": "Google Play Gift Card",
                "slug": "google-play-gift-card",
                "brand": "Google Play",
                "manufacturer": "Google LLC",
                "desc": "Top up your Google Play balance to purchase Android apps, mobile games, books, and movies.",
                "base_price": Decimal("100.00"),
                "cover_image": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Millions of Apps & Games: Unlock in-game items, gems, battle passes, and premium mobile titles.",
                    "Books, Movies & Audiobooks: Enjoy top movies, best-selling eBooks, and premium subscriptions.",
                    "Simple One-Click Redeem: Instant top-up to your Google payment profile.",
                    "Safe & Secure: Zero expiration date and no transaction fees."
                ],
                "variants": create_gift_variants("GPLAY"),
            },

            # ==========================================
            # Vendor 3: CodeVault Software (5 Software Licenses)
            # ==========================================
            {
                "vendor": vendor_instances["codevault-software"],
                "category": cat_software,
                "name": "Windows 11 Pro",
                "slug": "windows-11-pro",
                "brand": "Microsoft",
                "manufacturer": "Microsoft Corporation",
                "desc": "Genuine Windows 11 OEM digital activation licenses with BitLocker and remote desktop support.",
                "base_price": Decimal("1499.00"),
                "cover_image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Professional Business Security: Includes BitLocker device encryption and Windows Information Protection.",
                    "Remote Desktop & Hyper-V: Connect seamlessly to your PC from anywhere and run virtual machines.",
                    "Lifetime Digital License: Genuine OEM key for 1 PC with permanent activation and free feature updates.",
                    "Easy One-Step Activation: Enter the 25-character key in Windows Settings to instantly activate."
                ],
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
                "brand": "Microsoft",
                "manufacturer": "Microsoft Corporation",
                "desc": "Lifetime license for Word, Excel, PowerPoint, Outlook, and OneNote. No monthly recurring fees.",
                "base_price": Decimal("1999.00"),
                "cover_image": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Complete Productivity Suite: Classic 2021 versions of Word, Excel, PowerPoint, Outlook, and OneNote.",
                    "One-Time Purchase: Lifetime license for 1 PC or Mac with zero recurring monthly subscription costs.",
                    "Commercial & Home Use: Fully licensed for commercial business operations and educational study.",
                    "Official Microsoft Account Binding: Ties directly to your personal or work Microsoft account."
                ],
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
                "brand": "Kaspersky",
                "manufacturer": "Kaspersky Lab",
                "desc": "Real-time award-winning cyber security protection against viruses, phishing, and ransomware.",
                "base_price": Decimal("499.00"),
                "cover_image": "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Real-Time Cyber Threat Defense: Blocks viruses, cryptolockers, malware, and zero-day exploits.",
                    "High Performance & Low Latency: Protects your device silently without slowing down your PC or games.",
                    "Anti-Phishing & Payment Protection: Keeps passwords, banking details, and sensitive data safe.",
                    "Multi-Device Support: Flexible licensing terms across 1, 3, or 5 devices for 1 or 2 years."
                ],
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
                "brand": "Adobe",
                "manufacturer": "Adobe Inc.",
                "desc": "Full suite access to Photoshop, Illustrator, Premiere Pro, After Effects, and 100GB cloud storage.",
                "base_price": Decimal("2499.00"),
                "cover_image": "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "20+ Industry-Standard Apps: Includes Photoshop, Illustrator, Premiere Pro, After Effects, and Acrobat Pro.",
                    "100GB Cloud Storage: Sync projects across desktop, iPad, and mobile devices effortlessly.",
                    "Adobe Fonts & Stock Integration: Access thousands of licensed fonts and creative assets.",
                    "Official Digital License: Direct activation on Adobe Creative Cloud with all new AI feature updates."
                ],
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
                "brand": "Nord Security",
                "manufacturer": "NordVPN S.A.",
                "desc": "Top-tier privacy VPN with threat protection, malware scanning, and ultra-fast global server access.",
                "base_price": Decimal("399.00"),
                "cover_image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
                "about_this_item": [
                    "Next-Gen Encryption & Privacy: Strict no-logs policy audited by independent security experts.",
                    "Ultra-Fast Global Servers: Over 5,400 high-speed servers across 60 countries.",
                    "Threat Protection Suite: Blocks malicious websites, dangerous downloads, and intrusive web ads.",
                    "Simultaneous Device Connection: Protect up to 6 devices simultaneously with a single account."
                ],
                "variants": [
                    {"sku": "NORD-1M", "attrs": {"term": "1 Month"}, "price": Decimal("399.00")},
                    {"sku": "NORD-1Y", "attrs": {"term": "1 Year"}, "price": Decimal("2899.00")},
                    {"sku": "NORD-2Y", "attrs": {"term": "2 Years"}, "price": Decimal("4499.00")},
                ]
            },
        ]

        total_variants = 0
        total_keys = 0
        KEYS_PER_VARIANT = 10

        for item in catalog:
            prod = Product.objects.create(
                vendor=item["vendor"],
                category=item["category"],
                name=item["name"],
                slug=item["slug"],
                brand=item.get("brand", ""),
                manufacturer=item.get("manufacturer", ""),
                description=item["desc"],
                about_this_item=item.get("about_this_item", []),
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

        self.stdout.write(self.style.SUCCESS(f"[OK] Created 15 Products with Amazon-style Brand/Manufacturer & Bullet points."))
        self.stdout.write(self.style.SUCCESS(f"[OK] Created {total_variants} Product Variants with realistic pricing."))
        self.stdout.write(self.style.SUCCESS(f"[OK] Generated {total_keys} Digital Keys."))
        self.stdout.write(self.style.SUCCESS("--- Seeding Successfully Completed ---"))
