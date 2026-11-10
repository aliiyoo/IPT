from django.urls import path
from .views import (
    CategoryListView,
    ProductListView,
    ProductDetailView,
    VendorListView,
    VendorDetailView,
    VendorProductListCreateView,
    VendorProductDetailUpdateView,
)

urlpatterns = [
    # Public
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('vendors/', VendorListView.as_view(), name='vendor-list'),
    path('vendors/<slug:slug>/', VendorDetailView.as_view(), name='vendor-detail'),

    # Vendor (Seller Center)
    path('vendor/products/', VendorProductListCreateView.as_view(), name='vendor-products'),
    path('vendor/products/<int:pk>/', VendorProductDetailUpdateView.as_view(), name='vendor-product-update'),
]
