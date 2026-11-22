from django.urls import path
from .views import (
    VendorOrderListView,
    VendorSalesOverviewView,
)

urlpatterns = [
    # Vendor Orders & Sales
    path('vendor/orders/', VendorOrderListView.as_view(), name='vendor-orders'),
    path('vendor/sales/', VendorSalesOverviewView.as_view(), name='vendor-sales'),
]
