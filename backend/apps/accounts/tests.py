from django.contrib.auth.models import User
from rest_framework.test import APITestCase


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
