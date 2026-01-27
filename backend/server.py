from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import shutil
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    logging.info("Cloudflare R2 client initialized")

# R2 Public URL base (for accessing files)
R2_PUBLIC_URL = f"https://pub-{R2_ACCOUNT_ID}.r2.dev" if R2_ACCOUNT_ID else None

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
        # Return the R2 URL
        return f"{R2_ENDPOINT}/{R2_BUCKET_NAME}/{key}"
    except Exception as e:
        logging.error(f"R2 upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

def get_r2_public_url(key: str) -> str:
    """Generate a public URL for R2 object"""
    return f"{R2_ENDPOINT}/{R2_BUCKET_NAME}/{key}"

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'ugc-incubator-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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
    sectors: List[str] = []
    
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

@api_router.post("/auth/otp/request")
async def request_otp(data: OTPRequest):
    """Request OTP code for email login"""
    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP (in production, send via email)
    await db.otp_codes.update_one(
        {"email": data.email},
        {"$set": {
            "code": otp_code,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # In production: send email with OTP
    # For MVP: return code in response (remove in production)
    return {
        "message": "Code envoyé",
        "debug_code": otp_code  # Remove in production
    }

@api_router.post("/auth/otp/verify")
async def verify_otp(data: OTPVerify, response: Response):
    """Verify OTP code and authenticate"""
    otp_doc = await db.otp_codes.find_one({"email": data.email}, {"_id": 0})
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Code invalide")
    
    if otp_doc["code"] != data.code:
        raise HTTPException(status_code=400, detail="Code incorrect")
    
    expires_at = datetime.fromisoformat(otp_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Code expiré")
    
    # Delete OTP
    await db.otp_codes.delete_one({"email": data.email})
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        user_type = existing_user.get("user_type")
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": data.email,
            "name": None,
            "picture": None,
            "user_type": None,
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        user_type = None
    
    # Create session
    token = create_jwt_token(user_id, user_type)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "user_id": user_id,
        "email": data.email,
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
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": oauth_data["name"], "picture": oauth_data.get("picture")}}
        )
    else:
        # New user - don't set type yet
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_type = None
        is_new = True
        user_doc = {
            "user_id": user_id,
            "email": oauth_data["email"],
            "name": oauth_data["name"],
            "picture": oauth_data.get("picture"),
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
        samesite="none",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    return {
        "user_id": user_id,
        "email": oauth_data["email"],
        "name": oauth_data["name"],
        "picture": oauth_data.get("picture"),
        "user_type": user_type,
        "is_new_user": is_new
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name"),
        "user_type": user.get("user_type"),
        "picture": user.get("picture"),
        "banner": user.get("banner"),
        "is_premium": user.get("is_premium", False)
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
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@api_router.post("/upload/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload profile picture for current user"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 5MB.")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user['user_id']}_profile_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = PROFILES_DIR / filename
    
    # Save file
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Update user profile with picture URL
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
    """Upload banner/cover image for current user"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 5MB.")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user['user_id']}_banner_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = BANNERS_DIR / filename
    
    # Save file
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Update user with banner URL
    banner_url = f"/api/uploads/banners/{filename}"
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"banner": banner_url}}
    )
    
    return {"message": "Bannière mise à jour", "banner_url": banner_url}

@api_router.get("/uploads/profiles/{filename}")
async def get_profile_picture(filename: str):
    """Serve profile pictures publicly"""
    filepath = PROFILES_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image non trouvée")
    return FileResponse(filepath)

@api_router.get("/uploads/banners/{filename}")
async def get_banner(filename: str):
    """Serve banner images publicly"""
    filepath = BANNERS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image non trouvée")
    return FileResponse(filepath)

@api_router.post("/upload/project-banner")
async def upload_project_banner(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload project banner image"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 5MB.")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"project_{uuid.uuid4().hex[:12]}.{ext}"
    filepath = PROJECTS_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    banner_url = f"/api/uploads/projects/{filename}"
    return {"message": "Image uploadée", "banner_url": banner_url}

@api_router.get("/uploads/projects/{filename}")
async def get_project_banner(filename: str):
    """Serve project banner images publicly"""
    filepath = PROJECTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image non trouvée")
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
async def get_packs():
    packs = [
        {
            "pack_id": "pack_starter",
            "name": "Starter",
            "slug": "starter",
            "description": "Idéal pour tester la plateforme",
            "creators_count": 1,
            "videos_count": 3,
            "includes": ["1 créateur", "3 vidéos UGC", "Délai 7 jours", "1 révision"],
            "delivery_days": 7,
            "price": 500,
            "icon": "⚡",
            "popular": False
        },
        {
            "pack_id": "pack_local_impact",
            "name": "Local Impact",
            "slug": "local-impact",
            "description": "Pour commerces physiques",
            "creators_count": 5,
            "videos_count": 10,
            "includes": ["5 créateurs locaux", "10 vidéos UGC", "1 micro-trottoir", "Publication incluse"],
            "delivery_days": 14,
            "price": 1500,
            "icon": "🔥",
            "popular": True
        },
        {
            "pack_id": "pack_digital",
            "name": "Visibilité Digitale",
            "slug": "digital",
            "description": "Pour e-commerce",
            "creators_count": 10,
            "videos_count": 30,
            "includes": ["10 créateurs", "30 vidéos UGC", "Droits ads", "Hook testing"],
            "delivery_days": 21,
            "price": 3000,
            "icon": "🚀",
            "popular": False
        },
        {
            "pack_id": "pack_massive",
            "name": "Massive Content",
            "slug": "massive",
            "description": "Volume massif",
            "creators_count": 50,
            "videos_count": 200,
            "includes": ["50 créateurs", "200+ vidéos", "Multi comptes", "Account manager"],
            "delivery_days": 45,
            "price": 10000,
            "icon": "💣",
            "popular": False
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

# ==================== REVIEWS ROUTES ====================

@api_router.post("/reviews")
async def create_review(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    
    review = Review(
        creator_id=body["creator_id"],
        business_id=user["user_id"],
        project_id=body.get("project_id"),
        rating=body["rating"],
        comment=body["comment"]
    )
    await db.reviews.insert_one(review.model_dump())
    
    # Update creator stats
    reviews = await db.reviews.find({"creator_id": body["creator_id"]}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.creator_profiles.update_one(
        {"user_id": body["creator_id"]},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return {"review_id": review.review_id}

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

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
