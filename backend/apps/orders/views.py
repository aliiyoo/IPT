import json
import logging
from decimal import Decimal
from django.db import transaction
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count

from apps.store.models import ProductVariant, DigitalKey
from .models import Order, OrderItem, RefundRequest
from .serializers import OrderListSerializer, OrderDetailSerializer, RefundRequestSerializer
from .services import fulfill_order
from apps.integrations.paymongo import PayMongoClient, PayMongoError

logger = logging.getLogger(__name__)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Allow looking up order by ID for confirmation pages
        return Order.objects.all()


class CheckoutView(APIView):
    """
    POST /api/checkout/
    Accepts:
    {
      "items": [{"variant_id": 1, "quantity": 1}],
      "email": "customer@example.com",
      "name": "Jane Doe",
      "success_url": "http://localhost:8443/checkout/success",
      "cancel_url": "http://localhost:8443/cart"
    }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        items_data = request.data.get('items', [])
        if not items_data:
            return Response({'error': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        customer = request.user if request.user.is_authenticated else None
        customer_email = request.data.get('email') or (customer.email if customer else 'customer@example.com')
        customer_name = request.data.get('name') or (customer.username if customer else 'PixelPink Guest')

        if not customer:
            customer, _ = User.objects.get_or_create(
                username=customer_email.split('@')[0],
                defaults={'email': customer_email}
            )

        success_url = request.data.get('success_url')
        cancel_url = request.data.get('cancel_url')

        try:
            with transaction.atomic():
                order = Order.objects.create(
                    customer=customer,
                    status='pending',
                    total=Decimal('0.00')
                )

                total_amount = Decimal('0.00')
                line_items_for_paymongo = []

                for entry in items_data:
                    variant_id = entry.get('variant_id')
                    quantity = int(entry.get('quantity', 1))

                    try:
                        variant = ProductVariant.objects.select_related('product', 'product__vendor').get(pk=variant_id)
                    except ProductVariant.DoesNotExist:
                        return Response({'error': f'Variant #{variant_id} does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

                    # Stock check
                    if variant.stock_count < quantity:
                        return Response({
                            'error': f'Sorry, {variant.product.name} ({variant.sku}) only has {variant.stock_count} keys left.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    subtotal = variant.price * quantity
                    total_amount += subtotal

                    attr_str = ", ".join(f"{k}: {v}" for k, v in variant.attributes.items())
                    snapshot_name = f"{variant.product.name} ({attr_str})" if attr_str else variant.product.name

                    OrderItem.objects.create(
                        order=order,
                        variant=variant,
                        quantity=quantity,
                        unit_price=variant.price,
                        snapshot_name=snapshot_name
                    )

                    line_items_for_paymongo.append({
                        'name': snapshot_name,
                        'price': variant.price,
                        'quantity': quantity,
                        'description': f"Digital license code fulfilled by {variant.product.vendor.name}"
                    })

                order.total = total_amount
                order.save(update_fields=['total'])

            # Call PayMongo Checkout Session API
            paymongo = PayMongoClient()
            session = paymongo.create_checkout_session(
                order=order,
                line_items=line_items_for_paymongo,
                success_url=success_url,
                cancel_url=cancel_url
            )

            order.paymongo_session_id = session.get('id')
            order.save(update_fields=['paymongo_session_id'])

            return Response({
                'order_id': order.id,
                'checkout_url': session.get('checkout_url'),
                'session_id': session.get('id'),
                'total': str(order.total)
            }, status=status.HTTP_201_CREATED)

        except PayMongoError as pe:
            logger.error(f"PayMongo Error: {pe}")
            return Response({'error': str(pe)}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Checkout error: {e}")
            return Response({'error': f'Checkout failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PayMongoWebhookView(APIView):
    """
    POST /api/webhooks/paymongo/
    Receives events from PayMongo (e.g. checkout_session.payment.paid).
    Verifies signature and triggers order fulfillment.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        signature_header = request.META.get('HTTP_PAYMONGO_SIGNATURE', '')
        raw_body = request.body

        paymongo = PayMongoClient()
        if not paymongo.verify_webhook_signature(raw_body, signature_header):
            logger.warning("PayMongo webhook signature verification failed.")
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = json.loads(raw_body.decode('utf-8'))
            data = event.get('data', {})
            attributes = data.get('attributes', {})
            event_type = attributes.get('type')

            logger.info(f"Received PayMongo webhook event: {event_type}")

            if event_type == 'checkout_session.payment.paid':
                resource_data = attributes.get('data', {})
                session_id = resource_data.get('id')
                payments = resource_data.get('attributes', {}).get('payments', [])
                payment_id = payments[0].get('id') if payments else None

                # Find order by session id
                order = Order.objects.filter(paymongo_session_id=session_id).first()
                if order:
                    fulfill_order(order, paymongo_payment_id=payment_id)
                    logger.info(f"Order #{order.id} fulfilled successfully from webhook!")
                    return Response({'status': 'fulfilled', 'order_id': order.id})
                else:
                    logger.warning(f"No order found with PayMongo session id: {session_id}")

            return Response({'status': 'received'})

        except Exception as e:
            logger.error(f"Error handling PayMongo webhook: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SimulatePaymentView(APIView):
    """
    POST /api/orders/<id>/simulate-payment/
    Convenience endpoint for local/demo testing without real webhooks.
    Marks the order paid and allocates keys immediately.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
            fulfill_order(order, paymongo_payment_id=f"pay_simulated_{order.id}")
            return Response({
                'message': 'Order simulated as paid and fulfilled.',
                'order': OrderDetailSerializer(order).data
            })
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)


class RefundOrderView(APIView):
    """
    POST /api/orders/<id>/refund/
    Submits or processes refund via PayMongo Refund API.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', 'Customer requested digital key refund')

        # Check eligibility: order must be paid/fulfilled
        if order.status not in ('paid', 'fulfilled'):
            return Response({'error': 'Only paid or fulfilled orders can be refunded.'}, status=status.HTTP_400_BAD_REQUEST)

        # Call PayMongo Refund API if payment_id is present
        paymongo_refund_id = None
        if order.paymongo_payment_id:
            try:
                paymongo = PayMongoClient()
                refund_res = paymongo.create_refund(
                    payment_id=order.paymongo_payment_id,
                    amount_cents=int(order.total * 100),
                    reason="requested_by_customer"
                )
                paymongo_refund_id = refund_res.get('id', 'ref_processed')
            except Exception as e:
                logger.error(f"PayMongo refund failed: {e}")
                # We can still proceed with local status update for demo
                paymongo_refund_id = f"ref_fallback_{order.id}"

        # Update digital keys to refunded
        for item in order.items.all():
            RefundRequest.objects.create(
                order_item=item,
                reason=reason,
                status='refunded',
                paymongo_refund_id=paymongo_refund_id
            )
            for key in item.digital_keys.all():
                key.status = 'refunded'
                key.save(update_fields=['status'])

            item.variant.sync_stock()

        order.status = 'refunded'
        order.save(update_fields=['status', 'updated_at'])

        return Response({
            'message': 'Order refunded successfully.',
            'order': OrderDetailSerializer(order).data
        })


# --- Vendor (Seller Center) Orders & Sales ---
class VendorOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        vendor = user.profile.vendor if hasattr(user, 'profile') else None
        if not vendor and not user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        items_qs = OrderItem.objects.all()
        if vendor:
            items_qs = items_qs.filter(variant__product__vendor=vendor)

        data = []
        for item in items_qs.select_related('order', 'variant', 'variant__product').order_by('-order__created_at')[:50]:
            data.append({
                'order_id': item.order.id,
                'customer': item.order.customer.username,
                'status': item.order.status,
                'product_name': item.snapshot_name,
                'quantity': item.quantity,
                'unit_price': str(item.unit_price),
                'total': str(item.subtotal),
                'date': item.order.created_at,
            })
        return Response(data)


class VendorSalesOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        vendor = user.profile.vendor if hasattr(user, 'profile') else None
        if not vendor and not user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        items_qs = OrderItem.objects.filter(order__status__in=['paid', 'fulfilled'])
        if vendor:
            items_qs = items_qs.filter(variant__product__vendor=vendor)

        total_revenue = items_qs.aggregate(rev=Sum('unit_price'))['rev'] or 0
        total_sales_count = items_qs.count()

        return Response({
            'vendor_name': vendor.name if vendor else 'All Vendors (Admin)',
            'total_revenue': float(total_revenue),
            'total_sales_count': total_sales_count,
        })
