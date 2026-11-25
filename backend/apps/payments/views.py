import json
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError
from django.http import Http404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.store.models import ProductVariant
from .email_api import deliver_key_email
from .models import CheckoutSession, EmailDeliveryLog, PaymentOrder, Wallet
from .providers import get_payment_provider
from .providers.custom import AlreadyPaidError
from .services import (
    InsufficientCreditsError,
    create_checkout_session,
    process_payment_webhook,
)


class WalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'balance': 5000})
        return Response({'balance': wallet.balance, 'currency': 'credits'})


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'payment_checkout'

    def post(self, request):
        product_id = request.data.get('productId')
        idempotency_key = request.headers.get('Idempotency-Key', '').strip()
        if not idempotency_key or len(idempotency_key) > 255:
            return Response({'error': 'A valid Idempotency-Key header is required.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_quantity = request.data.get('quantity', 1)
        try:
            parsed_quantity = Decimal(str(raw_quantity))
            if isinstance(raw_quantity, bool) or not parsed_quantity.is_finite() or parsed_quantity != parsed_quantity.to_integral_value():
                raise InvalidOperation
            quantity = int(parsed_quantity)
        except (InvalidOperation, TypeError, ValueError, OverflowError):
            return Response({'error': 'Quantity must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1 or quantity > 99:
            return Response({'error': 'Quantity must be between 1 and 99.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            variant = ProductVariant.objects.select_related('product').get(
                pk=product_id,
                product__is_active=True,
                product__is_digital=True,
            )
        except (ProductVariant.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Active digital product variant was not found.'}, status=status.HTTP_404_NOT_FOUND)

        if variant.price_credits <= 0:
            return Response({'error': 'This product has an invalid credit price.'}, status=status.HTTP_400_BAD_REQUEST)

        if variant.stock_count < quantity:
            return Response({
                'error': f'Sorry, {variant.product.name} is out of stock.' if variant.stock_count <= 0 else f'Sorry, only {variant.stock_count} keys left in stock.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = create_checkout_session(
                user=request.user,
                variant=variant,
                quantity=quantity,
                idempotency_key=idempotency_key,
            )
        except InsufficientCreditsError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except IntegrityError:
            session = CheckoutSession.objects.filter(
                user=request.user,
                idempotency_key=idempotency_key,
            ).first()
            if not session:
                return Response({'error': 'Could not create checkout session.'}, status=status.HTTP_409_CONFLICT)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'sessionId': str(session.pk),
            'checkoutUrl': session.checkout_url,
            'creditsRequired': session.credits_required,
            'expiresAt': session.expires_at,
            'provider': session.provider,
        }, status=status.HTTP_201_CREATED)


class CheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, session_id):
        session = self._get_session(request, session_id)
        wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'balance': 5000})
        order = getattr(session, 'order', None)
        return Response({
            'sessionId': str(session.pk),
            'provider': session.provider,
            'status': session.status,
            'productName': session.product.product.name,
            'variant': session.product.attributes,
            'quantity': session.quantity,
            'creditsRequired': session.credits_required,
            'walletBalance': wallet.balance,
            'expiresAt': session.expires_at,
            'orderId': str(order.pk) if order else None,
            'keyDeliveryStatus': order.email_delivery.status if order else None,
        })

    @staticmethod
    def _get_session(request, session_id):
        try:
            return CheckoutSession.objects.select_related('product__product').get(
                pk=session_id,
                user=request.user,
            )
        except CheckoutSession.DoesNotExist as exc:
            raise Http404 from exc


class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'payment_webhook'

    def post(self, request, provider_name):
        try:
            result = process_payment_webhook(
                provider_name,
                request.body,
                dict(request.headers),
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception:
            return Response({'error': 'Webhook processing failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'received': True, **result}, status=status.HTTP_200_OK)


class GatewaySessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, session_id):
        session = CheckoutSessionView._get_session(request, session_id)
        if session.provider != 'custom':
            return Response({'error': 'This gateway endpoint is only available for custom sessions.'}, status=status.HTTP_400_BAD_REQUEST)
        provider_state = get_payment_provider().get_session(session.provider_session_id)
        wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'balance': 5000})
        return Response({
            'sessionId': str(session.pk),
            'status': provider_state['status'],
            'customerName': request.user.get_full_name() or request.user.username,
            'customerEmail': request.user.email,
            'productName': session.product.product.name,
            'quantity': session.quantity,
            'creditsRequired': session.credits_required,
            'walletBalance': wallet.balance,
            'expiresAt': session.expires_at,
        })


class SimulatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'payment_checkout'

    def post(self, request, session_id):
        try:
            session = CheckoutSession.objects.get(pk=session_id, user=request.user, provider='custom')
        except CheckoutSession.DoesNotExist as exc:
            raise Http404 from exc
        verified_location = (request.data.get('verifiedLocation') or '').strip()
        if verified_location:
            metadata = dict(session.metadata or {})
            metadata['verifiedLocation'] = verified_location
            session.metadata = metadata
            session.save(update_fields=['metadata'])
        try:
            signed_webhook = get_payment_provider().simulate_payment(session.provider_session_id)
        except AlreadyPaidError as exc:
            return Response({'error': str(exc), 'status': 'paid'}, status=status.HTTP_409_CONFLICT)
        except (LookupError, ValueError) as exc:
            return Response({'error': str(exc)}, status=status.HTTP_409_CONFLICT)

        try:
            result = process_payment_webhook('custom', signed_webhook.raw_body, signed_webhook.headers)
        except Exception:
            return Response({'error': 'Simulated payment could not be processed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({
            'status': result['status'],
            'orderId': result['order_id'],
            'duplicate': result['duplicate'],
        })


class PaymentOrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, pk):
        try:
            order = PaymentOrder.objects.select_related(
                'product__product', 'session', 'email_delivery'
            ).get(pk=pk, user=request.user)
        except PaymentOrder.DoesNotExist as exc:
            raise Http404 from exc
        email = request.user.email or ''
        masked_email = _mask_email(email)
        return Response({
            'id': str(order.pk),
            'status': order.status,
            'productName': order.product.product.name,
            'variant': order.product.attributes,
            'quantity': order.quantity,
            'creditsSpent': order.credits_spent,
            'keyDeliveryStatus': order.email_delivery.status,
            'maskedEmail': masked_email,
            'createdAt': order.created_at,
        })


class PaymentOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        orders = PaymentOrder.objects.filter(user=request.user).select_related(
            'product__product', 'email_delivery'
        )
        email = _mask_email(request.user.email or '')
        return Response([{
            'id': str(order.pk),
            'status': order.status,
            'productName': order.product.product.name,
            'variant': order.product.attributes,
            'quantity': order.quantity,
            'creditsSpent': order.credits_spent,
            'keyDeliveryStatus': order.email_delivery.status,
            'maskedEmail': email,
            'createdAt': order.created_at,
        } for order in orders])


class ResendKeyEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request, pk):
        try:
            order = PaymentOrder.objects.select_related('user').get(pk=pk, user=request.user)
        except PaymentOrder.DoesNotExist as exc:
            raise Http404 from exc
        delivery_log = EmailDeliveryLog.objects.get(order=order)
        result = deliver_key_email(delivery_log)
        response_status = status.HTTP_200_OK if result.status == 'sent' else status.HTTP_502_BAD_GATEWAY
        return Response({'keyDeliveryStatus': result.status}, status=response_status)


class RefundPaymentOrderView(APIView):
    """
    POST /api/orders/<uuid:pk>/refund/
    - Verifies the order belongs to the logged-in user.
    - Verifies status is 'paid'.
    - Enforces the 3-day (72-hour) refund window.
    - Returns credits_spent to the user's Wallet.
    - Marks associated PaymentDigitalKeys as invalidated (deletes delivery record context).
    - Updates order status to 'refunded'.
    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request, pk):
        from django.db import transaction as db_transaction

        try:
            order = PaymentOrder.objects.select_related('session').get(pk=pk, user=request.user)
        except PaymentOrder.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Status check — only 'paid' orders can be refunded (refunded ones are already processed)
        if order.status != 'paid':
            return Response(
                {'error': 'Only paid orders can be refunded.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3-day window check
        age = timezone.now() - order.created_at
        if age.total_seconds() > 72 * 3600:
            return Response(
                {'error': 'Refund window expired. Refunds are only allowed within 3 days of purchase.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with db_transaction.atomic():
            # Return credits to wallet
            wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'balance': 0})
            wallet.balance += order.credits_spent
            wallet.save(update_fields=['balance'])

            # Invalidate digital keys: delete them so they cannot be revealed
            order.digital_keys.all().delete()

            # Mark order refunded
            order.status = 'refunded'
            order.save(update_fields=['status'])

            # Mark the checkout session as cancelled so stock is restored
            if order.session:
                order.session.status = 'cancelled'
                order.session.save(update_fields=['status'])

            # Restore stock on the product variant
            variant = order.product
            if variant:
                variant.sync_stock()

        email = request.user.email or ''
        masked_email = _mask_email(email)
        return Response({
            'message': 'Refund processed successfully. Your credits have been returned.',
            'new_balance': wallet.balance,
            'order': {
                'id': str(order.pk),
                'status': order.status,
                'productName': order.product.product.name,
                'quantity': order.quantity,
                'creditsSpent': order.credits_spent,
                'maskedEmail': masked_email,
                'createdAt': order.created_at,
            }
        }, status=status.HTTP_200_OK)


def _mask_email(email):
    if '@' not in email:
        return ''
    local, domain = email.split('@', 1)
    return f'{local[:1]}***@{domain}'