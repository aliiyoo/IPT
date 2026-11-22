import hashlib
import hmac
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import close_old_connections
from django.test import TestCase, TransactionTestCase, override_settings, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIClient

from apps.payments.crypto import decrypt_key
from apps.payments.email_api import deliver_key_email
from apps.payments.models import (
    CheckoutSession,
    CreditLedger,
    EmailDeliveryLog,
    PaymentDigitalKey,
    PaymentOrder,
    Wallet,
)
from apps.payments.providers.custom import CustomProvider
from apps.payments.providers.factory import reset_payment_provider
from apps.payments.services import process_payment_webhook
from apps.store.models import Category, Product, ProductVariant, Vendor


class PaymentFlowTestCase(TestCase):
    def setUp(self):
        reset_payment_provider()
        self.user = User.objects.create_user(
            username='credit-buyer',
            email='buyer@example.com',
            password='test-password',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        vendor = Vendor.objects.create(name='Test Vendor', slug='test-vendor')
        category = Category.objects.create(name='Test Category', slug='test-category')
        product = Product.objects.create(
            vendor=vendor,
            category=category,
            name='Test Digital Product',
            slug='test-digital-product',
            base_price='125.00',
            is_digital=True,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=product,
            sku='TEST-125',
            price='125.00',
            price_credits=125,
        )

    def create_checkout(self, key='checkout-test-1', quantity=1):
        return self.client.post(
            '/api/checkout/',
            {'productId': self.variant.pk, 'quantity': quantity},
            format='json',
            HTTP_IDEMPOTENCY_KEY=key,
        )

    def sign_custom_event(self, session, event_id='event-test-1', event_type='payment.paid'):
        payload = {
            'id': event_id,
            'type': event_type,
            'data': {
                'provider_session_id': session.provider_session_id,
                'reference_number': session.reference_number,
                'paid_at': timezone.now().isoformat(),
            },
        }
        raw_body = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
        signature = hmac.new(
            __import__('django.conf').conf.settings.GATEWAY_WEBHOOK_SECRET.encode('utf-8'),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return raw_body, {'X-Gateway-Signature': signature}


class CustomProviderFlowTests(PaymentFlowTestCase):
    def test_product_list_and_detail_return_peso_and_credit_variant_prices(self):
        list_response = self.client.get('/api/products/')
        detail_response = self.client.get(f'/api/products/{self.variant.product.slug}/')

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(detail_response.status_code, 200)
        listed_product = next(item for item in list_response.data if item['slug'] == self.variant.product.slug)
        list_variant = listed_product['variants'][0]
        detail_variant = detail_response.data['variants'][0]
        for variant in (list_variant, detail_variant):
            self.assertEqual(Decimal(str(variant['price'])), Decimal('125.00'))
            self.assertEqual(variant['price_credits'], 125)

    def test_creating_checkout_does_not_deduct_credits(self):
        response = self.create_checkout()

        self.assertEqual(response.status_code, 201)
        session = CheckoutSession.objects.get(pk=response.data['sessionId'])
        self.assertEqual(session.status, 'pending')
        self.assertEqual(Wallet.objects.get(user=self.user).balance, 5000)
        self.assertEqual(CreditLedger.objects.filter(reason='purchase').count(), 0)

    def test_gateway_summary_includes_authenticated_buyer_name_and_email(self):
        response = self.create_checkout()
        session_id = response.data['sessionId']

        gateway = self.client.get(f'/api/gateway/sessions/{session_id}/')

        self.assertEqual(gateway.status_code, 200)
        self.assertEqual(gateway.data['customerName'], 'credit-buyer')
        self.assertEqual(gateway.data['customerEmail'], 'buyer@example.com')
        self.assertEqual(gateway.data['walletBalance'], 5000)

    def test_checkout_with_login_session_and_bearer_token_avoids_session_csrf(self):
        client = APIClient()
        login = client.post(
            '/api/auth/login/',
            {'username': 'credit-buyer', 'password': 'test-password'},
            format='json',
        )
        self.assertEqual(login.status_code, 200)

        response = client.post(
            '/api/checkout/',
            {'productId': self.variant.pk, 'quantity': 1},
            format='json',
            HTTP_AUTHORIZATION=f"Bearer {login.data['access']}",
            HTTP_IDEMPOTENCY_KEY='session-and-jwt-checkout',
        )

        self.assertEqual(response.status_code, 201)

    @patch('apps.payments.services.deliver_key_email')
    def test_checkout_simulation_deducts_credits_once_and_hides_key(self, send_email):
        response = self.create_checkout()
        self.assertEqual(response.status_code, 201)
        session_id = response.data['sessionId']
        self.assertIn(f'/pay/{session_id}', response.data['checkoutUrl'])
        self.assertEqual(response.data['creditsRequired'], 125)

        payment = self.client.post(f'/api/gateway/sessions/{session_id}/simulate-payment/')
        self.assertEqual(payment.status_code, 200)
        self.assertEqual(payment.data['status'], 'paid')
        self.assertEqual(PaymentOrder.objects.count(), 1)
        self.assertEqual(Wallet.objects.get(user=self.user).balance, 4875)
        self.assertEqual(CreditLedger.objects.filter(reason='purchase').count(), 1)
        self.assertEqual(PaymentDigitalKey.objects.count(), 1)
        send_email.assert_called_once()

        raw_key = decrypt_key(PaymentDigitalKey.objects.get().key_encrypted)
        order_response = self.client.get(f"/api/orders/{payment.data['orderId']}/")
        self.assertEqual(order_response.status_code, 200)
        self.assertNotIn(raw_key, json.dumps(order_response.data, default=str))
        order_list_response = self.client.get('/api/orders/')
        self.assertEqual(order_list_response.status_code, 200)
        self.assertEqual(len(order_list_response.data), 1)
        self.assertNotIn(raw_key, json.dumps(order_list_response.data, default=str))

        duplicate = self.client.post(f'/api/gateway/sessions/{session_id}/simulate-payment/')
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(Wallet.objects.get(user=self.user).balance, 4875)
        self.assertEqual(PaymentOrder.objects.count(), 1)

    @patch('apps.payments.services.deliver_key_email')
    def test_checkout_idempotency_returns_same_session(self, send_email):
        first = self.create_checkout('same-key')
        second = self.create_checkout('same-key')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.data['sessionId'], second.data['sessionId'])
        self.assertEqual(CheckoutSession.objects.count(), 1)

    def test_checkout_rejects_fractional_quantity_and_ignores_client_price(self):
        invalid_quantity = self.client.post(
            '/api/checkout/',
            {'productId': self.variant.pk, 'quantity': 1.5},
            format='json',
            HTTP_IDEMPOTENCY_KEY='fractional-quantity',
        )
        self.assertEqual(invalid_quantity.status_code, 400)

        response = self.client.post(
            '/api/checkout/',
            {'productId': self.variant.pk, 'quantity': 1, 'creditsRequired': 1},
            format='json',
            HTTP_IDEMPOTENCY_KEY='client-price-tamper',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['creditsRequired'], 125)

    @patch('apps.payments.services.deliver_key_email')
    def test_duplicate_webhook_event_is_acknowledged_without_second_debit(self, send_email):
        response = self.create_checkout()
        session = CheckoutSession.objects.get(pk=response.data['sessionId'])
        signed = CustomProvider().simulate_payment(session.provider_session_id)

        first = process_payment_webhook('custom', signed.raw_body, signed.headers)
        second = process_payment_webhook('custom', signed.raw_body, signed.headers)

        self.assertEqual(first['status'], 'paid')
        self.assertTrue(second['duplicate'])
        self.assertEqual(PaymentOrder.objects.count(), 1)
        self.assertEqual(Wallet.objects.get(user=self.user).balance, 4875)

    @patch('apps.payments.services.deliver_key_email')
    def test_expired_session_webhook_is_noop(self, send_email):
        response = self.create_checkout()
        session = CheckoutSession.objects.get(pk=response.data['sessionId'])
        session.expires_at = timezone.now() - timedelta(seconds=1)
        session.save(update_fields=['expires_at'])
        raw_body, headers = self.sign_custom_event(session)

        result = process_payment_webhook('custom', raw_body, headers)

        session.refresh_from_db()
        self.assertEqual(result['status'], 'expired')
        self.assertEqual(session.status, 'expired')
        self.assertEqual(Wallet.objects.get(user=self.user).balance, 5000)
        self.assertEqual(PaymentOrder.objects.count(), 0)

    @patch('apps.payments.services.deliver_key_email')
    def test_insufficient_balance_at_payment_time_fails_without_order(self, send_email):
        response = self.create_checkout()
        session = CheckoutSession.objects.get(pk=response.data['sessionId'])
        Wallet.objects.filter(user=self.user).update(balance=0)
        signed = CustomProvider().simulate_payment(session.provider_session_id)

        result = process_payment_webhook('custom', signed.raw_body, signed.headers)

        session.refresh_from_db()
        self.assertEqual(result['status'], 'insufficient_credits')
        self.assertEqual(session.status, 'failed')
        self.assertEqual(PaymentOrder.objects.count(), 0)
        self.assertEqual(CreditLedger.objects.filter(reason='purchase').count(), 0)

    def test_invalid_custom_signature_is_rejected(self):
        response = self.create_checkout()
        session = CheckoutSession.objects.get(pk=response.data['sessionId'])
        raw_body, _ = self.sign_custom_event(session)

        response = self.client.generic(
            'POST',
            '/api/webhooks/payment/custom/',
            data=raw_body,
            content_type='application/json',
            HTTP_X_GATEWAY_SIGNATURE='invalid',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(session.status, 'pending')
        self.assertEqual(PaymentOrder.objects.count(), 0)


@override_settings(
    PAYMENT_PROVIDER='paymongo',
    PAYMONGO_SECRET_KEY='sk_test_unit_test',
    PAYMONGO_WEBHOOK_SECRET='paymongo-test-secret',
)
class PayMongoProviderFlowTests(PaymentFlowTestCase):
    def tearDown(self):
        reset_payment_provider()

    @patch('apps.payments.services.deliver_key_email')
    @patch('apps.payments.providers.paymongo.requests.post')
    def test_paymongo_v2_checkout_and_paid_webhook(self, mock_post, send_email):
        expires_at = (timezone.now() + timedelta(minutes=20)).isoformat()
        mock_post.return_value = SimpleNamespace(
            status_code=201,
            json=lambda: {
                'data': {
                    'id': 'cs_test_checkout_1',
                    'attributes': {
                        'checkout_url': 'https://paymongo.test/checkout/1',
                        'expires_at': expires_at,
                    },
                },
            },
        )
        response = self.create_checkout()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['checkoutUrl'], 'https://paymongo.test/checkout/1')
        payload = mock_post.call_args.kwargs['json']['data']['attributes']
        self.assertEqual(payload['payment_method_types'], ['card', 'gcash', 'paymaya'])
        self.assertEqual(payload['reference_number'], CheckoutSession.objects.get().reference_number)

        session = CheckoutSession.objects.get(pk=response.data['sessionId'])
        event_payload = {
            'data': {
                'id': 'evt_test_paid_1',
                'attributes': {
                    'type': 'checkout_session.payment.paid',
                    'data': {
                        'id': session.provider_session_id,
                        'attributes': {'reference_number': session.reference_number},
                    },
                },
            },
        }
        raw_body = json.dumps(event_payload, separators=(',', ':')).encode('utf-8')
        timestamp = '1794912000'
        signature = hmac.new(
            b'paymongo-test-secret',
            timestamp.encode('utf-8') + b'.' + raw_body,
            hashlib.sha256,
        ).hexdigest()
        webhook = self.client.generic(
            'POST',
            '/api/webhooks/payment/paymongo/',
            data=raw_body,
            content_type='application/json',
            HTTP_PAYMONGO_SIGNATURE=f't={timestamp},te={signature}',
        )

        self.assertEqual(webhook.status_code, 200)
        self.assertEqual(webhook.data['status'], 'paid')
        self.assertEqual(Wallet.objects.get(user=self.user).balance, 4875)
        self.assertEqual(PaymentOrder.objects.count(), 1)
        send_email.assert_called_once()

    def test_paymongo_rejects_live_secret_key(self):
        from django.core.exceptions import ImproperlyConfigured
        from django.test import override_settings
        from apps.payments.providers.factory import initialize_payment_provider

        with override_settings(
            PAYMENT_PROVIDER='paymongo',
            PAYMONGO_SECRET_KEY='sk_live_not_allowed',
            PAYMONGO_WEBHOOK_SECRET='secret',
        ):
            reset_payment_provider()
            with self.assertRaises(ImproperlyConfigured):
                initialize_payment_provider()


@override_settings(
    EMAIL_API_BASE_URL='https://email-api.test',
    EMAIL_API_KEY='test-service-token',
)
class EmailDeliveryTests(PaymentFlowTestCase):
    @patch('apps.payments.services.deliver_key_email')
    def create_paid_order(self, send_email, quantity=1):
        response = self.create_checkout(quantity=quantity)
        session = CheckoutSession.objects.get(pk=response.data['sessionId'])
        signed = CustomProvider().simulate_payment(session.provider_session_id)
        result = process_payment_webhook('custom', signed.raw_body, signed.headers)
        return EmailDeliveryLog.objects.get(order_id=result['order_id'])

    @patch('apps.payments.email_api.requests.post')
    @patch('apps.payments.services.deliver_key_email')
    def test_email_failure_can_retry_with_same_idempotency_key(self, ignored_send, mock_post):
        delivery_log = self.create_paid_order()
        mock_post.side_effect = [
            SimpleNamespace(status_code=503),
            SimpleNamespace(status_code=202),
        ]

        failed = deliver_key_email(delivery_log)
        idempotency_key = failed.idempotency_key
        sent = deliver_key_email(failed)

        self.assertEqual(failed.status, 'failed')
        self.assertEqual(sent.status, 'sent')
        self.assertEqual(sent.attempts, 2)
        self.assertEqual(mock_post.call_count, 2)
        self.assertEqual(mock_post.call_args_list[0].kwargs['json']['idempotencyKey'], idempotency_key)
        self.assertEqual(mock_post.call_args_list[1].kwargs['json']['idempotencyKey'], idempotency_key)
        sent.digital_key.refresh_from_db()
        self.assertIsNotNone(sent.digital_key.delivered_at)

    @patch('apps.payments.email_api.requests.post')
    @patch('apps.payments.services.deliver_key_email')
    def test_already_sent_email_is_not_sent_again(self, ignored_send, mock_post):
        delivery_log = self.create_paid_order()
        mock_post.return_value = SimpleNamespace(status_code=202)
        sent = deliver_key_email(delivery_log)
        deliver_key_email(sent)
        self.assertEqual(mock_post.call_count, 1)

    @patch('apps.payments.email_api.requests.post')
    @patch('apps.payments.services.deliver_key_email')
    def test_quantity_creates_multiple_keys_in_one_email(self, ignored_send, mock_post):
        delivery_log = self.create_paid_order(quantity=2)
        mock_post.return_value = SimpleNamespace(status_code=202)
        keys = list(delivery_log.order.digital_keys.all())

        sent = deliver_key_email(delivery_log)

        self.assertEqual(len(keys), 2)
        self.assertEqual(mock_post.call_count, 1)
        message_body = mock_post.call_args.kwargs['json']['body']
        for key in keys:
            self.assertIn(decrypt_key(key.key_encrypted), message_body)
        self.assertEqual(mock_post.call_args.kwargs['json']['idempotencyKey'], f'key-email:{delivery_log.order_id}')
        self.assertEqual(sent.status, 'sent')
        self.assertEqual(delivery_log.order.digital_keys.filter(delivered_at__isnull=False).count(), 2)

    @override_settings(
        EMAIL_API_BASE_URL='',
        EMAIL_API_KEY='',
        EMAIL_HOST_USER='sender@example.com',
        EMAIL_HOST_PASSWORD='test-app-password',
    )
    @patch('apps.payments.services.deliver_key_email')
    @patch('apps.integrations.email_service.smtplib.SMTP_SSL')
    def test_gmail_smtp_fallback_sends_key_when_email_api_is_unconfigured(self, mock_smtp, ignored_send):
        delivery_log = self.create_paid_order()
        smtp_server = mock_smtp.return_value.__enter__.return_value

        result = deliver_key_email(delivery_log)

        self.assertEqual(result.status, 'sent')
        self.assertEqual(mock_smtp.call_args.args[:2], ('smtp.gmail.com', 465))
        smtp_server.login.assert_called_once_with('sender@example.com', 'test-app-password')
        message = smtp_server.send_message.call_args.args[0]
        self.assertEqual(message['To'], 'buyer@example.com')
        plain_part = message.get_body(preferencelist=('plain',))
        html_part = message.get_body(preferencelist=('html',))
        raw_key = decrypt_key(delivery_log.digital_key.key_encrypted)
        self.assertIn(raw_key, plain_part.get_content())
        self.assertEqual(html_part.get_content_type(), 'text/html')
        self.assertIn(raw_key, html_part.get_content())
        self.assertIn('background:#fff0f5', html_part.get_content())


@skipUnlessDBFeature('has_select_for_update')
class ConcurrentWebhookTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        reset_payment_provider()
        self.user = User.objects.create_user(username='concurrent-buyer', email='concurrent@example.com')
        vendor = Vendor.objects.create(name='Concurrent Vendor', slug='concurrent-vendor')
        category = Category.objects.create(name='Concurrent Category', slug='concurrent-category')
        product = Product.objects.create(
            vendor=vendor,
            category=category,
            name='Concurrent Product',
            slug='concurrent-product',
            base_price='100.00',
        )
        variant = ProductVariant.objects.create(product=product, sku='CONCURRENT-1', price='100.00', price_credits=100)
        from apps.payments.services import create_checkout_session
        self.session = create_checkout_session(
            user=self.user,
            variant=variant,
            quantity=1,
            idempotency_key='concurrent-session',
        )

    @patch('apps.payments.services.deliver_key_email')
    def test_concurrent_distinct_webhooks_only_debit_once(self, send_email):
        provider = CustomProvider()
        signed_events = [
            provider.simulate_payment(self.session.provider_session_id),
            provider.simulate_payment(self.session.provider_session_id),
        ]

        def process(signed):
            close_old_connections()
            try:
                return process_payment_webhook('custom', signed.raw_body, signed.headers)
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(process, signed_events))

        self.assertEqual(PaymentOrder.objects.count(), 1)
        self.assertEqual(Wallet.objects.get(user=self.user).balance, 4900)
        self.assertEqual(CreditLedger.objects.filter(reason='purchase').count(), 1)