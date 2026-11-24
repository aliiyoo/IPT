import string
import random
from decimal import Decimal, ROUND_CEILING
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from core.authentication import CsrfExemptSessionAuthentication
from django.db.models import Q
from .models import Vendor, Category, Product, ProductVariant, DigitalKey
from .serializers import (
    VendorSerializer,
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductVariantSerializer,
)


def generate_key_code(prefix="KEY"):
    chars = string.ascii_uppercase + string.digits
    p1 = "".join(random.choices(chars, k=4))
    p2 = "".join(random.choices(chars, k=4))
    p3 = "".join(random.choices(chars, k=4))
    p4 = "".join(random.choices(chars, k=4))
    return f"{prefix}-{p1}-{p2}-{p3}-{p4}"


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).prefetch_related('variants', 'vendor', 'category')
        vendor_slug = self.request.query_params.get('vendor')
        category_slug = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        platform = self.request.query_params.get('platform')

        if vendor_slug:
            queryset = queryset.filter(vendor__slug=vendor_slug)
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(brand__icontains=search) |
                Q(vendor__name__icontains=search)
            )
        if platform:
            queryset = queryset.filter(variants__attributes__platform__icontains=platform).distinct()

        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).prefetch_related('variants', 'vendor', 'category')
    serializer_class = ProductDetailSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]


class VendorListView(generics.ListAPIView):
    queryset = Vendor.objects.filter(is_active=True)
    serializer_class = VendorSerializer
    permission_classes = [permissions.AllowAny]


class VendorDetailView(generics.RetrieveAPIView):
    queryset = Vendor.objects.filter(is_active=True)
    serializer_class = VendorSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]


# --- Vendor (Seller Center) Endpoints ---
class VendorProductListCreateView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication, BasicAuthentication, JWTAuthentication]
    permission_classes = [permissions.AllowAny]  # We verify user from request.user or custom vendor header/param

    def get_vendor(self, request):
        user = request.user
        if user and user.is_authenticated and hasattr(user, 'profile') and user.profile.vendor:
            return user.profile.vendor

        # Also support passing vendor_slug or user_id for dev simplicity
        vendor_slug = request.headers.get('X-Vendor-Slug') or request.query_params.get('vendor_slug')
        if vendor_slug:
            return Vendor.objects.filter(slug=vendor_slug).first()

        username = request.headers.get('X-Username') or request.data.get('username')
        if username:
            from django.contrib.auth.models import User
            u = User.objects.filter(username=username).first()
            if u and hasattr(u, 'profile') and u.profile.vendor:
                return u.profile.vendor

        return None

    def get(self, request):
        vendor = self.get_vendor(request)
        if not vendor and not (request.user and request.user.is_superuser):
            # If no specific vendor, return all products if superuser or error
            if request.user and request.user.is_superuser:
                products = Product.objects.all().prefetch_related('variants', 'vendor')
            else:
                return Response({'error': 'Vendor authorization required.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            products = Product.objects.filter(vendor=vendor).prefetch_related('variants', 'vendor')

        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)

    def post(self, request):
        vendor = self.get_vendor(request)
        if not vendor and not (request.user and request.user.is_superuser):
            # Default to first vendor for demo if not specified
            vendor = Vendor.objects.first()

        data = request.data
        name = data.get('name')
        if not name:
            return Response({'error': 'Product name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        brand = data.get('brand', vendor.name if vendor else '')
        manufacturer = data.get('manufacturer', brand)
        description = data.get('description', '')
        base_price = data.get('base_price', 0)
        cover_image = data.get('cover_image', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80')
        about_this_item = data.get('about_this_item', [])
        if isinstance(about_this_item, str):
            about_this_item = [line.strip() for line in about_this_item.split('\n') if line.strip()]

        category_id = data.get('category_id')
        category = Category.objects.filter(pk=category_id).first() if category_id else Category.objects.first()

        # Create Product
        prod = Product.objects.create(
            vendor=vendor,
            category=category,
            name=name,
            brand=brand,
            manufacturer=manufacturer,
            description=description,
            about_this_item=about_this_item,
            base_price=base_price,
            cover_image=cover_image,
            is_digital=True,
            is_active=True
        )

        # Create Variants if passed
        variants_data = data.get('variants', [])
        if not variants_data:
            # Default single variant
            variants_data = [{
                'sku': f"{name[:3].upper()}-STD-{random.randint(100,999)}",
                'attributes': {'edition': 'Standard Edition'},
                'price': base_price,
                'stock_count': 10
            }]

        for v in variants_data:
            sku = v.get('sku') or f"{name[:3].upper()}-{random.randint(1000,9999)}"
            attrs = v.get('attributes') or {'option': v.get('name', 'Standard')}
            price = v.get('price', base_price)
            stock = int(v.get('stock_count', 10))

            variant = ProductVariant.objects.create(
                product=prod,
                sku=sku,
                attributes=attrs,
                price=price,
                price_credits=max(1, int(Decimal(str(price)).to_integral_value(rounding=ROUND_CEILING))),
                stock_count=stock
            )

            # Generate digital keys for the variant
            prefix = sku.split('-')[0][:4].upper()
            for _ in range(stock):
                code = generate_key_code(prefix)
                while DigitalKey.objects.filter(code=code).exists():
                    code = generate_key_code(prefix)
                DigitalKey.objects.create(variant=variant, code=code, status='available')

            variant.sync_stock()

        serializer = ProductDetailSerializer(prod)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def save_or_update_product_variants(prod, variants_data):
    """
    Handles nested variations update:
    - If variation has an existing id: updates price, attributes, and adjusts digital keys if stock changed.
    - If variation is new (no id): creates it and generates the required digital keys.
    - If an existing variation is omitted from variants_data: removes it.
    """
    if variants_data is None:
        return

    submitted_ids = set()

    for v in variants_data:
        v_id = v.get('id')
        v_price = v.get('price', prod.base_price)
        v_stock = int(v.get('stock_count', 10))

        v_name = v.get('name')
        attrs = v.get('attributes') or {}
        if v_name:
            attrs['edition'] = v_name
        elif not attrs:
            attrs = {'edition': 'Standard Edition'}

        variant = None
        if v_id:
            variant = ProductVariant.objects.filter(id=v_id, product=prod).first()

        if variant:
            submitted_ids.add(variant.id)
            variant.price = v_price
            variant.price_credits = max(1, int(Decimal(str(v_price)).to_integral_value(rounding=ROUND_CEILING)))
            variant.attributes = attrs
            if v.get('sku'):
                variant.sku = v.get('sku')
            variant.save()

            # Sync stock / digital keys
            curr_available = variant.digital_keys.filter(status='available').count()
            if v_stock > curr_available:
                needed = v_stock - curr_available
                prefix = variant.sku.split('-')[0][:4].upper()
                for _ in range(needed):
                    code = generate_key_code(prefix)
                    while DigitalKey.objects.filter(code=code).exists():
                        code = generate_key_code(prefix)
                    DigitalKey.objects.create(variant=variant, code=code, status='available')
            elif v_stock < curr_available:
                to_remove = curr_available - v_stock
                keys_to_del = variant.digital_keys.filter(status='available')[:to_remove]
                DigitalKey.objects.filter(id__in=[k.id for k in keys_to_del]).delete()

            variant.sync_stock()
        else:
            # Create new variation
            sku = v.get('sku') or f"{prod.name[:3].upper()}-{random.randint(1000, 9999)}"
            base_sku = sku
            while ProductVariant.objects.filter(sku=sku).exists():
                sku = f"{base_sku}-{random.randint(100, 999)}"

            variant = ProductVariant.objects.create(
                product=prod,
                sku=sku,
                attributes=attrs,
                price=v_price,
                price_credits=max(1, int(Decimal(str(v_price)).to_integral_value(rounding=ROUND_CEILING))),
                stock_count=v_stock
            )
            submitted_ids.add(variant.id)

            prefix = sku.split('-')[0][:4].upper()
            for _ in range(v_stock):
                code = generate_key_code(prefix)
                while DigitalKey.objects.filter(code=code).exists():
                    code = generate_key_code(prefix)
                DigitalKey.objects.create(variant=variant, code=code, status='available')

            variant.sync_stock()

    # Delete variations belonging to this product that were removed by the seller
    if submitted_ids:
        ProductVariant.objects.filter(product=prod).exclude(id__in=submitted_ids).delete()


class VendorProductDetailUpdateView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication, BasicAuthentication, JWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk):
        try:
            return Product.objects.prefetch_related('variants', 'vendor', 'category').get(pk=pk)
        except Product.DoesNotExist:
            return None

    def get(self, request, pk):
        prod = self.get_object(pk)
        if not prod:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProductDetailSerializer(prod).data)

    def put(self, request, pk):
        return self._update(request, pk)

    def patch(self, request, pk):
        return self._update(request, pk)

    def _update(self, request, pk):
        prod = self.get_object(pk)
        if not prod:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        for field in ['name', 'brand', 'manufacturer', 'description', 'base_price', 'cover_image', 'is_active']:
            if field in data:
                setattr(prod, field, data[field])

        if 'about_this_item' in data:
            about = data['about_this_item']
            if isinstance(about, str):
                about = [line.strip() for line in about.split('\n') if line.strip()]
            prod.about_this_item = about

        if 'category_id' in data:
            cat = Category.objects.filter(pk=data['category_id']).first()
            if cat:
                prod.category = cat

        prod.save()

        if 'variants' in data:
            save_or_update_product_variants(prod, data['variants'])

        prod.refresh_from_db()
        return Response(ProductDetailSerializer(prod).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        prod = self.get_object(pk)
        if not prod:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        product_name = prod.name
        prod.delete()
        return Response({
            'message': f"Product '{product_name}' deleted successfully.",
            'id': pk
        }, status=status.HTTP_200_OK)
