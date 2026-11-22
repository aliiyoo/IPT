from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Existing PixelPink API
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.payments.urls')),
    path('api/', include('apps.store.urls')),
    path('api/', include('apps.orders.urls')),

    # dj-rest-auth endpoints: /api/auth/login/, /api/auth/logout/, /api/auth/user/, etc.
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),

    # allauth social login endpoints (handles Google OAuth callback)
    path('api/auth/social/', include('allauth.socialaccount.urls')),
    path('accounts/', include('allauth.urls')),
]
