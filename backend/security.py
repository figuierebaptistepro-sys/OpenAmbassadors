# security.py - Module de sécurité OpenAmbassadors
"""
Security module implementing:
- Rate limiting for authentication endpoints
- Security headers middleware
- Input validation helpers
- Security logging
- Brute-force protection
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timezone, timedelta
import logging
import hashlib
import os
import secrets

# Configure security logger
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# Create file handler for security logs
log_dir = os.path.dirname(os.path.abspath(__file__))
security_log_path = os.path.join(log_dir, "security.log")
file_handler = logging.FileHandler(security_log_path)
file_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
security_logger.addHandler(file_handler)

# ==================== RATE LIMITER ====================

def get_client_ip(request: Request) -> str:
    """Get client IP from request, handling proxies"""
    # Check X-Forwarded-For header first (for proxied requests)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP in the chain (original client)
        return forwarded.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"

# Initialize rate limiter with custom key function
limiter = Limiter(key_func=get_client_ip)

# Rate limit configurations
RATE_LIMITS = {
    "auth_login": "5/minute",           # 5 login attempts per minute
    "auth_register": "3/minute",        # 3 registrations per minute
    "auth_otp_request": "3/minute",     # 3 OTP requests per minute
    "auth_otp_verify": "5/minute",      # 5 OTP verify attempts per minute
    "auth_forgot_password": "3/minute", # 3 reset requests per minute
    "auth_reset_password": "5/minute",  # 5 reset attempts per minute
    "api_general": "100/minute",        # 100 requests per minute for general API
    "upload": "10/minute",              # 10 uploads per minute
}

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded"""
    client_ip = get_client_ip(request)
    endpoint = request.url.path
    
    # Log the rate limit violation
    security_logger.warning(
        f"RATE_LIMIT_EXCEEDED | IP: {client_ip} | Endpoint: {endpoint} | "
        f"User-Agent: {request.headers.get('user-agent', 'unknown')[:100]}"
    )
    
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Trop de requêtes. Veuillez patienter avant de réessayer.",
            "retry_after": 60
        },
        headers={"Retry-After": "60"}
    )

# ==================== SECURITY HEADERS MIDDLEWARE ====================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # HSTS - only for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy (adjust based on your needs)
        # Updated to support Google OAuth and HelpCrunch chat widget
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://*.gstatic.com https://embed.helpcrunch.com https://*.helpcrunch.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://embed.helpcrunch.com https://*.helpcrunch.com; "
            "font-src 'self' https://fonts.gstatic.com https://embed.helpcrunch.com https://*.helpcrunch.com; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https: wss:; "
            "media-src 'self' https://*.helpcrunch.com; "
            "frame-src https://accounts.google.com https://www.youtube.com https://*.google.com https://embed.helpcrunch.com https://*.helpcrunch.com; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response

# ==================== SECURITY LOGGING ====================

def log_auth_attempt(request: Request, email: str, success: bool, reason: str = None):
    """Log authentication attempts for security monitoring"""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")[:100]
    
    status = "SUCCESS" if success else "FAILED"
    reason_str = f" | Reason: {reason}" if reason else ""
    
    security_logger.info(
        f"AUTH_ATTEMPT | Status: {status} | IP: {client_ip} | "
        f"Email: {mask_email(email)} | User-Agent: {user_agent}{reason_str}"
    )

def log_security_event(event_type: str, request: Request, details: str = None):
    """Log general security events"""
    client_ip = get_client_ip(request)
    
    security_logger.info(
        f"SECURITY_EVENT | Type: {event_type} | IP: {client_ip} | "
        f"Path: {request.url.path} | Details: {details or 'N/A'}"
    )

def mask_email(email: str) -> str:
    """Mask email for logging (keep first 2 chars and domain)"""
    if not email or "@" not in email:
        return "***"
    
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = "*" * len(local)
    else:
        masked_local = local[:2] + "*" * (len(local) - 2)
    
    return f"{masked_local}@{domain}"

# ==================== INPUT VALIDATION ====================

# Maximum lengths for various fields
MAX_LENGTHS = {
    "email": 254,
    "password": 128,
    "name": 100,
    "title": 200,
    "description": 5000,
    "comment": 2000,
    "bio": 1000,
    "content": 50000,
    "url": 2048,
    "phone": 20,
    "city": 100,
    "company_name": 200,
}

def validate_length(value: str, field_name: str) -> bool:
    """Validate string length against maximum"""
    if not value:
        return True
    
    max_length = MAX_LENGTHS.get(field_name, 1000)
    return len(value) <= max_length

def sanitize_input(value: str) -> str:
    """Basic input sanitization - removes null bytes and control characters"""
    if not value:
        return value
    
    # Remove null bytes
    value = value.replace("\x00", "")
    
    # Remove other control characters except newlines and tabs
    value = "".join(char for char in value if char >= " " or char in "\n\r\t")
    
    return value.strip()

# ==================== BRUTE FORCE PROTECTION ====================

# In-memory storage for failed attempts (use Redis in production)
_failed_attempts = {}
_lockout_until = {}

LOCKOUT_THRESHOLD = 10  # Lock after 10 failed attempts
LOCKOUT_DURATION = 900  # 15 minutes lockout

def check_lockout(identifier: str) -> bool:
    """Check if an identifier (IP or email) is locked out"""
    if identifier in _lockout_until:
        lockout_time = _lockout_until[identifier]
        if datetime.now(timezone.utc) < lockout_time:
            return True
        else:
            # Lockout expired, clean up
            del _lockout_until[identifier]
            if identifier in _failed_attempts:
                del _failed_attempts[identifier]
    return False

def record_failed_attempt(identifier: str):
    """Record a failed authentication attempt"""
    now = datetime.now(timezone.utc)
    
    if identifier not in _failed_attempts:
        _failed_attempts[identifier] = []
    
    # Clean old attempts (older than lockout duration)
    cutoff = now - timedelta(seconds=LOCKOUT_DURATION)
    _failed_attempts[identifier] = [
        t for t in _failed_attempts[identifier] if t > cutoff
    ]
    
    _failed_attempts[identifier].append(now)
    
    # Check if threshold exceeded
    if len(_failed_attempts[identifier]) >= LOCKOUT_THRESHOLD:
        _lockout_until[identifier] = now + timedelta(seconds=LOCKOUT_DURATION)
        security_logger.warning(f"LOCKOUT_TRIGGERED | Identifier: {mask_email(identifier)}")

def clear_failed_attempts(identifier: str):
    """Clear failed attempts after successful auth"""
    if identifier in _failed_attempts:
        del _failed_attempts[identifier]
    if identifier in _lockout_until:
        del _lockout_until[identifier]

# ==================== SECURE TOKEN GENERATION ====================

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)

def generate_secure_otp(length: int = 6) -> str:
    """Generate a secure OTP code"""
    # Use secrets module for cryptographic randomness
    return "".join(secrets.choice("0123456789") for _ in range(length))

def hash_token(token: str) -> str:
    """Hash a token for storage (one-way)"""
    return hashlib.sha256(token.encode()).hexdigest()

# ==================== PASSWORD VALIDATION ====================

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"
    
    if len(password) > MAX_LENGTHS["password"]:
        return False, f"Le mot de passe ne peut pas dépasser {MAX_LENGTHS['password']} caractères"
    
    # Check for at least one number
    if not any(c.isdigit() for c in password):
        return False, "Le mot de passe doit contenir au moins un chiffre"
    
    # Check for at least one letter
    if not any(c.isalpha() for c in password):
        return False, "Le mot de passe doit contenir au moins une lettre"
    
    return True, ""

# ==================== HELPER FOR CHECKING ADMIN ====================

def is_admin_email(email: str, admin_emails: list) -> bool:
    """Check if email is in admin list (case-insensitive)"""
    return email.lower() in [e.lower() for e in admin_emails]
