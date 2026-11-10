from django.urls import path
from .views import (
    OrderListView,
    OrderDetailView,
    CheckoutView,
    PayMongoWebhookView,
    RefundOrderView,
    SimulatePaymentView,
    VendorOrderListView,
    VendorSalesOverviewView,
)

urlpatterns = [
    # Customer Orders & Checkout
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<int:pk>/refund/', RefundOrderView.as_view(), name='order-refund'),
    path('orders/<int:pk>/simulate-payment/', SimulatePaymentView.as_view(), name='order-simulate-payment'),

    # Webhook
    path('webhooks/paymongo/', PayMongoWebhookView.as_view(), name='paymongo-webhook'),

    # Vendor Orders & Sales
    path('vendor/orders/', VendorOrderListView.as_view(), name='vendor-orders'),
    path('vendor/sales/', VendorSalesOverviewView.as_view(), name='vendor-sales'),
]
