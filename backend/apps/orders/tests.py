from django.test import TestCase
from django.contrib.auth.models import AnonymousUser, User

from .views import _resolve_checkout_customer


class CheckoutCustomerResolutionTests(TestCase):
	def test_email_match_avoids_username_collision(self):
		existing_user = User.objects.create_user(
			username='alex',
			email='other@example.com',
		)

		customer, email = _resolve_checkout_customer(
			AnonymousUser(),
			'alex@example.com',
		)

		self.assertNotEqual(customer.pk, existing_user.pk)
		self.assertEqual(customer.email, 'alex@example.com')
		self.assertEqual(email, 'alex@example.com')

	def test_authenticated_account_email_takes_precedence(self):
		account = User.objects.create_user(
			username='google-user',
			email='google@example.com',
		)

		customer, email = _resolve_checkout_customer(
			account,
			'different@example.com',
		)

		self.assertEqual(customer, account)
		self.assertEqual(email, 'google@example.com')
