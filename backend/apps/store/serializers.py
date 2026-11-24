from rest_framework import serializers
from .models import Vendor, Category, Product, ProductVariant, DigitalKey


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'sku', 'attributes', 'price', 'price_credits', 'stock_count']
        read_only_fields = ['price_credits']


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ProductVariant
        fields = ['id', 'sku', 'attributes', 'price', 'price_credits', 'stock_count', 'name']
        read_only_fields = ['price_credits']
        extra_kwargs = {
            'sku': {'required': False},
            'price': {'required': False},
            'stock_count': {'required': False},
        }


class ProductWriteSerializer(serializers.ModelSerializer):
    variants = ProductVariantWriteSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'brand', 'manufacturer', 'description', 'about_this_item',
            'base_price', 'cover_image', 'is_active', 'category', 'variants'
        ]
        read_only_fields = ['id']


class VendorSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Vendor
        fields = ['id', 'name', 'slug', 'description', 'logo', 'is_active', 'product_count']


class ProductListSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'brand', 'manufacturer', 'description', 'about_this_item', 'base_price',
            'cover_image', 'is_digital', 'is_active', 'vendor',
            'category', 'variants', 'in_stock'
        ]

    def get_in_stock(self, obj):
        return any(v.stock_count > 0 for v in obj.variants.all())


class ProductDetailSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'brand', 'manufacturer', 'description', 'about_this_item', 'base_price',
            'cover_image', 'is_digital', 'is_active', 'vendor',
            'category', 'variants', 'created_at'
        ]
