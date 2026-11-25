from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import serializers
from .models import Profile
from apps.store.models import Vendor
from apps.store.serializers import VendorSerializer


class ProfileSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['role', 'vendor', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=['customer', 'vendor', 'seller'], default='customer', write_only=True)
    store_name = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'store_name']

    def validate(self, attrs):
        role = attrs.get('role', 'customer')
        store_name = (attrs.get('store_name') or '').strip()
        if role in ('vendor', 'seller') and not store_name:
            raise serializers.ValidationError({'store_name': 'Store Name is required for Seller accounts.'})
        return attrs

    def create(self, validated_data):
        raw_role = validated_data.pop('role', 'customer')
        role = 'vendor' if raw_role in ('vendor', 'seller') else 'customer'
        store_name = (validated_data.pop('store_name', '') or '').strip()
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
        )

        # Update profile role and create Vendor store if seller
        profile = user.profile
        profile.role = role
        if role == 'vendor':
            base_slug = slugify(store_name) or f"store-{user.id}"
            slug = base_slug
            suffix = 1
            while Vendor.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{suffix}"
                suffix += 1
            vendor = Vendor.objects.create(name=store_name, slug=slug)
            profile.vendor = vendor
        profile.save()

        return user
