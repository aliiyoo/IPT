from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase


class LoginTokenTests(APITestCase):
	def test_password_login_returns_access_token(self):
		User.objects.create_user(
			username='email-customer',
			email='customer@example.com',
			password='test-password',
		)

		response = self.client.post(
			'/api/auth/login/',
			{'username': 'email-customer', 'password': 'test-password'},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data['access'])
		self.assertEqual(response.data['user']['email'], 'customer@example.com')


class GoogleLoginSessionTests(APITestCase):
	def test_google_login_succeeds_with_existing_session_cookie(self):
		user = User.objects.create_user(
			username='google-customer',
			email='google@example.com',
		)
		client = APIClient(enforce_csrf_checks=True)
		client.force_login(user)

		with patch('apps.accounts.google_auth.google_id_token.verify_oauth2_token') as verify_token:
			verify_token.return_value = {
				'email': 'google@example.com',
				'given_name': 'Google',
				'family_name': 'Customer',
			}
			response = client.post(
				'/api/auth/google/',
				{'credential': 'test-google-credential'},
				format='json',
			)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data['access'])
		self.assertEqual(response['Cross-Origin-Opener-Policy'], 'same-origin-allow-popups')
