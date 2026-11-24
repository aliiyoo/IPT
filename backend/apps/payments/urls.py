from django.urls import path

from .views import (
    CheckoutSessionView,
    CheckoutView,
    GatewaySessionView,
    PaymentOrderDetailView,
    PaymentOrderListView,
    PaymentWebhookView,
    RefundPaymentOrderView,
    ResendKeyEmailView,
    SimulatePaymentView,
    WalletView,
)

urlpatterns = [
    path('wallet/', WalletView.as_view(), name='payment-wallet'),
    path('checkout/', CheckoutView.as_view(), name='payment-checkout'),
    path('checkout/<uuid:session_id>/', CheckoutSessionView.as_view(), name='payment-checkout-session'),
    path('webhooks/payment/<str:provider_name>/', PaymentWebhookView.as_view(), name='payment-webhook'),
    path('gateway/sessions/<uuid:session_id>/', GatewaySessionView.as_view(), name='custom-gateway-session'),
    path('gateway/sessions/<uuid:session_id>/simulate-payment/', SimulatePaymentView.as_view(), name='custom-simulate-payment'),
    path('orders/', PaymentOrderListView.as_view(), name='payment-order-list'),
    path('orders/<uuid:pk>/', PaymentOrderDetailView.as_view(), name='payment-order-detail'),
    path('orders/<uuid:pk>/resend-key-email/', ResendKeyEmailView.as_view(), name='payment-order-resend-email'),
    path('orders/<uuid:pk>/refund/', RefundPaymentOrderView.as_view(), name='payment-order-refund'),
]