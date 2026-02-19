from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import shutil
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import random
import string
import boto3
from botocore.config import Config
import resend

# Security imports
from security import (
    limiter, 
    rate_limit_exceeded_handler,
    SecurityHeadersMiddleware,
    log_auth_attempt,
    log_security_event,
    check_lockout,
    record_failed_attempt,
    clear_failed_attempts,
    validate_password_strength,
    generate_secure_otp,
    generate_secure_token,
    sanitize_input,
    validate_length,
    MAX_LENGTHS,
    RATE_LIMITS
)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Google OAuth imports
from google_oauth import oauth, GOOGLE_CLIENT_ID

# Creator Card imports
from creator_card import create_creator_card_routes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'OpenAmbassadors <noreply@resend.dev>')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logging.info("Resend email client initialized")

# Admin emails (only these can access admin panel)
ADMIN_EMAILS = ["figuierebaptistepro@gmail.com"]

# Create uploads directories (fallback for local storage)
UPLOADS_DIR = ROOT_DIR / "uploads"
PROFILES_DIR = UPLOADS_DIR / "profiles"
BANNERS_DIR = UPLOADS_DIR / "banners"
PROJECTS_DIR = UPLOADS_DIR / "projects"
PROFILES_DIR.mkdir(parents=True, exist_ok=True)
BANNERS_DIR.mkdir(parents=True, exist_ok=True)
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

# Cloudflare R2 Configuration
R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID')
R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY')
R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME')
R2_ENDPOINT = os.environ.get('R2_ENDPOINT')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', f"https://pub-{R2_ACCOUNT_ID}.r2.dev" if R2_ACCOUNT_ID else None)

# Initialize R2 client
s3_client = None
if R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY:
    s3_client = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )
    logging.info(f"Cloudflare R2 client initialized - Public URL: {R2_PUBLIC_URL}")

async def upload_to_r2(file_content: bytes, filename: str, content_type: str, folder: str = "") -> str:
    """Upload file to Cloudflare R2 and return the public URL"""
    if not s3_client:
        raise HTTPException(status_code=500, detail="R2 storage not configured")
    
    key = f"{folder}/{filename}" if folder else filename
    
    try:
        s3_client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=key,
            Body=file_content,
            ContentType=content_type
        )
        # Return the public R2 URL
        return f"{R2_PUBLIC_URL}/{key}"
    except Exception as e:
        logging.error(f"R2 upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration - REQUIRED: JWT_SECRET must be set in environment
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("CRITICAL: JWT_SECRET environment variable is required for security")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Frontend URL for emails
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://openambassadors.com')

app = FastAPI(
    title="OpenAmbassadors API",
    description="API sécurisée pour la plateforme OpenAmbassadors",
    version="2.0.0"
)

# Add ProxyHeadersMiddleware FIRST to handle X-Forwarded-* headers from reverse proxy (NPM, nginx, etc.)
# This ensures request.url uses the correct scheme (https) and host
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Add SessionMiddleware for OAuth state management
# Configure for production behind proxy: https_only=True, same_site="lax"
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
app.add_middleware(
    SessionMiddleware, 
    secret_key=JWT_SECRET,
    session_cookie="oauth_session",
    max_age=1800,  # 30 minutes for OAuth flow
    same_site="lax",  # Required for OAuth redirects
    https_only=True,  # Production uses HTTPS
)

# Add rate limiter state to app
app.state.limiter = limiter

# Add rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# ==================== EMAIL FUNCTIONS ====================

async def send_email(to: str, subject: str, html: str):
    """Send email via Resend"""
    if not RESEND_API_KEY:
        logging.warning(f"Email not sent (no API key): {subject} to {to}")
        return False
    
    try:
        params = {
            "from": "OpenAmbassadors <delivered@resend.dev>",
            "to": [to],
            "subject": subject,
            "html": html
        }
        result = resend.Emails.send(params)
        logging.info(f"Email sent successfully: {subject} to {to} - ID: {result.get('id', 'N/A')}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email to {to}: {e}")
        return False

async def send_welcome_email(email: str, name: str, user_type: str):
    """Send welcome email to new user"""
    if user_type == "new":
        # Email pour nouvelle inscription (avant choix du type)
        await send_email(
            to=email,
            subject=f"🎉 Félicitations ! Votre compte OpenAmbassadors est créé",
            html=f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #fafafa;">
                <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">🎉</span>
                        </div>
                        <h1 style="color: #333; margin: 0; font-size: 22px;">Bienvenue {name or 'sur OpenAmbassadors'} !</h1>
                    </div>
                    
                    <p style="color: #555; line-height: 1.7; font-size: 15px; margin-bottom: 20px;">
                        <strong>Félicitations !</strong> Votre compte a été créé avec succès. ✅
                    </p>
                    
                    <div style="background: #f0f7ff; border-left: 4px solid #2196F3; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                        <p style="color: #1976D2; margin: 0; font-size: 14px;">
                            💡 <strong>Prochaine étape :</strong> Connectez-vous et choisissez votre profil (Créateur ou Entreprise)
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="https://pool-campaigns.preview.emergentagent.com/login" style="background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); color: white; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 15px;">
                            Se connecter maintenant →
                        </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                        Des questions ? Répondez à cet email.<br>
                        L'équipe OpenAmbassadors 💜
                    </p>
                </div>
            </div>
            """
        )
    else:
        type_label = "créateur" if user_type == "creator" else "entreprise"
        await send_email(
            to=email,
            subject=f"🎉 Bienvenue sur OpenAmbassadors !",
            html=f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #E91E63; margin: 0;">Bienvenue {name or ''} ! 🚀</h1>
                </div>
                <p style="color: #333; line-height: 1.6;">
                    Votre compte <strong>{type_label}</strong> a été créé avec succès sur OpenAmbassadors.
                </p>
                <p style="color: #333; line-height: 1.6;">
                    {"Vous pouvez maintenant parcourir les missions et postuler aux projets qui vous intéressent." if user_type == "creator" else "Vous pouvez maintenant publier des projets et trouver des créateurs talentueux."}
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://pool-campaigns.preview.emergentagent.com" style="background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Accéder à mon compte
                    </a>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center;">
                    L'équipe OpenAmbassadors
                </p>
            </div>
            """
        )

async def send_new_application_email(business_email: str, business_name: str, project_title: str, creator_name: str):
    """Notify business of new application"""
    await send_email(
        to=business_email,
        subject=f"📩 Nouvelle candidature pour '{project_title}'",
        html=f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #E91E63; margin: 0;">Nouvelle candidature ! 🎯</h1>
            </div>
            <p style="color: #333; line-height: 1.6;">
                Bonjour {business_name or ''},
            </p>
            <p style="color: #333; line-height: 1.6;">
                <strong>{creator_name}</strong> vient de postuler à votre projet <strong>"{project_title}"</strong>.
            </p>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="color: #666; margin: 0;">
                    Consultez son profil et décidez si vous souhaitez collaborer avec ce créateur.
                </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://pool-campaigns.preview.emergentagent.com/business/projects" style="background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Voir les candidatures
                </a>
            </div>
        </div>
        """
    )

async def send_application_status_email(creator_email: str, creator_name: str, project_title: str, status: str):
    """Notify creator of application status change"""
    is_accepted = status == "accepted"
    
    if is_accepted:
        subject = f"✅ Candidature acceptée - {project_title}"
        title = "Félicitations ! 🎉"
        title_color = "#4CAF50"
        message = f'Votre candidature pour le projet <strong>"{project_title}"</strong> a été acceptée ! L\'entreprise souhaite collaborer avec vous.'
        info_box = '''
            <div style="background: #e8f5e9; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="color: #2e7d32; margin: 0;">
                    🚀 Prochaine étape : L'entreprise vous contactera pour discuter des détails du projet.
                </p>
            </div>
        '''
    else:
        subject = f"❌ Candidature refusée - {project_title}"
        title = "Mise à jour de candidature"
        title_color = "#F44336"
        message = f'Malheureusement, votre candidature pour le projet <strong>"{project_title}"</strong> n\'a pas été retenue cette fois-ci.'
        info_box = '''
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="color: #666; margin: 0;">
                    💪 Ne vous découragez pas ! Continuez à postuler à d'autres projets.
                </p>
            </div>
        '''
    
    name_display = creator_name or ''
    
    await send_email(
        to=creator_email,
        subject=subject,
        html=f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: {title_color}; margin: 0;">{title}</h1>
            </div>
            <p style="color: #333; line-height: 1.6;">
                Bonjour {name_display},
            </p>
            <p style="color: #333; line-height: 1.6;">
                {message}
            </p>
            {info_box}
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://pool-campaigns.preview.emergentagent.com/projects" style="background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Voir les missions
                </a>
            </div>
        </div>
        """
    )

async def send_withdrawal_status_email(creator_email: str, creator_name: str, amount: float, status: str):
    """Notify creator of withdrawal status"""
    is_approved = status == "approved"
    
    if is_approved:
        subject = f"💰 Retrait approuvé - {amount:.2f}€"
        title = "Retrait approuvé ! 💸"
        title_color = "#4CAF50"
        bg_color = "#e8f5e9"
        amount_color = "#2e7d32"
        info_text = "Le virement sera effectué sous 2-3 jours ouvrés."
    else:
        subject = f"⚠️ Retrait refusé - {amount:.2f}€"
        title = "Retrait refusé"
        title_color = "#F44336"
        bg_color = "#ffebee"
        amount_color = "#c62828"
        info_text = "Veuillez contacter le support pour plus d'informations."
    
    name_display = creator_name or ''
    
    await send_email(
        to=creator_email,
        subject=subject,
        html=f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: {title_color}; margin: 0;">{title}</h1>
            </div>
            <p style="color: #333; line-height: 1.6;">
                Bonjour {name_display},
            </p>
            <div style="background: {bg_color}; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: {amount_color}; margin: 0;">
                    {amount:.2f}€
                </p>
                <p style="color: #666; margin-top: 10px;">
                    {info_text}
                </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://pool-campaigns.preview.emergentagent.com/wallet" style="background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Voir mon portefeuille
                </a>
            </div>
        </div>
        """
    )

# ==================== NOTIFICATION HELPER ====================

async def create_notification(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    icon: str = "🔔",
    link: str = None,
    data: dict = None
):
    """Create a notification for a user"""
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "icon": icon,
        "link": link,
        "data": data or {},
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    banner: Optional[str] = None  # Banner/cover image URL
    user_type: Optional[str] = None  # "creator" or "business" - can be set later
    is_premium: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    code: str

class SetUserType(BaseModel):
    user_type: str

class CreatorProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str = Field(default_factory=lambda: f"profile_{uuid.uuid4().hex[:12]}")
    user_id: str
    
    # Identity
    bio: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    can_travel: Optional[bool] = None
    works_remote: Optional[bool] = None
    
    # Social Media
    social_instagram: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_youtube: Optional[str] = None
    social_twitter: Optional[str] = None
    social_linkedin: Optional[str] = None
    
    # Visibility/Followers (global audience)
    visibility: Optional[str] = None  # "1K", "5K", "10K", "35K", "50K", "100K", "250K", "1M"
    
    # Specialties
    content_types: List[str] = []  # UGC, Micro-trottoir, Face cam, Ads, Interview, Montage
    sectors: List[str] = []  # Legacy field
    niches: List[str] = []  # Niches: beaute, igaming, gaming, mode, tech, food, etc.
    
    # Equipment
    equipment: List[str] = []  # smartphone, camera, micro, lighting, etc.
    
    # Experience
    experience_level: Optional[str] = None  # beginner, intermediate, expert
    brands_worked: List[str] = []
    results: Optional[str] = None
    
    # Portfolio
    portfolio_videos: List[dict] = []  # [{url, title, views, platform}]
    
    # Rates
    min_rate: Optional[int] = None
    max_rate: Optional[int] = None
    
    # Scores & Status
    completion_score: int = 0  # 0-100
    reliability_score: int = 0  # Based on missions
    performance_score: int = 0  # Based on results
    
    # Verification
    verification_status: str = "unverified"  # unverified, identity_verified, portfolio_validated, incubator_certified
    
    # Visibility
    is_visible: bool = True
    available: bool = True
    
    # Stats
    completed_projects: int = 0
    rating: float = 0.0
    reviews_count: int = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreatorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    can_travel: Optional[bool] = None
    works_remote: Optional[bool] = None
    content_types: Optional[List[str]] = None
    sectors: Optional[List[str]] = None
    niches: Optional[List[str]] = None  # Niches: beaute, igaming, gaming, mode, tech, food, etc.
    equipment: Optional[List[str]] = None
    experience_level: Optional[str] = None
    brands_worked: Optional[List[str]] = None
    results: Optional[str] = None
    portfolio_videos: Optional[List[dict]] = None
    min_rate: Optional[int] = None
    max_rate: Optional[int] = None
    available: Optional[bool] = None
    # Social media
    social_instagram: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_youtube: Optional[str] = None
    social_twitter: Optional[str] = None
    social_linkedin: Optional[str] = None
    # Visibility/Followers
    visibility: Optional[str] = None  # "1K", "5K", "10K", "35K", "50K", "100K", "250K", "1M"
    
    @field_validator('niches')
    @classmethod
    def validate_niches(cls, v):
        if v is None:
            return v
        valid_niches = ["beaute", "igaming", "gaming", "mode", "tech", "food", "fitness", "voyage", 
                        "finance", "immobilier", "auto", "education", "sante", "enfants", "animaux", 
                        "musique", "b2b", "ecommerce"]
        return [n for n in v if n in valid_niches]

class BusinessProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str = Field(default_factory=lambda: f"biz_{uuid.uuid4().hex[:12]}")
    user_id: str
    company_name: Optional[str] = None
    description: Optional[str] = None
    business_type: Optional[str] = None  # physical, online, both
    city: Optional[str] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    monthly_budget: Optional[str] = None
    objectives: List[str] = []
    
    # Pack selection
    selected_pack: Optional[str] = None
    
    # Scores
    completion_score: int = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BusinessProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    business_type: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    monthly_budget: Optional[str] = None
    objectives: Optional[List[str]] = None
    selected_pack: Optional[str] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str = Field(default_factory=lambda: f"proj_{uuid.uuid4().hex[:12]}")
    business_id: str
    pack_id: str
    title: str
    description: str
    brief: Optional[str] = None  # Detailed brief for creators
    budget: int
    content_type: str
    target_creators: int = 1
    requirements: List[str] = []
    deliverables: List[str] = []  # What's expected from creators
    deadline: Optional[str] = None
    duration: Optional[str] = None  # e.g., "2 weeks", "1 month"
    location: Optional[str] = None  # City or "Remote"
    remote_ok: bool = True
    banner_url: Optional[str] = None  # Project cover image (REQUIRED)
    incubator_only: bool = False
    status: str = "open"  # open, in_progress, completed, cancelled
    applications: List[dict] = []  # [{creator_id, status, applied_at}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    pack_id: str
    title: str
    description: str
    brief: Optional[str] = None
    budget: int
    content_type: str
    target_creators: int = 1
    requirements: List[str] = []
    deliverables: List[str] = []
    deadline: Optional[str] = None
    duration: Optional[str] = None
    location: Optional[str] = None
    remote_ok: bool = True
    banner_url: Optional[str] = None
    incubator_only: bool = False

# ==================== WALLET MODELS ====================

class WalletTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = Field(default_factory=lambda: f"tx_{uuid.uuid4().hex[:12]}")
    user_id: str
    amount: float  # Gross amount before fees
    net_amount: float  # Amount after 15% fee
    fee_amount: float  # 15% fee
    transaction_type: str  # "earning", "withdrawal"
    status: str = "pending"  # pending, approved, rejected, completed
    description: Optional[str] = None
    project_id: Optional[str] = None
    # For withdrawals
    withdrawal_method: Optional[str] = None  # "paypal", "bank_transfer"
    paypal_email: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_bic: Optional[str] = None
    admin_note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class WithdrawalRequest(BaseModel):
    amount: float
    method: str  # "bank_transfer" only for now (paypal is "soon")
    iban: Optional[str] = None
    bic: Optional[str] = None

# ==================== NOTIFICATION MODELS ====================

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    type: str  # "application", "accepted", "rejected", "project", "message", "system"
    title: str
    message: str
    icon: Optional[str] = None  # emoji or icon name
    link: Optional[str] = None  # URL to navigate to
    data: Optional[dict] = None  # Additional data (project_id, creator_id, etc.)
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentMethodUpdate(BaseModel):
    paypal_email: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_bic: Optional[str] = None
    bank_holder_name: Optional[str] = None

class Training(BaseModel):
    model_config = ConfigDict(extra="ignore")
    training_id: str = Field(default_factory=lambda: f"train_{uuid.uuid4().hex[:12]}")
    title: str
    description: str
    category: str
    duration: str
    is_premium: bool = False
    thumbnail: Optional[str] = None
    video_url: Optional[str] = None
    completed_by: List[str] = []  # user_ids

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"review_{uuid.uuid4().hex[:12]}")
    creator_id: str
    business_id: str
    project_id: Optional[str] = None
    rating: int  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPER FUNCTIONS ====================

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str, user_type: str = None) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def calculate_creator_completion(profile: dict) -> int:
    """Calculate profile completion score for creators"""
    score = 0
    max_score = 100
    
    # Identity (25 points)
    if profile.get("bio"): score += 5
    if profile.get("city"): score += 10
    if profile.get("can_travel") is not None: score += 5
    if profile.get("works_remote") is not None: score += 5
    
    # Specialties (20 points)
    if len(profile.get("content_types", [])) > 0: score += 10
    if len(profile.get("sectors", [])) > 0: score += 10
    
    # Equipment (10 points)
    if len(profile.get("equipment", [])) > 0: score += 10
    
    # Experience (15 points)
    if profile.get("experience_level"): score += 5
    if len(profile.get("brands_worked", [])) > 0: score += 5
    if profile.get("results"): score += 5
    
    # Portfolio (20 points) - Minimum 3 videos recommended
    videos = len(profile.get("portfolio_videos", []))
    if videos >= 3: score += 20
    elif videos >= 1: score += 10
    
    # Rates (10 points)
    if profile.get("min_rate") and profile.get("max_rate"): score += 10
    
    return min(score, max_score)

def calculate_business_completion(profile: dict) -> int:
    """Calculate profile completion score for businesses"""
    score = 0
    
    if profile.get("company_name"): score += 20
    if profile.get("description"): score += 10
    if profile.get("business_type"): score += 15
    if profile.get("city"): score += 10
    if profile.get("industry"): score += 15
    if profile.get("website"): score += 10
    if profile.get("monthly_budget"): score += 10
    if len(profile.get("objectives", [])) > 0: score += 10
    
    return min(score, 100)

async def get_current_user(request: Request) -> dict:
    # Check cookie first, then Authorization header
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token from Google Auth
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Try JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(request: Request) -> Optional[dict]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request)
    except:
        return None

def is_admin(user: dict) -> bool:
    """Check if user is admin"""
    return user.get("email") in ADMIN_EMAILS

async def get_admin_user(request: Request) -> dict:
    """Get current user and verify admin access"""
    user = await get_current_user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

# ==================== AUTH ROUTES ====================

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    ref_code: Optional[str] = None  # Code de parrainage

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# ==================== PASSWORD RESET FUNCTIONS ====================

async def send_password_reset_email(email: str, name: str, reset_token: str):
    """Send password reset email"""
    reset_url = f"https://pool-campaigns.preview.emergentagent.com/reset-password?token={reset_token}"
    await send_email(
        to=email,
        subject="🔐 Réinitialisation de votre mot de passe",
        html=f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #E91E63; margin: 0; font-size: 24px;">Mot de passe oublié ?</h1>
            </div>
            <p style="color: #333; line-height: 1.6;">
                Bonjour{' ' + name if name else ''} ! 👋
            </p>
            <p style="color: #333; line-height: 1.6;">
                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Réinitialiser mon mot de passe
                </a>
            </div>
            <p style="color: #666; font-size: 13px; line-height: 1.6;">
                Ce lien expire dans <strong>1 heure</strong>.
            </p>
            <p style="color: #666; font-size: 13px; line-height: 1.6;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                L'équipe OpenAmbassadors
            </p>
        </div>
        """
    )

@api_router.post("/auth/forgot-password")
@limiter.limit(RATE_LIMITS["auth_forgot_password"])
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """Request password reset email"""
    email = sanitize_input(data.email.lower())
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    # Always return success (security: don't reveal if email exists)
    if not user:
        log_security_event("PASSWORD_RESET_UNKNOWN_EMAIL", request, f"email={email[:3]}***")
        return {"message": "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."}
    
    # Check if user has password (Google-only users can't reset)
    if not user.get("password"):
        log_security_event("PASSWORD_RESET_GOOGLE_ONLY", request, f"email={email[:3]}***")
        return {"message": "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."}
    
    # Invalidate any existing reset tokens for this email
    await db.password_resets.delete_many({"email": email})
    
    # Generate secure reset token
    reset_token = generate_secure_token(48)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token in database
    await db.password_resets.insert_one({
        "email": email,
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False
    })
    
    # Send reset email
    await send_password_reset_email(email, user.get("name", ""), reset_token)
    log_security_event("PASSWORD_RESET_REQUESTED", request, f"email={email[:3]}***")
    
    return {"message": "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."}

@api_router.post("/auth/reset-password")
@limiter.limit(RATE_LIMITS["auth_reset_password"])
async def reset_password(request: Request, data: ResetPasswordRequest):
    """Reset password with token"""
    # Find reset token
    reset_doc = await db.password_resets.find_one({"token": data.token, "used": False}, {"_id": 0})
    
    if not reset_doc:
        log_security_event("PASSWORD_RESET_INVALID_TOKEN", request)
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_doc["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": data.token})
        log_security_event("PASSWORD_RESET_EXPIRED_TOKEN", request)
        raise HTTPException(status_code=400, detail="Ce lien a expiré. Veuillez faire une nouvelle demande.")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Hash new password
    hashed_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update user password
    result = await db.users.update_one(
        {"email": reset_doc["email"]},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Mark token as used and delete it
    await db.password_resets.delete_one({"token": data.token})
    
    # Invalidate all existing sessions for this user (force re-login)
    user = await db.users.find_one({"email": reset_doc["email"]}, {"_id": 0})
    if user:
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
    
    log_security_event("PASSWORD_RESET_SUCCESS", request, f"email={reset_doc['email'][:3]}***")
    
    # Send confirmation email
    await send_email(
        to=reset_doc["email"],
        subject="✅ Mot de passe modifié",
        html=f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4CAF50; margin: 0; font-size: 24px;">Mot de passe modifié ✅</h1>
            </div>
            <p style="color: #333; line-height: 1.6;">
                Bonjour{' ' + user.get('name', '') if user else ''} ! 👋
            </p>
            <p style="color: #333; line-height: 1.6;">
                Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://pool-campaigns.preview.emergentagent.com/login" style="background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Se connecter
                </a>
            </div>
            <p style="color: #f44336; font-size: 13px; line-height: 1.6;">
                ⚠️ Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                L'équipe OpenAmbassadors
            </p>
        </div>
        """
    )
    
    return {"message": "Mot de passe modifié avec succès ! Vous pouvez maintenant vous connecter."}

@api_router.post("/auth/register")
@limiter.limit(RATE_LIMITS["auth_register"])
async def register_user(request: Request, data: RegisterRequest, response: Response):
    """Register a new user with email and password"""
    # Input sanitization
    data.name = sanitize_input(data.name)
    data.email = sanitize_input(data.email.lower())
    
    # Validate input lengths
    if not validate_length(data.name, "name"):
        raise HTTPException(status_code=400, detail=f"Le nom ne peut pas dépasser {MAX_LENGTHS['name']} caractères")
    if not validate_length(data.email, "email"):
        raise HTTPException(status_code=400, detail="Email invalide")
    
    # Validate password strength
    is_valid, error_msg = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing_user:
        log_auth_attempt(request, data.email, False, "email_exists")
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email")
    
    # Hash password
    hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hashed_password,
        "picture": None,
        "user_type": None,
        "is_premium": False,
        "is_verified": False,
        "referrer_id": None,  # Will be set if referred
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Log successful registration
    log_auth_attempt(request, data.email, True, "registration")
    log_security_event("USER_REGISTERED", request, f"user_id={user_id}")
    
    # Handle affiliate referral if ref_code provided
    if data.ref_code:
        try:
            # Find the affiliate code (case-insensitive)
            affiliate = await db.affiliate_codes.find_one(
                {"code": {"$regex": f"^{data.ref_code}$", "$options": "i"}},
                {"_id": 0}
            )
            if affiliate and affiliate["user_id"] != user_id:
                referrer_id = affiliate["user_id"]
                
                # Create referral entry
                referral_data = {
                    "referral_id": f"ref_{uuid.uuid4().hex[:12]}",
                    "referrer_id": referrer_id,
                    "referred_user_id": user_id,
                    "referred_email": data.email,
                    "referred_name": data.name,
                    "referred_user_type": None,
                    "status": "free",
                    "plan": None,
                    "mrr_generated": 0,
                    "commission_rate": 0.20,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                await db.affiliate_referrals.insert_one(referral_data)
                
                # Update user with referrer_id
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"referrer_id": referrer_id}}
                )
                
                # Update affiliate stats
                await db.affiliate_stats.update_one(
                    {"user_id": referrer_id},
                    {
                        "$inc": {"total_signups": 1},
                        "$setOnInsert": {
                            "total_clicks": 0,
                            "active_subscribers": 0,
                            "mrr_generated": 0,
                            "pending_earnings": 0,
                            "validated_earnings": 0,
                            "created_at": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
                logging.info(f"[AFFILIATE] User {user_id} referred by {referrer_id}")
        except Exception as e:
            logging.error(f"[AFFILIATE] Error processing referral: {e}")
    
    # Create session
    session_token = generate_secure_token(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    # Send welcome email
    await send_welcome_email(data.email, data.name, "new")
    
    return {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "picture": None,
        "user_type": None,
        "is_new_user": True
    }

@api_router.post("/auth/login")
@limiter.limit(RATE_LIMITS["auth_login"])
async def login_user(request: Request, data: LoginRequest, response: Response):
    """Login user with email and password"""
    email = sanitize_input(data.email.lower())
    
    # Check for lockout
    if check_lockout(email):
        log_auth_attempt(request, email, False, "account_locked")
        raise HTTPException(
            status_code=429, 
            detail="Compte temporairement verrouillé suite à trop de tentatives. Réessayez dans 15 minutes."
        )
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    logging.info(f"Login attempt for {email}: user found = {user is not None}")
    
    if not user:
        record_failed_attempt(email)
        log_auth_attempt(request, email, False, "user_not_found")
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Check if user has a password (might be Google-only user)
    if not user.get("password"):
        log_auth_attempt(request, email, False, "google_only_account")
        raise HTTPException(status_code=401, detail="Ce compte utilise la connexion Google. Veuillez vous connecter avec Google.")
    
    # Verify password
    if not bcrypt.checkpw(data.password.encode('utf-8'), user["password"].encode('utf-8')):
        record_failed_attempt(email)
        log_auth_attempt(request, email, False, "wrong_password")
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Clear failed attempts on successful login
    clear_failed_attempts(email)
    log_auth_attempt(request, email, True)
    
    # Create session
    session_token = generate_secure_token(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name"),
        "picture": user.get("picture"),
        "user_type": user.get("user_type"),
        "is_premium": user.get("is_premium", False),
        "is_new_user": False
    }

@api_router.post("/auth/otp/request")
@limiter.limit(RATE_LIMITS["auth_otp_request"])
async def request_otp(request: Request, data: OTPRequest):
    """Request OTP code for email login"""
    email = sanitize_input(data.email.lower())
    
    # Use secure OTP generation
    otp_code = generate_secure_otp(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP with attempt counter
    await db.otp_codes.update_one(
        {"email": email},
        {"$set": {
            "code": otp_code,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "attempts": 0  # Track verification attempts
        }},
        upsert=True
    )
    
    log_security_event("OTP_REQUESTED", request, f"email={email[:3]}***")
    
    # Send email with OTP via Resend
    if RESEND_API_KEY:
        try:
            params = {
                "from": "OpenAmbassadors <onboarding@resend.dev>",
                "to": [email],
                "subject": f"🔐 Votre code de connexion : {otp_code}",
                "html": f"""
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #E91E63; margin: 0; font-size: 28px;">OpenAmbassadors</h1>
                        <p style="color: #666; margin-top: 5px;">Plateforme de créateurs UGC</p>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 25px;">
                        <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 14px;">Votre code de connexion</p>
                        <div style="background: white; border-radius: 12px; padding: 20px; display: inline-block;">
                            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333;">{otp_code}</span>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                        <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.6;">
                            ⏱️ Ce code expire dans <strong>10 minutes</strong><br>
                            🔒 Ne partagez jamais ce code avec personne
                        </p>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Si vous n'avez pas demandé ce code, ignorez cet email.
                    </p>
                </div>
                """
            }
            resend.Emails.send(params)
            logging.info(f"OTP email sent to {email}")
        except Exception as e:
            logging.error(f"Failed to send OTP email: {e}")
    
    # Return response (remove debug_code in production)
    response_data = {"message": "Code envoyé par email"}
    if not RESEND_API_KEY:
        response_data["debug_code"] = otp_code  # Only if email not configured
    
    return response_data

@api_router.post("/auth/otp/verify")
@limiter.limit(RATE_LIMITS["auth_otp_verify"])
async def verify_otp(request: Request, data: OTPVerify, response: Response):
    """Verify OTP code and authenticate"""
    email = sanitize_input(data.email.lower())
    
    otp_doc = await db.otp_codes.find_one({"email": email}, {"_id": 0})
    
    if not otp_doc:
        log_auth_attempt(request, email, False, "otp_not_found")
        raise HTTPException(status_code=400, detail="Code invalide")
    
    # Check attempt count to prevent brute-force
    attempts = otp_doc.get("attempts", 0)
    if attempts >= 5:
        await db.otp_codes.delete_one({"email": email})
        log_auth_attempt(request, email, False, "otp_max_attempts")
        raise HTTPException(status_code=400, detail="Trop de tentatives. Veuillez demander un nouveau code.")
    
    if otp_doc["code"] != data.code:
        # Increment attempt counter
        await db.otp_codes.update_one(
            {"email": email},
            {"$inc": {"attempts": 1}}
        )
        log_auth_attempt(request, email, False, "otp_wrong_code")
        raise HTTPException(status_code=400, detail="Code incorrect")
    
    expires_at = datetime.fromisoformat(otp_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await db.otp_codes.delete_one({"email": email})
        log_auth_attempt(request, email, False, "otp_expired")
        raise HTTPException(status_code=400, detail="Code expiré")
    
    # Delete OTP after successful verification
    await db.otp_codes.delete_one({"email": email})
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        user_type = existing_user.get("user_type")
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": None,
            "picture": None,
            "user_type": None,
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        user_type = None
        log_security_event("USER_CREATED_VIA_OTP", request, f"user_id={user_id}")
    
    log_auth_attempt(request, email, True, "otp_verified")
    
    # Create session
    token = create_jwt_token(user_id, user_type)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "user_type": user_type,
        "is_new_user": not existing_user,
        "token": token
    }

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Google Auth session_id and create local session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id for user data
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = resp.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": oauth_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        user_type = existing_user.get("user_type")
        is_new = False
        
        # Only update name, DON'T overwrite custom picture if user has one
        update_data = {"name": oauth_data["name"]}
        
        # Only set Google picture if user doesn't have a custom one
        current_picture = existing_user.get("picture")
        is_custom_picture = current_picture and (
            "r2.dev" in current_picture or  # R2 storage
            "/api/uploads/" in current_picture or  # Local storage
            "cloudflare" in current_picture.lower()
        )
        
        if not is_custom_picture:
            # No custom picture, use Google's
            update_data["picture"] = oauth_data.get("picture")
        
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        # Get updated user picture for response
        user_picture = current_picture if is_custom_picture else oauth_data.get("picture")
    else:
        # New user - don't set type yet
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_type = None
        is_new = True
        user_picture = oauth_data.get("picture")
        user_doc = {
            "user_id": user_id,
            "email": oauth_data["email"],
            "name": oauth_data["name"],
            "picture": user_picture,
            "user_type": None,
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Store session
    session_token = oauth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    return {
        "user_id": user_id,
        "email": oauth_data["email"],
        "name": oauth_data["name"],
        "picture": user_picture,
        "user_type": user_type,
        "is_new_user": is_new
    }

# ==================== CUSTOM GOOGLE OAUTH ROUTES ====================
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

@api_router.get("/auth/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth login - redirects to Google consent screen"""
    # Build redirect URI dynamically from the request headers
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    
    # Get the origin from various headers (handles proxies correctly)
    forwarded_proto = request.headers.get('x-forwarded-proto', 'https')
    forwarded_host = request.headers.get('x-forwarded-host') or request.headers.get('host')
    
    if forwarded_host:
        # Use the forwarded host (this is the actual domain the user sees)
        base_url = f"{forwarded_proto}://{forwarded_host}"
    else:
        # Fallback to request URL
        base_url = str(request.base_url).rstrip('/')
        if base_url.startswith('http://'):
            base_url = base_url.replace('http://', 'https://')
    
    redirect_uri = f"{base_url}/api/auth/google/callback"
    logging.info(f"Google OAuth login - redirect_uri: {redirect_uri}")
    
    return await oauth.google.authorize_redirect(request, redirect_uri)

@api_router.get("/auth/google/callback", name="google_callback")
async def google_callback(request: Request, response: Response):
    """Handle Google OAuth callback after user consent"""
    # Get frontend base URL from headers or env
    # Use FRONTEND_URL from environment - this is the production frontend domain
    frontend_base = os.environ.get("FRONTEND_URL", "https://app.openambassadors.com").rstrip("/")
    
    try:
        # Get the access token and user info from Google
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            # Fallback: get user info from id_token
            user_info = await oauth.google.parse_id_token(token, nonce=None)
        
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')
        
        if not email:
            logging.error("Google OAuth: Email not provided")
            return RedirectResponse(url=f"{frontend_base}/login?error=no_email", status_code=302)
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            user_type = existing_user.get("user_type")
            is_new = False
            
            # Only update name, DON'T overwrite custom picture if user has one
            update_data = {"name": name}
            
            # Only set Google picture if user doesn't have a custom one
            current_picture = existing_user.get("picture")
            is_custom_picture = current_picture and (
                "r2.dev" in current_picture or
                "/api/uploads/" in current_picture or
                "cloudflare" in current_picture.lower()
            )
            
            if not is_custom_picture:
                update_data["picture"] = picture
            
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
            
            user_picture = current_picture if is_custom_picture else picture
        else:
            # New user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_type = None
            is_new = True
            user_picture = picture
            user_doc = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "user_type": None,
                "is_premium": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            log_security_event("USER_CREATED_VIA_GOOGLE", request, f"user_id={user_id}")
        
        log_auth_attempt(request, email, True, "google_oauth")
        
        # Create session
        session_token = generate_secure_token(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.update_one(
            {"user_id": user_id},
            {"$set": {
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        # Build redirect URL based on user state
        # frontend_base is already set at the beginning of the function from request headers
        
        if is_new or not user_type:
            redirect_url = f"{frontend_base}/select-type"
        elif user_type == "creator":
            redirect_url = f"{frontend_base}/dashboard"
        else:
            redirect_url = f"{frontend_base}/business"
        
        logging.info(f"Google OAuth success - redirecting to: {redirect_url}")
        
        # Create response with redirect
        redirect_response = RedirectResponse(url=redirect_url, status_code=302)
        redirect_response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
            max_age=7 * 24 * 3600
        )
        
        return redirect_response
        
    except Exception as e:
        logging.error(f"Google OAuth error: {e}")
        import traceback
        logging.error(f"Google OAuth traceback: {traceback.format_exc()}")
        # frontend_base is already defined at the start of the function
        return RedirectResponse(url=f"{frontend_base}/login?error=google_auth_failed", status_code=302)

@api_router.get("/auth/google/client-id")
async def get_google_client_id():
    """Return Google Client ID for frontend"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    return {"client_id": GOOGLE_CLIENT_ID}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name"),
        "user_type": user.get("user_type"),
        "picture": user.get("picture"),
        "banner": user.get("banner"),
        "is_premium": user.get("is_premium", False),
        "is_subscribed": user.get("is_subscribed", False)
    }

@api_router.post("/auth/set-type")
async def set_user_type(data: SetUserType, user: dict = Depends(get_current_user)):
    """Set user type (creator or business) - Required after first login"""
    if data.user_type not in ["creator", "business"]:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"user_type": data.user_type}}
    )
    
    # Create profile
    if data.user_type == "creator":
        existing = await db.creator_profiles.find_one({"user_id": user["user_id"]})
        if not existing:
            profile = CreatorProfile(user_id=user["user_id"])
            await db.creator_profiles.insert_one(profile.model_dump())
    else:
        existing = await db.business_profiles.find_one({"user_id": user["user_id"]})
        if not existing:
            profile = BusinessProfile(user_id=user["user_id"])
            await db.business_profiles.insert_one(profile.model_dump())
    
    return {"user_type": data.user_type}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/request-access")
async def request_access(request: Request):
    """Request access to the platform"""
    body = await request.json()
    email = body.get("email")
    name = body.get("name")
    reason = body.get("reason")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    await db.access_requests.insert_one({
        "request_id": request_id,
        "email": email,
        "name": name,
        "reason": reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Demande envoyée", "request_id": request_id}

# ==================== FILE UPLOAD ROUTES ====================

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB for images
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB for videos

@api_router.post("/upload/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload profile picture to Cloudflare R2"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 10MB.")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user['user_id']}_profile_{uuid.uuid4().hex[:8]}.{ext}"
    
    # Upload to R2
    if s3_client:
        picture_url = await upload_to_r2(contents, filename, file.content_type, "profiles")
    else:
        # Fallback to local storage
        filepath = PROFILES_DIR / filename
        with open(filepath, "wb") as f:
            f.write(contents)
        picture_url = f"/api/uploads/profiles/{filename}"
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"picture": picture_url}}
    )
    
    return {"message": "Photo de profil mise à jour", "picture_url": picture_url}

@api_router.post("/upload/banner")
async def upload_banner(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload banner/cover image to Cloudflare R2"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 10MB.")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user['user_id']}_banner_{uuid.uuid4().hex[:8]}.{ext}"
    
    # Upload to R2
    if s3_client:
        banner_url = await upload_to_r2(contents, filename, file.content_type, "banners")
    else:
        filepath = BANNERS_DIR / filename
        with open(filepath, "wb") as f:
            f.write(contents)
        banner_url = f"/api/uploads/banners/{filename}"
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"banner": banner_url}}
    )
    
    return {"message": "Bannière mise à jour", "banner_url": banner_url}

@api_router.get("/uploads/profiles/{filename}")
async def get_profile_picture(filename: str):
    """Serve profile pictures (fallback for local storage)"""
    filepath = PROFILES_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image non trouvée")
    return FileResponse(filepath)

@api_router.get("/uploads/banners/{filename}")
async def get_banner(filename: str):
    """Serve banner images (fallback for local storage)"""
    filepath = BANNERS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image non trouvée")
    return FileResponse(filepath)

@api_router.post("/upload/project-banner")
async def upload_project_banner(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload project banner image to Cloudflare R2"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 10MB.")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"project_{uuid.uuid4().hex[:12]}.{ext}"
    
    # Upload to R2
    if s3_client:
        banner_url = await upload_to_r2(contents, filename, file.content_type, "projects")
    else:
        filepath = PROJECTS_DIR / filename
        with open(filepath, "wb") as f:
            f.write(contents)
        banner_url = f"/api/uploads/projects/{filename}"
    
    return {"message": "Image uploadée", "banner_url": banner_url}

@api_router.get("/uploads/projects/{filename}")
async def get_project_banner(filename: str):
    """Serve project banner images (fallback for local storage)"""
    filepath = PROJECTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image non trouvée")
    return FileResponse(filepath)

@api_router.post("/upload/portfolio")
async def upload_portfolio_media(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload portfolio video or image to Cloudflare R2"""
    is_video = file.content_type in ALLOWED_VIDEO_TYPES
    is_image = file.content_type in ALLOWED_IMAGE_TYPES
    
    if not is_video and not is_image:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.")
    
    contents = await file.read()
    max_size = MAX_VIDEO_SIZE if is_video else MAX_IMAGE_SIZE
    
    if len(contents) > max_size:
        size_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux. Maximum {size_mb}MB.")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else ("mp4" if is_video else "jpg")
    media_type = "video" if is_video else "image"
    filename = f"{user['user_id']}_{media_type}_{uuid.uuid4().hex[:8]}.{ext}"
    
    # Upload to R2
    if s3_client:
        media_url = await upload_to_r2(contents, filename, file.content_type, "portfolio")
    else:
        # Fallback to local storage
        portfolio_dir = UPLOADS_DIR / "portfolio"
        portfolio_dir.mkdir(parents=True, exist_ok=True)
        filepath = portfolio_dir / filename
        with open(filepath, "wb") as f:
            f.write(contents)
        media_url = f"/api/uploads/portfolio/{filename}"
    
    return {
        "message": "Fichier uploadé",
        "url": media_url,
        "type": media_type,
        "filename": filename
    }

@api_router.get("/uploads/portfolio/{filename}")
async def get_portfolio_media(filename: str):
    """Serve portfolio media (fallback for local storage)"""
    portfolio_dir = UPLOADS_DIR / "portfolio"
    filepath = portfolio_dir / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return FileResponse(filepath)

# ==================== CREATOR ROUTES ====================

VISIBILITY_ORDER = {"1K": 1, "5K": 2, "10K": 3, "35K": 4, "50K": 5, "100K": 6, "250K": 7, "1M": 8}

@api_router.get("/creators")
async def get_creators(
    city: Optional[str] = None,
    content_type: Optional[str] = None,
    available: Optional[bool] = None,
    min_score: Optional[int] = None,
    incubator_only: Optional[bool] = None,
    experience_level: Optional[str] = None,
    visibility: Optional[str] = None,  # Filter by minimum visibility
    skip: int = 0,
    limit: int = 20
):
    query = {"is_visible": True}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if content_type:
        query["content_types"] = content_type
    if available is not None:
        query["available"] = available
    if min_score is not None:
        query["completion_score"] = {"$gte": min_score}
    if experience_level:
        query["experience_level"] = experience_level
    if visibility:
        # Filter creators with visibility >= requested visibility
        min_order = VISIBILITY_ORDER.get(visibility, 0)
        valid_visibilities = [k for k, v in VISIBILITY_ORDER.items() if v >= min_order]
        query["visibility"] = {"$in": valid_visibilities}
    
    # Sort: Premium users first, then by completion score
    sort = [("is_premium", -1), ("completion_score", -1), ("rating", -1)]
    
    profiles = await db.creator_profiles.find(query, {"_id": 0}).sort(sort).skip(skip).limit(limit).to_list(limit)
    
    # Filter incubator only after getting premium info from users
    result = []
    for profile in profiles:
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})
        if user:
            is_premium = user.get("is_premium", False)
            if incubator_only and not is_premium:
                continue
            profile["name"] = user.get("name")
            profile["email"] = user.get("email")
            profile["picture"] = user.get("picture")
            profile["is_premium"] = is_premium
            
            # Add portfolio status
            video_count = len(profile.get("portfolio_videos", []))
            profile["portfolio_status"] = "complete" if video_count >= 3 else "incomplete"
            
            result.append(profile)
    
    return result

@api_router.get("/creators/{user_id}")
async def get_creator(user_id: str):
    profile = await db.creator_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user:
        profile["name"] = user.get("name")
        profile["email"] = user.get("email")
        profile["picture"] = user.get("picture")
        profile["banner"] = user.get("banner")
        profile["is_premium"] = user.get("is_premium", False)
    
    # Get reviews
    reviews = await db.reviews.find({"creator_id": user_id}, {"_id": 0}).to_list(50)
    profile["reviews"] = reviews
    
    # Portfolio status
    video_count = len(profile.get("portfolio_videos", []))
    profile["portfolio_status"] = "complete" if video_count >= 3 else "incomplete"
    
    return profile

@api_router.get("/creators/me/profile")
async def get_my_creator_profile(user: dict = Depends(get_current_user)):
    profile = await db.creator_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        # Create profile if doesn't exist
        profile = CreatorProfile(user_id=user["user_id"])
        await db.creator_profiles.insert_one(profile.model_dump())
        profile = profile.model_dump()
    
    profile["name"] = user.get("name")
    profile["email"] = user.get("email")
    profile["picture"] = user.get("picture")
    profile["banner"] = user.get("banner")
    profile["is_premium"] = user.get("is_premium", False)
    
    # Portfolio status
    video_count = len(profile.get("portfolio_videos", []))
    profile["portfolio_status"] = "complete" if video_count >= 3 else "incomplete"
    
    return profile

@api_router.put("/creators/me/profile")
async def update_my_creator_profile(update_data: CreatorProfileUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Get current profile to calculate new score
    current = await db.creator_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if current:
        merged = {**current, **update_dict}
        update_dict["completion_score"] = calculate_creator_completion(merged)
    
    result = await db.creator_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"message": "Profile updated", "completion_score": update_dict.get("completion_score", 0)}

# ==================== PORTFOLIO ROUTES ====================

@api_router.post("/creators/me/portfolio")
async def add_portfolio_video(request: Request, user: dict = Depends(get_current_user)):
    """Add a video to creator's portfolio"""
    body = await request.json()
    url = body.get("url")
    title = body.get("title", "")
    video_type = body.get("type", "link")  # "link" or "uploaded"
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    video_entry = {
        "url": url,
        "title": title,
        "type": video_type,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.creator_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$push": {"portfolio_videos": video_entry}}
    )
    
    if result.modified_count == 0:
        # Profile might not exist, create it
        profile = CreatorProfile(user_id=user["user_id"], portfolio_videos=[video_entry])
        await db.creator_profiles.insert_one(profile.model_dump())
    
    # Update completion score
    profile = await db.creator_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    new_score = calculate_creator_completion(profile)
    await db.creator_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"completion_score": new_score}}
    )
    
    return {"message": "Video added", "video": video_entry}

@api_router.delete("/creators/me/portfolio/{video_index}")
async def delete_portfolio_video(video_index: int, user: dict = Depends(get_current_user)):
    """Delete a video from creator's portfolio by index"""
    profile = await db.creator_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    videos = profile.get("portfolio_videos", [])
    
    if video_index < 0 or video_index >= len(videos):
        raise HTTPException(status_code=400, detail="Invalid video index")
    
    # Remove video at index
    deleted_video = videos.pop(video_index)
    
    # Update database
    await db.creator_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"portfolio_videos": videos}}
    )
    
    # Update completion score
    profile["portfolio_videos"] = videos
    new_score = calculate_creator_completion(profile)
    await db.creator_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"completion_score": new_score}}
    )
    
    return {"message": "Video deleted", "deleted": deleted_video}

# ==================== BUSINESS ROUTES ====================

@api_router.get("/business/me/profile")
async def get_my_business_profile(user: dict = Depends(get_current_user)):
    profile = await db.business_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        # Create profile if doesn't exist
        profile = BusinessProfile(user_id=user["user_id"])
        await db.business_profiles.insert_one(profile.model_dump())
        profile = profile.model_dump()
    
    profile["name"] = user.get("name")
    profile["email"] = user.get("email")
    return profile

@api_router.put("/business/me/profile")
async def update_my_business_profile(update_data: BusinessProfileUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Get current profile to calculate new score
    current = await db.business_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if current:
        merged = {**current, **update_dict}
        update_dict["completion_score"] = calculate_business_completion(merged)
    
    result = await db.business_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        # Create if doesn't exist
        profile = BusinessProfile(user_id=user["user_id"], **update_dict)
        await db.business_profiles.insert_one(profile.model_dump())
    
    return {"message": "Profile updated", "completion_score": update_dict.get("completion_score", 0)}

# ==================== PACKS ROUTES ====================

@api_router.get("/packs")
async def get_packs(pack_type: str = None):
    """Récupère les packs depuis MongoDB. Filtrer par type: 'business' ou 'creator'"""
    query = {"is_active": True}
    if pack_type:
        query["type"] = pack_type
    
    packs = await db.packs.find(query, {"_id": 0}).to_list(100)
    
    # Si aucun pack trouvé, retourner les packs par défaut (fallback)
    if not packs:
        packs = [
            {
                "pack_id": "business_starter",
                "name": "Starter",
                "type": "business",
                "price": 0,
                "features": ["1 projet actif", "Accès aux créateurs publics", "Support par email"],
                "is_popular": False
            },
            {
                "pack_id": "business_pro",
                "name": "Pro",
                "type": "business",
                "price": 49,
                "features": ["5 projets actifs", "Accès créateurs vérifiés", "Support prioritaire"],
                "is_popular": True
            }
        ]
    
    return packs

@api_router.post("/business/select-pack")
async def select_pack(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    pack_id = body.get("pack_id")
    
    await db.business_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"selected_pack": pack_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Pack selected", "pack_id": pack_id}

# ==================== PROJECT ROUTES ====================

@api_router.post("/projects")
async def create_project(project_data: ProjectCreate, user: dict = Depends(get_current_user)):
    """Create a new project - requires pack selection and banner image"""
    # Check if business has selected a pack
    profile = await db.business_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile or not profile.get("selected_pack"):
        raise HTTPException(status_code=400, detail="Sélectionnez un pack pour continuer")
    
    # Banner is required
    if not project_data.banner_url:
        raise HTTPException(status_code=400, detail="Une image de couverture est requise pour le projet")
    
    project = Project(
        business_id=user["user_id"],
        pack_id=project_data.pack_id,
        title=project_data.title,
        description=project_data.description,
        brief=project_data.brief,
        budget=project_data.budget,
        content_type=project_data.content_type,
        target_creators=project_data.target_creators,
        requirements=project_data.requirements,
        deliverables=project_data.deliverables,
        deadline=project_data.deadline,
        duration=project_data.duration,
        location=project_data.location,
        remote_ok=project_data.remote_ok,
        banner_url=project_data.banner_url,
        incubator_only=project_data.incubator_only
    )
    
    await db.projects.insert_one(project.model_dump())
    return {"project_id": project.project_id, "message": "Projet créé"}

@api_router.get("/projects")
async def get_projects(user: dict = Depends(get_current_user)):
    """Get projects based on user type"""
    if user.get("user_type") == "business":
        projects = await db.projects.find({"business_id": user["user_id"]}, {"_id": 0}).to_list(100)
    else:
        # Creators see available projects
        query = {"status": "open"}
        if not user.get("is_premium"):
            query["incubator_only"] = False
        projects = await db.projects.find(query, {"_id": 0}).to_list(100)
    
    # Enrich projects with business info
    enriched_projects = []
    for project in projects:
        business_user = await db.users.find_one({"user_id": project["business_id"]}, {"_id": 0})
        business_profile = await db.business_profiles.find_one({"user_id": project["business_id"]}, {"_id": 0})
        
        project["business_name"] = business_profile.get("company_name") if business_profile else None
        project["business_logo"] = business_user.get("picture") if business_user else None
        enriched_projects.append(project)
    
    return enriched_projects

@api_router.get("/projects/business")
async def get_business_projects(user: dict = Depends(get_current_user)):
    """Get all projects for the current business user"""
    if user.get("user_type") != "business":
        raise HTTPException(status_code=403, detail="Réservé aux entreprises")
    
    projects = await db.projects.find({"business_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return projects

@api_router.get("/projects/business/{project_id}")
async def get_business_project_detail(project_id: str, user: dict = Depends(get_current_user)):
    """Get a specific project with enriched applications data for business owner"""
    if user.get("user_type") != "business":
        raise HTTPException(status_code=403, detail="Réservé aux entreprises")
    
    project = await db.projects.find_one({"project_id": project_id, "business_id": user["user_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    # Enrich applications with creator data
    enriched_applications = []
    for app in project.get("applications", []):
        creator = await db.users.find_one({"user_id": app["creator_id"]}, {"_id": 0, "password": 0})
        if creator:
            enriched_applications.append({
                **app,
                "creator": {
                    "user_id": creator.get("user_id"),
                    "name": creator.get("name"),
                    "email": creator.get("email"),
                    "picture": creator.get("picture"),
                    "city": creator.get("city"),
                    "specialties": creator.get("specialties", []),
                    "follower_range": creator.get("follower_range"),
                    "is_premium": creator.get("is_premium", False),
                    "is_verified": creator.get("is_verified", False),
                    "rating": creator.get("rating", 5.0),
                    "social_links": creator.get("social_links", {}),
                }
            })
    
    project["applications"] = enriched_applications
    return project

@api_router.put("/projects/business/{project_id}/application/{creator_id}")
async def update_application_status(project_id: str, creator_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Update the status of an application (accept/reject)"""
    if user.get("user_type") != "business":
        raise HTTPException(status_code=403, detail="Réservé aux entreprises")
    
    body = await request.json()
    new_status = body.get("status")  # "accepted", "rejected", "pending"
    
    if new_status not in ["accepted", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    project = await db.projects.find_one({"project_id": project_id, "business_id": user["user_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    # Update the application status
    result = await db.projects.update_one(
        {"project_id": project_id, "applications.creator_id": creator_id},
        {"$set": {"applications.$.status": new_status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    
    # If accepting, optionally update project status to in_progress
    if new_status == "accepted":
        await db.projects.update_one(
            {"project_id": project_id},
            {"$set": {"status": "in_progress"}}
        )
    
    # Send email and notification to creator
    if new_status in ["accepted", "rejected"]:
        creator = await db.users.find_one({"user_id": creator_id}, {"_id": 0})
        if creator:
            await send_application_status_email(
                creator_email=creator["email"],
                creator_name=creator.get("name"),
                project_title=project["title"],
                status=new_status
            )
            
            # Create notification for creator
            if new_status == "accepted":
                await create_notification(
                    user_id=creator_id,
                    notif_type="accepted",
                    title="Candidature acceptée ! 🎉",
                    message=f"Votre candidature pour \"{project['title']}\" a été acceptée !",
                    icon="✅",
                    link=f"/projects/{project_id}",
                    data={"project_id": project_id}
                )
            else:
                await create_notification(
                    user_id=creator_id,
                    notif_type="rejected",
                    title="Candidature non retenue",
                    message=f"Votre candidature pour \"{project['title']}\" n'a pas été retenue.",
                    icon="❌",
                    link="/projects",
                    data={"project_id": project_id}
                )
    
    return {"message": "Statut mis à jour"}

@api_router.post("/projects/{project_id}/apply")
async def apply_to_project(project_id: str, user: dict = Depends(get_current_user)):
    """Creator applies to a project"""
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("incubator_only") and not user.get("is_premium"):
        raise HTTPException(status_code=403, detail="Réservé aux membres Incubateur")
    
    # Check if already applied
    applications = project.get("applications", [])
    if any(a["creator_id"] == user["user_id"] for a in applications):
        raise HTTPException(status_code=400, detail="Déjà candidaté")
    
    application = {
        "creator_id": user["user_id"],
        "status": "pending",
        "applied_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.update_one(
        {"project_id": project_id},
        {"$push": {"applications": application}}
    )
    
    # Send email notification to business
    business = await db.users.find_one({"user_id": project["business_id"]}, {"_id": 0})
    if business:
        await send_new_application_email(
            business_email=business["email"],
            business_name=business.get("name") or business.get("company_name"),
            project_title=project["title"],
            creator_name=user.get("name") or "Un créateur"
        )
        
        # Create notification for business
        await create_notification(
            user_id=project["business_id"],
            notif_type="application",
            title="Nouvelle candidature !",
            message=f"{user.get('name', 'Un créateur')} a postulé à votre projet \"{project['title']}\"",
            icon="🎯",
            link=f"/business/projects/{project_id}",
            data={"project_id": project_id, "creator_id": user["user_id"]}
        )
    
    return {"message": "Candidature envoyée"}

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Business updates their project - sets status back to pending if modified"""
    if user.get("user_type") != "business":
        raise HTTPException(status_code=403, detail="Réservé aux entreprises")
    
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project["business_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    body = await request.json()
    
    # Fields that can be updated
    allowed_fields = [
        "title", "description", "brief", "budget", "content_type",
        "target_creators", "requirements", "deliverables", "deadline",
        "duration", "location", "remote_ok", "banner_url", "incubator_only"
    ]
    
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    
    if update_data:
        # If significant changes, reset applications to pending
        significant_fields = ["title", "description", "brief", "budget", "requirements", "deliverables"]
        has_significant_change = any(k in update_data for k in significant_fields)
        
        if has_significant_change and project.get("applications"):
            # Reset all application statuses to pending
            await db.projects.update_one(
                {"project_id": project_id},
                {"$set": {"applications.$[].status": "pending"}}
            )
        
        await db.projects.update_one(
            {"project_id": project_id},
            {"$set": update_data}
        )
    
    return {"message": "Projet mis à jour"}

# ==================== TRAINING ROUTES ====================

@api_router.get("/trainings")
async def get_trainings(user: dict = Depends(get_current_user)):
    """Get available trainings"""
    trainings = [
        {
            "training_id": "train_basics",
            "title": "Les bases de l'UGC",
            "description": "Apprenez les fondamentaux de la création de contenu UGC",
            "category": "Fondamentaux",
            "duration": "45 min",
            "is_premium": False,
            "thumbnail": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400"
        },
        {
            "training_id": "train_micro",
            "title": "Micro-trottoir : Guide complet",
            "description": "Maîtrisez l'art du micro-trottoir authentique",
            "category": "Spécialisation",
            "duration": "1h30",
            "is_premium": False,
            "thumbnail": "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=400"
        },
        {
            "training_id": "train_ads",
            "title": "Créer des Ads qui convertissent",
            "description": "Techniques avancées pour des publicités performantes",
            "category": "Avancé",
            "duration": "2h",
            "is_premium": True,
            "thumbnail": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400"
        },
        {
            "training_id": "train_pricing",
            "title": "Comment fixer ses tarifs",
            "description": "Stratégies de pricing pour créateurs",
            "category": "Business",
            "duration": "1h",
            "is_premium": True,
            "thumbnail": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400"
        }
    ]
    
    # Add completion status
    for t in trainings:
        t["is_completed"] = user["user_id"] in t.get("completed_by", [])
        t["is_locked"] = t["is_premium"] and not user.get("is_premium")
    
    return trainings

@api_router.post("/trainings/{training_id}/complete")
async def complete_training(training_id: str, user: dict = Depends(get_current_user)):
    """Mark training as completed - boosts visibility"""
    # Update creator profile with training completion
    await db.creator_profiles.update_one(
        {"user_id": user["user_id"]},
        {
            "$addToSet": {"completed_trainings": training_id},
            "$inc": {"completion_score": 5}  # Bonus for completing training
        }
    )
    
    return {"message": "Formation complétée", "bonus": "+5 points visibilité"}

# ==================== INCUBATOR ROUTES ====================

@api_router.get("/incubator/info")
async def get_incubator_info():
    """Get incubator premium program info"""
    return {
        "name": "Incubateur Premium",
        "price": 49,  # €/month
        "benefits": [
            "Priorité dans l'algorithme de recherche",
            "Badge Premium visible sur le profil",
            "Accès aux formations avancées",
            "Briefs exclusifs réservés",
            "Support prioritaire",
            "Statistiques avancées"
        ],
        "stats": {
            "members": 45,
            "avg_earnings_boost": "+150%"
        }
    }

@api_router.post("/incubator/join")
async def join_incubator(user: dict = Depends(get_current_user)):
    """Join incubator premium (mock - would integrate Stripe)"""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"is_premium": True}}
    )
    
    return {"message": "Bienvenue dans l'Incubateur Premium !"}

# ==================== STATS ROUTES ====================

@api_router.get("/stats/platform")
async def get_platform_stats():
    creators_count = await db.creator_profiles.count_documents({})
    businesses_count = await db.business_profiles.count_documents({})
    projects_count = await db.projects.count_documents({"status": "completed"})
    
    return {
        "creators_count": max(creators_count, 150),
        "businesses_count": max(businesses_count, 45),
        "projects_count": projects_count,
        "incubator_members": 45
    }

@api_router.get("/stats/creator")
async def get_creator_stats(user: dict = Depends(get_current_user)):
    profile = await db.creator_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    projects = await db.projects.find({"applications.creator_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    return {
        "completion_score": profile.get("completion_score", 0) if profile else 0,
        "reliability_score": profile.get("reliability_score", 0) if profile else 0,
        "performance_score": profile.get("performance_score", 0) if profile else 0,
        "rating": profile.get("rating", 0) if profile else 0,
        "reviews_count": profile.get("reviews_count", 0) if profile else 0,
        "completed_projects": len([p for p in projects if p.get("status") == "completed"]),
        "active_applications": len([p for p in projects if p.get("status") == "open"]),
        "verification_status": profile.get("verification_status", "unverified") if profile else "unverified",
        "is_premium": user.get("is_premium", False)
    }

@api_router.get("/stats/business")
async def get_business_stats(user: dict = Depends(get_current_user)):
    profile = await db.business_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    projects = await db.projects.find({"business_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    return {
        "completion_score": profile.get("completion_score", 0) if profile else 0,
        "selected_pack": profile.get("selected_pack") if profile else None,
        "total_projects": len(projects),
        "active_projects": len([p for p in projects if p.get("status") in ["open", "in_progress"]]),
        "completed_projects": len([p for p in projects if p.get("status") == "completed"])
    }

# ==================== NOTIFICATION ROUTES ====================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user), limit: int = 20, unread_only: bool = False):
    """Get user notifications"""
    query = {"user_id": user["user_id"]}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Count unread
    unread_count = await db.notifications.count_documents({
        "user_id": user["user_id"],
        "is_read": False
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    result = await db.notifications.update_many(
        {"user_id": user["user_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": f"{result.modified_count} notifications marked as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one(
        {"notification_id": notification_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

# ==================== WALLET ROUTES ====================

PLATFORM_FEE_PERCENT = 15  # 15% platform fee

@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    """Get creator wallet info and transactions"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Réservé aux créateurs")
    
    # Get wallet info
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wallet:
        # Create wallet if doesn't exist
        wallet = {
            "user_id": user["user_id"],
            "balance": 0.0,
            "total_earned": 0.0,
            "total_withdrawn": 0.0,
            "pending_amount": 0.0,
            "payment_methods": {
                "paypal_email": None,
                "bank_iban": None,
                "bank_bic": None,
                "bank_holder_name": None
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    # Get recent transactions
    transactions = await db.wallet_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Convert datetime to string for JSON serialization
    for tx in transactions:
        if isinstance(tx.get("created_at"), datetime):
            tx["created_at"] = tx["created_at"].isoformat()
        if isinstance(tx.get("processed_at"), datetime):
            tx["processed_at"] = tx["processed_at"].isoformat()
    
    # Determine fee rate based on premium status
    is_premium = user.get("is_premium", False)
    fee_percent = 0 if is_premium else PLATFORM_FEE_PERCENT
    
    return {
        "balance": wallet.get("balance", 0),
        "total_earned": wallet.get("total_earned", 0),
        "total_withdrawn": wallet.get("total_withdrawn", 0),
        "pending_amount": wallet.get("pending_amount", 0),
        "payment_methods": wallet.get("payment_methods", {}),
        "transactions": transactions,
        "platform_fee_percent": fee_percent,
        "is_premium": is_premium
    }

@api_router.put("/wallet/payment-methods")
async def update_payment_methods(data: PaymentMethodUpdate, user: dict = Depends(get_current_user)):
    """Update payment methods (PayPal or Bank)"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Réservé aux créateurs")
    
    update_data = {}
    if data.paypal_email is not None:
        update_data["payment_methods.paypal_email"] = data.paypal_email
    if data.bank_iban is not None:
        update_data["payment_methods.bank_iban"] = data.bank_iban
    if data.bank_bic is not None:
        update_data["payment_methods.bank_bic"] = data.bank_bic
    if data.bank_holder_name is not None:
        update_data["payment_methods.bank_holder_name"] = data.bank_holder_name
    
    if update_data:
        await db.wallets.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data},
            upsert=True
        )
    
    return {"message": "Méthodes de paiement mises à jour"}

@api_router.post("/wallet/withdraw")
async def request_withdrawal(data: WithdrawalRequest, user: dict = Depends(get_current_user)):
    """Request a withdrawal from wallet"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Réservé aux créateurs")
    
    # PayPal not available yet
    if data.method == "paypal":
        raise HTTPException(status_code=400, detail="PayPal bientôt disponible")
    
    # Get wallet
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet non trouvé")
    
    # Check balance
    available = wallet.get("balance", 0) - wallet.get("pending_amount", 0)
    if data.amount > available:
        raise HTTPException(status_code=400, detail=f"Solde insuffisant. Disponible: {available}€")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Montant invalide")
    
    # For bank transfer, require IBAN
    if data.method == "bank_transfer":
        iban = data.iban or wallet.get("payment_methods", {}).get("bank_iban")
        bic = data.bic or wallet.get("payment_methods", {}).get("bank_bic")
        if not iban:
            raise HTTPException(status_code=400, detail="IBAN requis pour le virement")
    
    # Create withdrawal transaction
    transaction = WalletTransaction(
        user_id=user["user_id"],
        amount=data.amount,
        net_amount=data.amount,  # No additional fee on withdrawal
        fee_amount=0,
        transaction_type="withdrawal",
        status="pending",
        description="Demande de retrait",
        withdrawal_method=data.method,
        bank_iban=iban if data.method == "bank_transfer" else None,
        bank_bic=bic if data.method == "bank_transfer" else None
    )
    
    await db.wallet_transactions.insert_one(transaction.model_dump())
    
    # Update pending amount in wallet
    await db.wallets.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"pending_amount": data.amount}}
    )
    
    return {
        "message": "Demande de retrait envoyée",
        "transaction_id": transaction.transaction_id,
        "amount": data.amount,
        "status": "pending"
    }

@api_router.get("/wallet/transactions")
async def get_wallet_transactions(
    user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50
):
    """Get all wallet transactions"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Réservé aux créateurs")
    
    transactions = await db.wallet_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for tx in transactions:
        if isinstance(tx.get("created_at"), datetime):
            tx["created_at"] = tx["created_at"].isoformat()
        if isinstance(tx.get("processed_at"), datetime):
            tx["processed_at"] = tx["processed_at"].isoformat()
    
    return transactions

# Admin route to add earnings to creator wallet (called when project payment validated)
@api_router.post("/admin/wallet/add-earning")
async def admin_add_earning(request: Request, user: dict = Depends(get_admin_user)):
    """Admin: Add earning to creator wallet (manual validation)"""
    # In production, check if user is admin
    body = await request.json()
    creator_id = body.get("creator_id")
    gross_amount = body.get("amount")
    project_id = body.get("project_id")
    description = body.get("description", "Paiement mission")
    
    if not creator_id or not gross_amount:
        raise HTTPException(status_code=400, detail="creator_id et amount requis")
    
    # Check if creator is premium (no fees for premium)
    creator = await db.users.find_one({"user_id": creator_id}, {"_id": 0})
    is_premium = creator.get("is_premium", False) if creator else False
    
    # Calculate fee (0% for premium, 15% for standard)
    if is_premium:
        fee_amount = 0
        net_amount = gross_amount
    else:
        fee_amount = round(gross_amount * PLATFORM_FEE_PERCENT / 100, 2)
        net_amount = gross_amount - fee_amount
    
    # Create transaction
    transaction = WalletTransaction(
        user_id=creator_id,
        amount=gross_amount,
        net_amount=net_amount,
        fee_amount=fee_amount,
        transaction_type="earning",
        status="completed",
        description=description,
        project_id=project_id,
        processed_at=datetime.now(timezone.utc)
    )
    
    await db.wallet_transactions.insert_one(transaction.model_dump())
    
    # Update wallet balance
    await db.wallets.update_one(
        {"user_id": creator_id},
        {
            "$inc": {
                "balance": net_amount,
                "total_earned": net_amount
            }
        },
        upsert=True
    )
    
    return {
        "message": "Paiement ajouté",
        "transaction_id": transaction.transaction_id,
        "gross_amount": gross_amount,
        "fee_amount": fee_amount,
        "net_amount": net_amount
    }

# Admin route to process withdrawal
@api_router.post("/admin/wallet/process-withdrawal")
async def admin_process_withdrawal(request: Request, user: dict = Depends(get_admin_user)):
    """Admin: Approve or reject withdrawal request"""
    body = await request.json()
    transaction_id = body.get("transaction_id")
    action = body.get("action")  # "approve" or "reject"
    admin_note = body.get("admin_note")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action invalide")
    
    tx = await db.wallet_transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    
    if tx["status"] != "pending":
        raise HTTPException(status_code=400, detail="Transaction déjà traitée")
    
    new_status = "completed" if action == "approve" else "rejected"
    
    # Update transaction
    await db.wallet_transactions.update_one(
        {"transaction_id": transaction_id},
        {
            "$set": {
                "status": new_status,
                "admin_note": admin_note,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update wallet
    if action == "approve":
        await db.wallets.update_one(
            {"user_id": tx["user_id"]},
            {
                "$inc": {
                    "balance": -tx["amount"],
                    "pending_amount": -tx["amount"],
                    "total_withdrawn": tx["amount"]
                }
            }
        )
    else:
        # Rejected - just remove from pending
        await db.wallets.update_one(
            {"user_id": tx["user_id"]},
            {"$inc": {"pending_amount": -tx["amount"]}}
        )
    
    # Send email notification to creator
    creator = await db.users.find_one({"user_id": tx["user_id"]}, {"_id": 0})
    if creator:
        await send_withdrawal_status_email(
            creator_email=creator["email"],
            creator_name=creator.get("name"),
            amount=tx["amount"],
            status="approved" if action == "approve" else "rejected"
        )
    
    return {"message": f"Retrait {new_status}", "status": new_status}

# ==================== ADMIN DASHBOARD ROUTES ====================

@api_router.get("/admin/check")
async def check_admin_access(user: dict = Depends(get_current_user)):
    """Check if current user has admin access"""
    return {"is_admin": is_admin(user)}

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    # Count users by type
    total_creators = await db.users.count_documents({"user_type": "creator"})
    total_businesses = await db.users.count_documents({"user_type": "business"})
    premium_creators = await db.users.count_documents({"user_type": "creator", "is_premium": True})
    
    # Pending items
    pending_withdrawals = await db.wallet_transactions.count_documents({"transaction_type": "withdrawal", "status": "pending"})
    pending_access_requests = await db.access_requests.count_documents({"status": "pending"})
    
    # Projects
    total_projects = await db.projects.count_documents({})
    open_projects = await db.projects.count_documents({"status": "open"})
    
    # Revenue (sum of completed withdrawals = money paid out)
    pipeline = [
        {"$match": {"transaction_type": "earning", "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$fee_amount"}}}
    ]
    fee_result = await db.wallet_transactions.aggregate(pipeline).to_list(1)
    total_fees_collected = fee_result[0]["total"] if fee_result else 0
    
    # Pending withdrawal amount
    pending_pipeline = [
        {"$match": {"transaction_type": "withdrawal", "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    pending_result = await db.wallet_transactions.aggregate(pending_pipeline).to_list(1)
    pending_withdrawal_amount = pending_result[0]["total"] if pending_result else 0
    
    return {
        "users": {
            "total_creators": total_creators,
            "total_businesses": total_businesses,
            "premium_creators": premium_creators,
            "total": total_creators + total_businesses
        },
        "pending": {
            "withdrawals": pending_withdrawals,
            "withdrawal_amount": pending_withdrawal_amount,
            "access_requests": pending_access_requests
        },
        "projects": {
            "total": total_projects,
            "open": open_projects
        },
        "revenue": {
            "total_fees_collected": total_fees_collected
        }
    }

@api_router.get("/admin/users")
async def get_admin_users(
    user: dict = Depends(get_admin_user),
    user_type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all users for admin management"""
    query = {}
    if user_type:
        query["user_type"] = user_type
    if status == "premium":
        query["is_premium"] = True
    elif status == "verified":
        query["verification_status"] = {"$in": ["portfolio_validated", "incubator_certified"]}
    
    users = await db.users.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with profile data
    enriched = []
    for u in users:
        if u.get("user_type") == "creator":
            profile = await db.creator_profiles.find_one({"user_id": u["user_id"]}, {"_id": 0})
        else:
            profile = await db.business_profiles.find_one({"user_id": u["user_id"]}, {"_id": 0})
        
        u["profile"] = profile
        # Convert datetime
        if isinstance(u.get("created_at"), datetime):
            u["created_at"] = u["created_at"].isoformat()
        enriched.append(u)
    
    total = await db.users.count_documents(query)
    return {"users": enriched, "total": total}

@api_router.put("/admin/users/{user_id}/verify")
async def admin_verify_user(user_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Admin: Update user verification status"""
    body = await request.json()
    new_status = body.get("status")  # "verified", "portfolio_validated", "incubator_certified", "suspended"
    
    valid_statuses = ["unverified", "verified", "portfolio_validated", "incubator_certified", "suspended"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"verification_status": new_status}}
    )
    
    return {"message": "Statut mis à jour", "status": new_status}

@api_router.put("/admin/users/{user_id}/premium")
async def admin_toggle_premium(user_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Admin: Toggle user premium status"""
    body = await request.json()
    is_premium = body.get("is_premium", False)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_premium": is_premium}}
    )
    
    return {"message": "Premium mis à jour", "is_premium": is_premium}

@api_router.put("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Admin: Ban or unban a user"""
    body = await request.json()
    is_banned = body.get("is_banned", True)
    reason = body.get("reason", "")
    
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "is_banned": is_banned,
                "ban_reason": reason if is_banned else None,
                "banned_at": datetime.now(timezone.utc).isoformat() if is_banned else None
            }
        }
    )
    
    return {"message": "Utilisateur banni" if is_banned else "Utilisateur débanni", "is_banned": is_banned}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(get_admin_user)):
    """Admin: Permanently delete a user and all their data"""
    # Get user info first
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    user_type = target_user.get("user_type")
    
    # Delete user
    await db.users.delete_one({"user_id": user_id})
    
    # Delete profile based on type
    if user_type == "creator":
        await db.creator_profiles.delete_one({"user_id": user_id})
        # Delete wallet
        await db.wallets.delete_one({"user_id": user_id})
        await db.wallet_transactions.delete_many({"user_id": user_id})
    else:
        await db.business_profiles.delete_one({"user_id": user_id})
        # Delete their projects
        await db.projects.delete_many({"business_id": user_id})
    
    # Delete reviews
    await db.reviews.delete_many({"$or": [{"reviewer_id": user_id}, {"reviewed_id": user_id}]})
    
    return {"message": "Utilisateur et données supprimés", "user_id": user_id}

@api_router.get("/admin/withdrawals")
async def get_admin_withdrawals(
    user: dict = Depends(get_admin_user),
    status: Optional[str] = "pending",
    skip: int = 0,
    limit: int = 50
):
    """Get all withdrawal requests"""
    query = {"transaction_type": "withdrawal"}
    if status:
        query["status"] = status
    
    withdrawals = await db.wallet_transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user data
    enriched = []
    for w in withdrawals:
        user_data = await db.users.find_one({"user_id": w["user_id"]}, {"_id": 0, "name": 1, "email": 1, "picture": 1})
        w["user"] = user_data
        if isinstance(w.get("created_at"), datetime):
            w["created_at"] = w["created_at"].isoformat()
        if isinstance(w.get("processed_at"), datetime):
            w["processed_at"] = w["processed_at"].isoformat()
        enriched.append(w)
    
    total = await db.wallet_transactions.count_documents(query)
    return {"withdrawals": enriched, "total": total}

@api_router.get("/admin/projects")
async def get_admin_projects(
    user: dict = Depends(get_admin_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all projects for admin"""
    query = {}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with business data
    enriched = []
    for p in projects:
        business = await db.users.find_one({"user_id": p["business_id"]}, {"_id": 0, "name": 1, "email": 1})
        business_profile = await db.business_profiles.find_one({"user_id": p["business_id"]}, {"_id": 0, "company_name": 1})
        p["business"] = business
        p["company_name"] = business_profile.get("company_name") if business_profile else None
        if isinstance(p.get("created_at"), datetime):
            p["created_at"] = p["created_at"].isoformat()
        enriched.append(p)
    
    total = await db.projects.count_documents(query)
    return {"projects": enriched, "total": total}

@api_router.put("/admin/projects/{project_id}/status")
async def admin_update_project_status(project_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Admin: Update project status"""
    body = await request.json()
    new_status = body.get("status")
    
    valid_statuses = ["open", "in_progress", "completed", "cancelled", "suspended"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"status": new_status}}
    )
    
    return {"message": "Statut mis à jour", "status": new_status}

@api_router.get("/admin/access-requests")
async def get_admin_access_requests(
    user: dict = Depends(get_admin_user),
    status: Optional[str] = "pending",
    skip: int = 0,
    limit: int = 50
):
    """Get all access requests"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.access_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for r in requests:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
    
    total = await db.access_requests.count_documents(query)
    return {"requests": requests, "total": total}

@api_router.put("/admin/access-requests/{request_id}")
async def admin_process_access_request(request_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Admin: Approve or reject access request"""
    body = await request.json()
    action = body.get("action")  # "approve" or "reject"
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action invalide")
    
    new_status = "approved" if action == "approve" else "rejected"
    
    await db.access_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": new_status, "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Demande {new_status}", "status": new_status}

# ==================== ADMIN USER SEARCH ====================

@api_router.get("/admin/users/search")
async def admin_search_users(
    q: str,
    user_type: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Search users by name, email or ID"""
    if not q or len(q) < 2:
        return []
    
    # Build query
    search_query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"user_id": {"$regex": q, "$options": "i"}}
        ]
    }
    
    if user_type and user_type != "all":
        search_query["user_type"] = user_type
    
    users = await db.users.find(
        search_query,
        {"_id": 0, "password": 0}
    ).limit(limit).to_list(limit)
    
    # Enrich with profile info
    for u in users:
        if u.get("user_type") == "creator":
            profile = await db.creator_profiles.find_one(
                {"user_id": u["user_id"]},
                {"_id": 0, "bio": 1, "location": 1, "specialties": 1}
            )
            if profile:
                u["profile"] = profile
            # Get wallet balance
            wallet = await db.wallets.find_one(
                {"user_id": u["user_id"]},
                {"_id": 0, "balance": 1, "pending_balance": 1}
            )
            u["wallet"] = wallet or {"balance": 0, "pending_balance": 0}
        elif u.get("user_type") == "business":
            profile = await db.business_profiles.find_one(
                {"user_id": u["user_id"]},
                {"_id": 0, "company_name": 1, "industry": 1, "website": 1}
            )
            if profile:
                u["profile"] = profile
    
    return users

@api_router.get("/admin/users/{user_id}/full")
async def admin_get_user_full(user_id: str, user: dict = Depends(get_admin_user)):
    """Get complete user info including profile, wallet, activity"""
    target_user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password": 0}
    )
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    result = {**target_user}
    
    # Get profile
    if target_user.get("user_type") == "creator":
        profile = await db.creator_profiles.find_one({"user_id": user_id}, {"_id": 0})
        result["profile"] = profile
        
        # Get wallet
        wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
        result["wallet"] = wallet or {"balance": 0, "pending_balance": 0}
        
        # Get recent transactions
        transactions = await db.wallet_transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        result["recent_transactions"] = transactions
        
        # Get applications
        applications = await db.applications.find(
            {"creator_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        result["recent_applications"] = applications
        
    elif target_user.get("user_type") == "business":
        profile = await db.business_profiles.find_one({"user_id": user_id}, {"_id": 0})
        result["profile"] = profile
        
        # Get their projects
        projects = await db.projects.find(
            {"business_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        result["projects"] = projects
    
    # Get affiliate info if exists
    affiliate = await db.affiliate_codes.find_one({"user_id": user_id}, {"_id": 0})
    if affiliate:
        result["affiliate_code"] = affiliate.get("code")
        
        # Get referral stats
        referral_count = await db.affiliate_referrals.count_documents({"referrer_id": user_id})
        result["referrals_count"] = referral_count
    
    # Check if referred by someone
    if target_user.get("referrer_id"):
        referrer = await db.users.find_one(
            {"user_id": target_user["referrer_id"]},
            {"_id": 0, "name": 1, "email": 1}
        )
        result["referred_by"] = referrer
    
    # Get reviews
    reviews_received = await db.reviews.count_documents({"reviewee_id": user_id})
    result["reviews_count"] = reviews_received
    
    # Get conversations count
    conversations_count = await db.conversations.count_documents({
        "$or": [{"creator_id": user_id}, {"company_id": user_id}]
    })
    result["conversations_count"] = conversations_count
    
    return result

# ==================== ADMIN QUICK CREDIT ====================

@api_router.post("/admin/wallet/quick-credit")
async def admin_quick_credit(request: Request, user: dict = Depends(get_admin_user)):
    """Quick credit a user's wallet"""
    body = await request.json()
    user_id = body.get("user_id")
    amount = body.get("amount", 0)
    description = body.get("description", "Crédit admin")
    credit_type = body.get("credit_type", "bonus")  # bonus, refund, correction, payment
    
    if not user_id or amount <= 0:
        raise HTTPException(status_code=400, detail="user_id et montant positif requis")
    
    # Verify user exists and is creator
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if target_user.get("user_type") != "creator":
        raise HTTPException(status_code=400, detail="Seuls les créateurs ont une cagnotte")
    
    # Get or create wallet
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        wallet = {
            "wallet_id": f"wallet_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "balance": 0,
            "pending_balance": 0,
            "total_earned": 0,
            "total_withdrawn": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    # Create transaction
    transaction = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "transaction_type": "admin_credit",
        "credit_type": credit_type,
        "amount": amount,
        "fee_amount": 0,
        "net_amount": amount,
        "description": description,
        "status": "completed",
        "admin_id": user["user_id"],
        "admin_name": user.get("name", "Admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(transaction)
    
    # Update wallet balance
    await db.wallets.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "balance": amount,
                "total_earned": amount
            }
        }
    )
    
    # Get updated wallet
    updated_wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "message": f"{amount}€ crédités à {target_user.get('name', 'utilisateur')}",
        "transaction_id": transaction["transaction_id"],
        "new_balance": updated_wallet.get("balance", 0),
        "user": {
            "user_id": user_id,
            "name": target_user.get("name"),
            "email": target_user.get("email")
        }
    }

# ==================== ADMIN NOTIFICATIONS ADVANCED ====================

@api_router.post("/admin/notifications/preview")
async def preview_notification_recipients(request: Request, user: dict = Depends(get_admin_user)):
    """Preview how many users will receive the notification"""
    body = await request.json()
    target = body.get("target", "all")
    filters = body.get("filters", {})
    user_ids = body.get("user_ids", [])
    
    query = {}
    
    if user_ids:
        # Specific users
        query["user_id"] = {"$in": user_ids}
    else:
        # Build query based on target
        if target == "creators":
            query["user_type"] = "creator"
        elif target == "businesses":
            query["user_type"] = "business"
        elif target != "all":
            # Specific user
            query["user_id"] = target
        else:
            query["user_type"] = {"$in": ["creator", "business"]}
        
        # Apply filters
        if filters.get("is_premium"):
            query["is_premium"] = True
        if filters.get("is_subscribed"):
            query["is_subscribed"] = True
        if filters.get("is_verified"):
            query["verification_status"] = "verified"
        if filters.get("has_affiliate"):
            affiliate_user_ids = await db.affiliate_codes.distinct("user_id")
            query["user_id"] = {"$in": affiliate_user_ids}
    
    count = await db.users.count_documents(query)
    
    # Get sample of recipients
    sample = await db.users.find(
        query,
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "user_type": 1}
    ).limit(5).to_list(5)
    
    return {
        "count": count,
        "sample": sample
    }

@api_router.post("/admin/notifications/send-advanced")
async def send_advanced_notification(request: Request, user: dict = Depends(get_admin_user)):
    """Send notification with advanced targeting"""
    body = await request.json()
    target = body.get("target", "all")
    filters = body.get("filters", {})
    user_ids = body.get("user_ids", [])
    title = body.get("title")
    message = body.get("message")
    notification_type = body.get("type", "info")
    link = body.get("link")  # Optional link
    
    if not title or not message:
        raise HTTPException(status_code=400, detail="Titre et message requis")
    
    query = {}
    
    if user_ids:
        # Specific users
        query["user_id"] = {"$in": user_ids}
    else:
        # Build query based on target
        if target == "creators":
            query["user_type"] = "creator"
        elif target == "businesses":
            query["user_type"] = "business"
        elif target != "all":
            # Specific user ID
            query["user_id"] = target
        else:
            query["user_type"] = {"$in": ["creator", "business"]}
        
        # Apply filters
        if filters.get("is_premium"):
            query["is_premium"] = True
        if filters.get("is_subscribed"):
            query["is_subscribed"] = True
        if filters.get("is_verified"):
            query["verification_status"] = "verified"
        if filters.get("has_affiliate"):
            affiliate_user_ids = await db.affiliate_codes.distinct("user_id")
            if "user_id" in query:
                query["user_id"] = {"$in": list(set(query["user_id"].get("$in", [])) & set(affiliate_user_ids))}
            else:
                query["user_id"] = {"$in": affiliate_user_ids}
    
    # Get target users
    target_users = await db.users.find(query, {"_id": 0, "user_id": 1}).to_list(10000)
    
    if not target_users:
        raise HTTPException(status_code=400, detail="Aucun destinataire trouvé")
    
    # Create notifications
    notifications = []
    for target_user in target_users:
        notif = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": target_user["user_id"],
            "type": notification_type,
            "title": title,
            "message": message,
            "link": link,
            "is_read": False,
            "is_admin": True,
            "sent_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        notifications.append(notif)
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    # Log this action
    log_entry = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "action": "notification_sent",
        "admin_id": user["user_id"],
        "admin_name": user.get("name"),
        "details": {
            "target": target,
            "filters": filters,
            "user_ids": user_ids[:10] if user_ids else [],
            "recipient_count": len(notifications),
            "title": title
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_logs.insert_one(log_entry)
    
    return {
        "message": f"Notification envoyée à {len(notifications)} utilisateur(s)",
        "count": len(notifications)
    }

# ==================== ADMIN AFFILIATE MANAGEMENT ====================

@api_router.get("/admin/affiliates")
async def get_admin_affiliates(user: dict = Depends(get_admin_user)):
    """Get all affiliates with their stats"""
    # Get all affiliate codes
    affiliates = await db.affiliate_codes.find({}, {"_id": 0}).to_list(500)
    
    result = []
    for aff in affiliates:
        # Get user info
        aff_user = await db.users.find_one(
            {"user_id": aff["user_id"]},
            {"_id": 0, "name": 1, "email": 1, "picture": 1, "user_type": 1}
        )
        
        # Get stats
        stats = await db.affiliate_stats.find_one(
            {"user_id": aff["user_id"]},
            {"_id": 0}
        )
        
        # Count referrals
        referral_count = await db.affiliate_referrals.count_documents({"referrer_id": aff["user_id"]})
        paying_count = await db.affiliate_referrals.count_documents({
            "referrer_id": aff["user_id"],
            "status": "paying"
        })
        
        result.append({
            "user_id": aff["user_id"],
            "code": aff["code"],
            "created_at": aff["created_at"].isoformat() if isinstance(aff["created_at"], datetime) else aff["created_at"],
            "user": aff_user,
            "stats": {
                "total_clicks": stats.get("total_clicks", 0) if stats else 0,
                "total_signups": referral_count,
                "paying_users": paying_count,
                "mrr_generated": stats.get("mrr_generated", 0) if stats else 0,
                "pending_earnings": stats.get("pending_earnings", 0) if stats else 0,
                "validated_earnings": stats.get("validated_earnings", 0) if stats else 0
            }
        })
    
    # Sort by signups desc
    result.sort(key=lambda x: x["stats"]["total_signups"], reverse=True)
    
    return result

@api_router.get("/admin/affiliates/{user_id}/referrals")
async def get_admin_affiliate_referrals(user_id: str, user: dict = Depends(get_admin_user)):
    """Get all referrals for a specific affiliate"""
    referrals = await db.affiliate_referrals.find(
        {"referrer_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for ref in referrals:
        # Get referred user info
        referred = await db.users.find_one(
            {"user_id": ref["referred_user_id"]},
            {"_id": 0, "name": 1, "email": 1, "user_type": 1, "is_subscribed": 1, "is_premium": 1}
        )
        ref["referred_user"] = referred
        if isinstance(ref.get("created_at"), datetime):
            ref["created_at"] = ref["created_at"].isoformat()
    
    return referrals

@api_router.put("/admin/affiliates/{user_id}/commission-rate")
async def update_affiliate_commission_rate(user_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Update commission rate for an affiliate"""
    body = await request.json()
    rate = body.get("rate", 0.20)
    
    if rate < 0 or rate > 1:
        raise HTTPException(status_code=400, detail="Le taux doit être entre 0 et 1")
    
    # Update all referrals for this affiliate
    await db.affiliate_referrals.update_many(
        {"referrer_id": user_id},
        {"$set": {"commission_rate": rate}}
    )
    
    return {"user_id": user_id, "commission_rate": rate}

@api_router.post("/admin/affiliates/{user_id}/payout")
async def process_affiliate_payout(user_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Process payout for affiliate earnings"""
    body = await request.json()
    amount = body.get("amount", 0)
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Montant invalide")
    
    # Get current pending earnings
    stats = await db.affiliate_stats.find_one({"user_id": user_id})
    if not stats or stats.get("pending_earnings", 0) < amount:
        raise HTTPException(status_code=400, detail="Solde insuffisant")
    
    # Create payout record
    payout = {
        "payout_id": f"payout_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "amount": amount,
        "status": "completed",
        "created_at": datetime.now(timezone.utc),
        "processed_by": user["user_id"]
    }
    await db.affiliate_payouts.insert_one(payout)
    
    # Update stats
    await db.affiliate_stats.update_one(
        {"user_id": user_id},
        {
            "$inc": {"pending_earnings": -amount, "paid_earnings": amount},
            "$set": {"last_payout_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"message": "Paiement effectué", "amount": amount}

# ==================== ADMIN REVIEWS MANAGEMENT ====================

@api_router.get("/admin/reviews")
async def get_admin_reviews(
    user: dict = Depends(get_admin_user),
    source: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all reviews for moderation"""
    query = {}
    if source:
        query["source"] = source
    if status == "flagged":
        query["is_flagged"] = True
    elif status == "hidden":
        query["is_hidden"] = True
    
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    for review in reviews:
        # Get reviewer info
        if review.get("reviewer_id"):
            reviewer = await db.users.find_one(
                {"user_id": review["reviewer_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            review["reviewer"] = reviewer
        
        # Get reviewee info
        reviewee = await db.users.find_one(
            {"user_id": review["reviewee_id"]},
            {"_id": 0, "name": 1, "email": 1, "user_type": 1}
        )
        review["reviewee"] = reviewee
        
        if isinstance(review.get("created_at"), datetime):
            review["created_at"] = review["created_at"].isoformat()
    
    return reviews

@api_router.put("/admin/reviews/{review_id}/moderate")
async def moderate_review(review_id: str, request: Request, user: dict = Depends(get_admin_user)):
    """Moderate a review (hide, flag, delete)"""
    body = await request.json()
    action = body.get("action")  # hide, unhide, flag, unflag, delete
    
    if action == "delete":
        await db.reviews.delete_one({"review_id": review_id})
        return {"message": "Avis supprimé", "action": "delete"}
    
    update = {}
    if action == "hide":
        update["is_hidden"] = True
    elif action == "unhide":
        update["is_hidden"] = False
    elif action == "flag":
        update["is_flagged"] = True
        update["flagged_reason"] = body.get("reason", "")
    elif action == "unflag":
        update["is_flagged"] = False
        update["flagged_reason"] = None
    else:
        raise HTTPException(status_code=400, detail="Action invalide")
    
    update["moderated_at"] = datetime.now(timezone.utc).isoformat()
    update["moderated_by"] = user["user_id"]
    
    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": update}
    )
    
    return {"message": f"Avis {action}", "action": action}

# ==================== ADMIN NOTIFICATIONS ====================

@api_router.post("/admin/notifications/send")
async def send_admin_notification(request: Request, user: dict = Depends(get_admin_user)):
    """Send notification to users"""
    body = await request.json()
    target = body.get("target")  # all, creators, businesses, user_id
    title = body.get("title")
    message = body.get("message")
    notification_type = body.get("type", "info")  # info, warning, promo
    
    if not title or not message:
        raise HTTPException(status_code=400, detail="Titre et message requis")
    
    # Build target query
    if target == "all":
        query = {"user_type": {"$in": ["creator", "business"]}}
    elif target == "creators":
        query = {"user_type": "creator"}
    elif target == "businesses":
        query = {"user_type": "business"}
    elif target and target.startswith("user_"):
        query = {"user_id": target}
    else:
        raise HTTPException(status_code=400, detail="Cible invalide")
    
    # Get target users
    target_users = await db.users.find(query, {"_id": 0, "user_id": 1}).to_list(10000)
    
    # Create notifications
    notifications = []
    for target_user in target_users:
        notif = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": target_user["user_id"],
            "type": notification_type,
            "title": title,
            "message": message,
            "is_read": False,
            "is_admin": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        notifications.append(notif)
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return {"message": f"Notification envoyée à {len(notifications)} utilisateurs", "count": len(notifications)}

# ==================== ADMIN ACTIVITY LOGS ====================

@api_router.get("/admin/activity-logs")
async def get_activity_logs(user: dict = Depends(get_admin_user), limit: int = 100):
    """Get recent activity logs"""
    # Aggregate recent activities from various collections
    activities = []
    
    # Recent users
    recent_users = await db.users.find(
        {}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "user_type": 1, "created_at": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for u in recent_users:
        activities.append({
            "type": "user_signup",
            "icon": "UserPlus",
            "title": f"Nouvel utilisateur: {u.get('name', u.get('email', 'Inconnu'))}",
            "subtitle": u.get("user_type", "—"),
            "timestamp": u.get("created_at"),
            "data": u
        })
    
    # Recent projects
    recent_projects = await db.projects.find(
        {}, {"_id": 0, "project_id": 1, "title": 1, "status": 1, "created_at": 1, "company_name": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for p in recent_projects:
        activities.append({
            "type": "project_created",
            "icon": "Briefcase",
            "title": f"Nouveau projet: {p.get('title', 'Sans titre')}",
            "subtitle": p.get("company_name", "—"),
            "timestamp": p.get("created_at"),
            "data": p
        })
    
    # Recent reviews
    recent_reviews = await db.reviews.find(
        {}, {"_id": 0, "review_id": 1, "rating": 1, "source": 1, "created_at": 1, "reviewer_name": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for r in recent_reviews:
        activities.append({
            "type": "review_posted",
            "icon": "Star",
            "title": f"Nouvel avis: {r.get('rating', '?')}/5",
            "subtitle": f"Par {r.get('reviewer_name', 'Anonyme')} ({r.get('source', '?')})",
            "timestamp": r.get("created_at"),
            "data": r
        })
    
    # Recent referrals
    recent_referrals = await db.affiliate_referrals.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for ref in recent_referrals:
        activities.append({
            "type": "referral",
            "icon": "Gift",
            "title": f"Nouveau parrainage: {ref.get('referred_name', ref.get('referred_email', 'Inconnu'))}",
            "subtitle": f"Status: {ref.get('status', '?')}",
            "timestamp": ref.get("created_at").isoformat() if isinstance(ref.get("created_at"), datetime) else ref.get("created_at"),
            "data": ref
        })
    
    # Recent withdrawals
    recent_withdrawals = await db.wallet_transactions.find(
        {"transaction_type": "withdrawal"},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for w in recent_withdrawals:
        activities.append({
            "type": "withdrawal",
            "icon": "Wallet",
            "title": f"Demande de retrait: {w.get('amount', 0)}€",
            "subtitle": f"Status: {w.get('status', '?')}",
            "timestamp": w.get("created_at"),
            "data": w
        })
    
    # Sort all by timestamp
    def get_timestamp(item):
        ts = item.get("timestamp")
        if isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except:
                return datetime.min.replace(tzinfo=timezone.utc)
        elif isinstance(ts, datetime):
            return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        return datetime.min.replace(tzinfo=timezone.utc)
    
    activities.sort(key=get_timestamp, reverse=True)
    
    return activities[:limit]

# ==================== ADMIN ANALYTICS ====================

@api_router.get("/admin/analytics")
async def get_admin_analytics(user: dict = Depends(get_admin_user)):
    """Get detailed platform analytics"""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    
    # User growth
    total_users = await db.users.count_documents({})
    users_this_month = await db.users.count_documents({
        "created_at": {"$gte": thirty_days_ago.isoformat()}
    })
    users_this_week = await db.users.count_documents({
        "created_at": {"$gte": seven_days_ago.isoformat()}
    })
    
    # Creators vs Businesses
    total_creators = await db.users.count_documents({"user_type": "creator"})
    total_businesses = await db.users.count_documents({"user_type": "business"})
    premium_creators = await db.users.count_documents({"user_type": "creator", "is_premium": True})
    subscribed_businesses = await db.users.count_documents({"user_type": "business", "is_subscribed": True})
    
    # Projects
    total_projects = await db.projects.count_documents({})
    open_projects = await db.projects.count_documents({"status": "open"})
    completed_projects = await db.projects.count_documents({"status": "completed"})
    
    # Affiliate stats
    total_affiliates = await db.affiliate_codes.count_documents({})
    total_referrals = await db.affiliate_referrals.count_documents({})
    paying_referrals = await db.affiliate_referrals.count_documents({"status": "paying"})
    
    # Aggregate affiliate earnings
    aff_stats = await db.affiliate_stats.aggregate([
        {"$group": {
            "_id": None,
            "total_clicks": {"$sum": "$total_clicks"},
            "total_mrr": {"$sum": "$mrr_generated"},
            "total_pending": {"$sum": "$pending_earnings"},
            "total_paid": {"$sum": {"$ifNull": ["$paid_earnings", 0]}}
        }}
    ]).to_list(1)
    
    affiliate_totals = aff_stats[0] if aff_stats else {}
    
    # Reviews
    total_reviews = await db.reviews.count_documents({})
    verified_reviews = await db.reviews.count_documents({"source": "verified"})
    external_reviews = await db.reviews.count_documents({"source": "external"})
    
    # Messages
    total_conversations = await db.conversations.count_documents({})
    total_messages = await db.messages.count_documents({})
    
    # Revenue (from wallet transactions)
    revenue_pipeline = await db.wallet_transactions.aggregate([
        {"$match": {"transaction_type": "earning", "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$platform_fee"}}}
    ]).to_list(1)
    total_platform_revenue = revenue_pipeline[0]["total"] if revenue_pipeline else 0
    
    return {
        "users": {
            "total": total_users,
            "this_month": users_this_month,
            "this_week": users_this_week,
            "creators": total_creators,
            "businesses": total_businesses,
            "premium_creators": premium_creators,
            "subscribed_businesses": subscribed_businesses
        },
        "projects": {
            "total": total_projects,
            "open": open_projects,
            "completed": completed_projects
        },
        "affiliates": {
            "total_affiliates": total_affiliates,
            "total_referrals": total_referrals,
            "paying_referrals": paying_referrals,
            "conversion_rate": round((paying_referrals / total_referrals * 100), 2) if total_referrals > 0 else 0,
            "total_clicks": affiliate_totals.get("total_clicks", 0),
            "total_mrr": affiliate_totals.get("total_mrr", 0),
            "pending_commissions": affiliate_totals.get("total_pending", 0),
            "paid_commissions": affiliate_totals.get("total_paid", 0)
        },
        "reviews": {
            "total": total_reviews,
            "verified": verified_reviews,
            "external": external_reviews
        },
        "engagement": {
            "conversations": total_conversations,
            "messages": total_messages
        },
        "revenue": {
            "platform_fees": total_platform_revenue
        }
    }

# Admin endpoint to toggle subscription (mock for MVP)
@api_router.post("/admin/users/{user_id}/subscription")
async def toggle_subscription(user_id: str, user: dict = Depends(get_admin_user)):
    """Toggle user subscription status"""
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    new_status = not target_user.get("is_subscribed", False)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_subscribed": new_status}}
    )
    
    return {"user_id": user_id, "is_subscribed": new_status}

# ==================== MESSAGING MODULE ====================
from messaging import create_messaging_router, websocket_endpoint, manager as ws_manager
from fastapi import WebSocket

# Create messaging router
messaging_router = create_messaging_router(db, get_current_user, upload_to_r2)
app.include_router(messaging_router, prefix="/api")

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    async def get_user_from_ws_token(token: str, database):
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
            if user_id:
                user = await database.users.find_one({"user_id": user_id}, {"_id": 0})
                return user
        except:
            return None
        return None
    
    await websocket_endpoint(websocket, db, get_user_from_ws_token)

# Setup reviews routes BEFORE including the router
from reviews import setup_reviews_routes
setup_reviews_routes(api_router, db, get_current_user, send_email, FRONTEND_URL)

# Setup affiliate routes
from affiliate import setup_affiliate_routes
setup_affiliate_routes(api_router, db, get_current_user, FRONTEND_URL)

# Setup article/learn content routes
from articles import setup_articles_routes
setup_articles_routes(api_router, db, get_current_user, upload_to_r2, ADMIN_EMAILS)

# Setup Creator Card routes
creator_card_router = create_creator_card_routes(db, get_current_user)
app.include_router(creator_card_router)

# ==================== STRIPE PAYMENT ROUTES ====================
import stripe_payments

@api_router.post("/stripe/create-checkout")
async def create_stripe_checkout(request: Request, checkout_request: stripe_payments.CreateCheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Create Stripe checkout session for premium subscription"""
    return await stripe_payments.create_checkout_session(
        request=request,
        checkout_request=checkout_request,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("email")
    )

@api_router.get("/stripe/status/{session_id}")
async def get_stripe_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Check payment status"""
    return await stripe_payments.check_payment_status(
        session_id=session_id,
        user_id=current_user.get("user_id")
    )

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    return await stripe_payments.handle_stripe_webhook(request)

@api_router.post("/stripe/pool-checkout")
async def create_pool_checkout(request: Request, checkout_request: stripe_payments.CreatePoolCheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Create Stripe checkout session for pool campaign"""
    return await stripe_payments.create_pool_checkout_session(
        request=request,
        checkout_request=checkout_request,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("email")
    )

@api_router.get("/stripe/pool-status/{session_id}")
async def get_pool_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Check pool payment status and create pool if paid"""
    return await stripe_payments.check_pool_payment_and_create(
        session_id=session_id,
        user_id=current_user.get("user_id")
    )

# ==================== INFLUENCE POOLS ROUTES ====================
import influence_pools

@api_router.post("/pools")
async def create_pool(pool_data: influence_pools.CreatePoolRequest, user: dict = Depends(get_current_user)):
    """Create a new influence pool campaign (Business only)"""
    if user.get("user_type") != "business":
        raise HTTPException(status_code=403, detail="Only businesses can create pools")
    
    try:
        pool = await influence_pools.create_pool(db, user, pool_data)
        return pool
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/pools")
async def list_pools(user: dict = Depends(get_current_user)):
    """List pools - Active pools for creators, Own pools for businesses"""
    if user.get("user_type") == "business":
        pools = await influence_pools.get_business_pools(db, user["user_id"])
    else:
        pools = await influence_pools.get_active_pools(db)
    return pools

@api_router.get("/pools/active")
async def list_active_pools(limit: int = 50):
    """List all active pools (public endpoint for arena)"""
    pools = await influence_pools.get_active_pools(db, limit)
    return pools

@api_router.get("/pools/{pool_id}")
async def get_pool(pool_id: str, user: dict = Depends(get_current_user)):
    """Get pool details"""
    pool = await influence_pools.get_pool_by_id(db, pool_id)
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    # Get participation status for creators
    participation = None
    if user.get("user_type") == "creator":
        participation = await db.pool_participations.find_one(
            {"pool_id": pool_id, "creator_id": user["user_id"]},
            {"_id": 0}
        )
    
    # Return UI-formatted data based on user type
    if user.get("user_type") == "business":
        return {
            **pool,
            "ui_summary": influence_pools.get_ui_business_summary(pool)
        }
    else:
        return {
            **pool,
            "ui_arena": influence_pools.get_ui_creator_arena(pool, participation),
            "participation": participation
        }

@api_router.get("/pools/{pool_id}/leaderboard")
async def get_pool_leaderboard(pool_id: str, limit: int = 20):
    """Get pool leaderboard"""
    leaderboard = await influence_pools.get_pool_leaderboard(db, pool_id, limit)
    return leaderboard

@api_router.get("/pools/{pool_id}/submissions")
async def get_pool_submissions(pool_id: str, user: dict = Depends(get_current_user)):
    """Get all submissions for a pool (Business owner only)"""
    pool = await influence_pools.get_pool_by_id(db, pool_id)
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    if user.get("user_type") == "business" and pool["business_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await influence_pools.get_pool_submissions(db, pool_id)
    return submissions

@api_router.get("/pools/{pool_id}/payouts")
async def get_pool_payouts(pool_id: str, user: dict = Depends(get_current_user)):
    """Calculate and get payouts for all participants (Business owner only)"""
    pool = await influence_pools.get_pool_by_id(db, pool_id)
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    if user.get("user_type") == "business" and pool["business_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    payouts = await influence_pools.calculate_pool_payouts(db, pool_id)
    return payouts

@api_router.post("/pools/{pool_id}/join")
async def join_pool(pool_id: str, user: dict = Depends(get_current_user)):
    """Creator joins a pool"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Only creators can join pools")
    
    try:
        participation = await influence_pools.join_pool(db, user, pool_id)
        return participation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/pools/{pool_id}/submit")
async def submit_content(pool_id: str, submission: influence_pools.SubmitContentRequest, user: dict = Depends(get_current_user)):
    """Creator submits content for a pool"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Only creators can submit content")
    
    # Ensure pool_id matches
    submission.pool_id = pool_id
    
    try:
        result = await influence_pools.submit_content(db, user, submission)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/pools/my/participations")
async def get_my_participations(user: dict = Depends(get_current_user)):
    """Get all pools the creator has joined"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view participations")
    
    participations = await influence_pools.get_creator_participations(db, user["user_id"])
    return participations

@api_router.get("/pools/my/submissions")
async def get_my_submissions(pool_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all submissions by the creator"""
    if user.get("user_type") != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view submissions")
    
    submissions = await influence_pools.get_creator_submissions(db, user["user_id"], pool_id)
    return submissions

@api_router.put("/pools/{pool_id}/status")
async def update_pool_status(pool_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Update pool status (Business owner or admin)"""
    pool = await influence_pools.get_pool_by_id(db, pool_id)
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    is_admin = user.get("email") in ADMIN_EMAILS
    is_owner = user.get("user_type") == "business" and pool["business_id"] == user["user_id"]
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    body = await request.json()
    new_status = body.get("status")
    
    if new_status not in [s.value for s in influence_pools.PoolStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.influence_pools.update_one(
        {"pool_id": pool_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Status updated", "status": new_status}

# Include router
app.include_router(api_router)

# Add Security Headers Middleware (must be added before CORS)
app.add_middleware(SecurityHeadersMiddleware)

# CORS Configuration - More restrictive
cors_origins = os.environ.get('CORS_ORIGINS', '')
if not cors_origins:
    logging.warning("CORS_ORIGINS not set - using restrictive default")
    cors_origins = "https://pool-campaigns.preview.emergentagent.com"

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins.split(','),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    expose_headers=["X-Request-ID"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
