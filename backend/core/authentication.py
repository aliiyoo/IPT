from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication that skips CSRF validation.
    Used for REST API endpoints consumed by the React SPA frontend.
    """
    def enforce_csrf(self, request):
        return  # Bypass CSRF check for stateless SPA API calls
