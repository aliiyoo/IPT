import base64
import hashlib
import secrets
from functools import lru_cache

from cryptography.fernet import Fernet
from django.conf import settings


@lru_cache(maxsize=1)
def _fernet():
    configured_key = settings.DIGITAL_KEY_ENCRYPTION_KEY
    if configured_key:
        return Fernet(configured_key.encode('ascii'))
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest())
    return Fernet(derived_key)


def generate_digital_key():
    return f'PK-{secrets.token_hex(16).upper()}'


def encrypt_key(raw_key):
    return _fernet().encrypt(raw_key.encode('utf-8'))


def decrypt_key(encrypted_key):
    return _fernet().decrypt(bytes(encrypted_key)).decode('utf-8')


def hash_key(raw_key):
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
