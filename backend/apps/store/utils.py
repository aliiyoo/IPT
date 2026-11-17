import string
from django.utils.crypto import get_random_string


def generate_random_digital_key():
    """
    Generates a unique digital key in the format XXXX-XXXX-XXXX-XXXX
    using django.utils.crypto.get_random_string.
    """
    chars = string.ascii_uppercase + string.digits
    parts = [get_random_string(4, allowed_chars=chars) for _ in range(4)]
    return "-".join(parts)
