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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directories
UPLOADS_DIR = ROOT_DIR / "uploads"
PROFILES_DIR = UPLOADS_DIR / "profiles"
BANNERS_DIR = UPLOADS_DIR / "banners"
PROFILES_DIR.mkdir(parents=True, exist_ok=True)
BANNERS_DIR.mkdir(parents=True, exist_ok=True)

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
    can_travel: Optional[bool] = None
    works_remote: Optional[bool] = None
    
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

class BusinessProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str = Field(default_factory=lambda: f"biz_{uuid.uuid4().hex[:12]}")
    user_id: str
    company_name: Optional[str] = None
    description: Optional[str] = None
    business_type: Optional[str] = None  # physical, online, both
    city: Optional[str] = None
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
    budget: int
    content_type: str
    target_creators: int = 1
    requirements: List[str] = []
    deadline: Optional[str] = None
    incubator_only: bool = False
    status: str = "open"  # open, in_progress, completed, cancelled
    applications: List[dict] = []  # [{creator_id, status, applied_at}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    pack_id: str
    title: str
    description: str
    budget: int
    content_type: str
    target_creators: int = 1
    requirements: List[str] = []
    deadline: Optional[str] = None
    incubator_only: bool = False

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

# ==================== CREATOR ROUTES ====================

@api_router.get("/creators")
async def get_creators(
    city: Optional[str] = None,
    content_type: Optional[str] = None,
    available: Optional[bool] = None,
    min_score: Optional[int] = None,
    incubator_only: Optional[bool] = None,
    experience_level: Optional[str] = None,
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
    """Create a new project - requires pack selection"""
    # Check if business has selected a pack
    profile = await db.business_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile or not profile.get("selected_pack"):
        raise HTTPException(status_code=400, detail="Sélectionnez un pack pour continuer")
    
    project = Project(
        business_id=user["user_id"],
        pack_id=project_data.pack_id,
        title=project_data.title,
        description=project_data.description,
        budget=project_data.budget,
        content_type=project_data.content_type,
        target_creators=project_data.target_creators,
        requirements=project_data.requirements,
        deadline=project_data.deadline,
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
    
    return projects

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
