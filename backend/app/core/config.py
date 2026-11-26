import os
import base64
from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "OpenSense Labs MCP Hub"
    ORGANIZATION_NAME: str = "OpenSense Labs"
    ORGANIZATION_DOMAIN: str = "opensenselabs.com"
    API_V1_STR: str = "/api/v1"
    
    # Security & Encryption
    SECRET_KEY: str = os.getenv("SECRET_KEY", "opensenselabs-secret-jwt-key-2026-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # 32-byte urlsafe base64 key for Fernet API Key encryption at rest
    ENCRYPTION_KEY: str = os.getenv(
        "ENCRYPTION_KEY",
        base64.urlsafe_b64encode(b"opensenselabs_secure_mcp_key_32b").decode()
    )
    
    # Database (Default SQLite async for local dev)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./opensense_mcp.db")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
