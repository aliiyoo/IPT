from django.contrib import admin
from .models import Vendor, Category, Product, ProductVariant, DigitalKey


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'vendor', 'category', 'base_price', 'is_digital', 'is_active')
    list_filter = ('vendor', 'category', 'is_digital', 'is_active')
    search_fields = ('name', 'vendor__name')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('sku', 'product', 'price', 'stock_count')
    search_fields = ('sku', 'product__name')
    list_filter = ('product__vendor',)


@admin.register(DigitalKey)
class DigitalKeyAdmin(admin.ModelAdmin):
    list_display = ('variant', 'code', 'status', 'assigned_order_item', 'created_at')
    list_filter = ('status', 'variant__product__vendor')
    search_fields = ('code', 'variant__sku')
