from datetime import datetime, timedelta
from typing import Optional, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from backend.app.core.config import settings

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fernet Cipher for Encrypting API Keys at rest
fernet_cipher = Fernet(settings.ENCRYPTION_KEY.encode())


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str | Any, role: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "iss": settings.ORGANIZATION_NAME,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded
    except JWTError:
        return None


def encrypt_secret(secret_text: str) -> str:
    """Encrypt sensitive API keys before persisting to database."""
    if not secret_text:
        return ""
    return fernet_cipher.encrypt(secret_text.encode()).decode()


def decrypt_secret(encrypted_text: str) -> str:
    """Decrypt sensitive API keys for backend runtime execution only."""
    if not encrypted_text:
        return ""
    try:
        return fernet_cipher.decrypt(encrypted_text.encode()).decode()
    except Exception:
        return ""


def mask_secret(secret_text: str) -> str:
    """Return a masked representation (e.g. sk-proj-...4f9a) safe for UI rendering."""
    if not secret_text:
        return ""
    if len(secret_text) <= 8:
        return "••••••••"
    return f"{secret_text[:6]}••••••••{secret_text[-4:]}"


def validate_opensense_email(email: str) -> bool:
    """Enforce OpenSense Labs domain restriction (@opensenselabs.com)."""
    email = email.strip().lower()
    return email.endswith(f"@{settings.ORGANIZATION_DOMAIN}")
