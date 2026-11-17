"""
backend/apps/accounts/google_auth.py
"""
import os
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.serializers import UserSerializer


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        if not credential:
            return Response({'error': 'No credential provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Hardcoded Client ID to bypass .env issues
        client_id = '1028729362676-i0i69o9svm56nnu5t5cd0p5he4srkmp0.apps.googleusercontent.com'

        try:
            idinfo = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
                clock_skew_in_seconds=10,
            )
        except ValueError as e:
            return Response({'error': f'Invalid Google token: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        google_email = idinfo.get('email', '').lower()
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')

        if not google_email:
            return Response({'error': 'No email returned from Google.'}, status=status.HTTP_400_BAD_REQUEST)

        base_username = google_email.split('@')[0].replace('.', '_').replace('-', '_')

        # --- FIXED USER LOOKUP LOGIC ---
        # Safely find the user without crashing if duplicate emails exist
        user = User.objects.filter(email=google_email).first()
        created = False

        if not user:
            # Ensure username is unique before creating a new user
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create(
                email=google_email,
                username=username,
                first_name=first_name,
                last_name=last_name,
            )
            created = True
        else:
            # Update name fields in case they changed in Google profile
            if first_name and user.first_name != first_name:
                user.first_name = first_name
            if last_name and user.last_name != last_name:
                user.last_name = last_name
            user.save(update_fields=['first_name', 'last_name'])
        # -------------------------------

        if created:
            user.set_unusable_password()
            user.save()

        # Ensure Profile exists and has role set
        profile = user.profile
        if created:
            profile.role = 'customer'
            profile.save(update_fields=['role'])

        user_data = UserSerializer(user).data
        user_data['role'] = profile.role
        user_data['is_seller'] = profile.role in ('vendor', 'seller')
        if profile.vendor:
            user_data['vendor'] = {
                'id': profile.vendor.id,
                'name': profile.vendor.name,
                'slug': profile.vendor.slug,
            }

        tokens = get_tokens_for_user(user)

        return Response({
            'message': 'Google login successful',
            'user': user_data,
            **tokens,
        })