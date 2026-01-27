from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'ugc-platform-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    user_type: str  # "creator" or "business"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    user_type: str  # "creator" or "business"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CreatorProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str = Field(default_factory=lambda: f"profile_{uuid.uuid4().hex[:12]}")
    user_id: str
    bio: Optional[str] = None
    city: str = ""
    can_travel: bool = False
    works_remote: bool = True
    content_types: List[str] = []  # UGC, Micro-trottoir, Face cam, Ads, Interview, Montage
    sectors: List[str] = []
    min_rate: Optional[int] = None
    max_rate: Optional[int] = None
    portfolio_videos: List[dict] = []  # [{url, title, views, platform}]
    badges: List[str] = []  # certified, trained, top_performer, available_now
    rating: float = 0.0
    reviews_count: int = 0
    completed_projects: int = 0
    is_verified: bool = False
    available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreatorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    city: Optional[str] = None
    can_travel: Optional[bool] = None
    works_remote: Optional[bool] = None
    content_types: Optional[List[str]] = None
    sectors: Optional[List[str]] = None
    min_rate: Optional[int] = None
    max_rate: Optional[int] = None
    portfolio_videos: Optional[List[dict]] = None
    available: Optional[bool] = None

class BusinessProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str = Field(default_factory=lambda: f"biz_{uuid.uuid4().hex[:12]}")
    user_id: str
    company_name: str = ""
    description: Optional[str] = None
    business_type: str = ""  # physical, online, both
    city: Optional[str] = None
    monthly_budget: Optional[str] = None  # "<1000", "1000-3000", "3000-6000", "6000+"
    objectives: List[str] = []  # visibility, product_launch, ads, social, ugc_mass
    industry: str = ""
    website: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BusinessProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    description: Optional[str] = None
    business_type: Optional[str] = None
    city: Optional[str] = None
    monthly_budget: Optional[str] = None
    objectives: Optional[List[str]] = None
    industry: Optional[str] = None
    website: Optional[str] = None

class Pack(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pack_id: str = Field(default_factory=lambda: f"pack_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str
    description: str
    target: str  # physical, online, all
    creators_count: int
    videos_count: int
    includes: List[str]
    delivery_days: int
    price_min: int
    price_max: int
    icon: str
    popular: bool = False

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    campaign_id: str = Field(default_factory=lambda: f"campaign_{uuid.uuid4().hex[:12]}")
    business_id: str
    pack_id: Optional[str] = None
    creator_ids: List[str] = []
    title: str
    description: str
    budget: int
    status: str = "draft"  # draft, pending, active, completed, cancelled
    deliverables: List[dict] = []
    deadline: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    conversation_id: str
    sender_id: str
    receiver_id: str
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    conversation_id: str = Field(default_factory=lambda: f"conv_{uuid.uuid4().hex[:12]}")
    participants: List[str]
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"review_{uuid.uuid4().hex[:12]}")
    creator_id: str
    business_id: str
    campaign_id: Optional[str] = None
    rating: int  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    creator_id: str
    campaign_id: Optional[str] = None
    rating: int
    comment: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str, user_type: str) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

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

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "user_type": user_data.user_type,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create profile based on user type
    if user_data.user_type == "creator":
        profile = CreatorProfile(user_id=user_id)
        await db.creator_profiles.insert_one(profile.model_dump())
    else:
        profile = BusinessProfile(user_id=user_id)
        await db.business_profiles.insert_one(profile.model_dump())
    
    token = create_jwt_token(user_id, user_data.user_type)
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
        "email": user_data.email,
        "name": user_data.name,
        "user_type": user_data.user_type,
        "token": token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["user_id"], user["user_type"])
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
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "user_type": user["user_type"],
        "picture": user.get("picture"),
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
        user_type = existing_user["user_type"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": oauth_data["name"], "picture": oauth_data.get("picture")}}
        )
    else:
        # New user - default to creator, can change later
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_type = "creator"
        user_doc = {
            "user_id": user_id,
            "email": oauth_data["email"],
            "name": oauth_data["name"],
            "picture": oauth_data.get("picture"),
            "user_type": user_type,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        
        # Create creator profile
        profile = CreatorProfile(user_id=user_id)
        await db.creator_profiles.insert_one(profile.model_dump())
    
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
        "user_type": user_type
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "user_type": user["user_type"],
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/set-user-type")
async def set_user_type(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    new_type = body.get("user_type")
    
    if new_type not in ["creator", "business"]:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"user_type": new_type}}
    )
    
    # Create profile if doesn't exist
    if new_type == "creator":
        existing = await db.creator_profiles.find_one({"user_id": user["user_id"]})
        if not existing:
            profile = CreatorProfile(user_id=user["user_id"])
            await db.creator_profiles.insert_one(profile.model_dump())
    else:
        existing = await db.business_profiles.find_one({"user_id": user["user_id"]})
        if not existing:
            profile = BusinessProfile(user_id=user["user_id"])
            await db.business_profiles.insert_one(profile.model_dump())
    
    return {"user_type": new_type}

# ==================== CREATOR ROUTES ====================

@api_router.get("/creators")
async def get_creators(
    city: Optional[str] = None,
    content_type: Optional[str] = None,
    sector: Optional[str] = None,
    min_rate: Optional[int] = None,
    max_rate: Optional[int] = None,
    available: Optional[bool] = None,
    can_travel: Optional[bool] = None,
    works_remote: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if content_type:
        query["content_types"] = content_type
    if sector:
        query["sectors"] = sector
    if available is not None:
        query["available"] = available
    if can_travel is not None:
        query["can_travel"] = can_travel
    if works_remote is not None:
        query["works_remote"] = works_remote
    if min_rate is not None:
        query["min_rate"] = {"$lte": min_rate}
    if max_rate is not None:
        query["max_rate"] = {"$gte": max_rate}
    
    profiles = await db.creator_profiles.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user data
    result = []
    for profile in profiles:
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})
        if user:
            profile["name"] = user.get("name")
            profile["email"] = user.get("email")
            profile["picture"] = user.get("picture")
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
    
    # Get reviews
    reviews = await db.reviews.find({"creator_id": user_id}, {"_id": 0}).to_list(50)
    profile["reviews"] = reviews
    
    return profile

@api_router.get("/creators/me/profile")
async def get_my_creator_profile(user: dict = Depends(get_current_user)):
    profile = await db.creator_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile["name"] = user.get("name")
    profile["email"] = user.get("email")
    profile["picture"] = user.get("picture")
    return profile

@api_router.put("/creators/me/profile")
async def update_my_creator_profile(update_data: CreatorProfileUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.creator_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"message": "Profile updated"}

# ==================== BUSINESS ROUTES ====================

@api_router.get("/business/me/profile")
async def get_my_business_profile(user: dict = Depends(get_current_user)):
    profile = await db.business_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile["name"] = user.get("name")
    profile["email"] = user.get("email")
    return profile

@api_router.put("/business/me/profile")
async def update_my_business_profile(update_data: BusinessProfileUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.business_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"message": "Profile updated"}

# ==================== PACKS ROUTES ====================

@api_router.get("/packs")
async def get_packs():
    # Return predefined packs
    packs = [
        {
            "pack_id": "pack_local_impact",
            "name": "Local Impact",
            "slug": "local-impact",
            "description": "Pour commerces physiques - Boostez votre visibilité locale",
            "target": "physical",
            "creators_count": 5,
            "videos_count": 10,
            "includes": ["5 créateurs locaux", "10 vidéos UGC", "1 micro-trottoir", "Publication + diffusion"],
            "delivery_days": 14,
            "price_min": 1500,
            "price_max": 3000,
            "icon": "🔥",
            "popular": True
        },
        {
            "pack_id": "pack_digital_visibility",
            "name": "Visibilité Digitale",
            "slug": "digital-visibility",
            "description": "Pour e-commerce - Multipliez vos conversions",
            "target": "online",
            "creators_count": 10,
            "videos_count": 30,
            "includes": ["10 créateurs", "30 vidéos UGC", "Droits ads", "Hook testing"],
            "delivery_days": 21,
            "price_min": 3000,
            "price_max": 6000,
            "icon": "🚀",
            "popular": False
        },
        {
            "pack_id": "pack_massive_content",
            "name": "Massive Content",
            "slug": "massive-content",
            "description": "Volume massif - Dominez votre marché",
            "target": "all",
            "creators_count": 50,
            "videos_count": 200,
            "includes": ["50 créateurs", "200+ vidéos", "Multi comptes", "Stratégie diffusion", "Account manager dédié"],
            "delivery_days": 45,
            "price_min": 10000,
            "price_max": 25000,
            "icon": "💣",
            "popular": False
        }
    ]
    return packs

@api_router.get("/packs/{pack_id}")
async def get_pack(pack_id: str):
    packs = await get_packs()
    pack = next((p for p in packs if p["pack_id"] == pack_id), None)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    return pack

# ==================== CAMPAIGN ROUTES ====================

@api_router.post("/campaigns")
async def create_campaign(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    
    campaign = Campaign(
        business_id=user["user_id"],
        pack_id=body.get("pack_id"),
        title=body.get("title", ""),
        description=body.get("description", ""),
        budget=body.get("budget", 0),
        creator_ids=body.get("creator_ids", []),
        deadline=datetime.fromisoformat(body["deadline"]) if body.get("deadline") else None
    )
    
    await db.campaigns.insert_one(campaign.model_dump())
    return {"campaign_id": campaign.campaign_id, "message": "Campaign created"}

@api_router.get("/campaigns")
async def get_campaigns(user: dict = Depends(get_current_user)):
    if user["user_type"] == "business":
        campaigns = await db.campaigns.find({"business_id": user["user_id"]}, {"_id": 0}).to_list(100)
    else:
        campaigns = await db.campaigns.find({"creator_ids": user["user_id"]}, {"_id": 0}).to_list(100)
    return campaigns

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@api_router.put("/campaigns/{campaign_id}/status")
async def update_campaign_status(campaign_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    new_status = body.get("status")
    
    if new_status not in ["draft", "pending", "active", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Status updated"}

# ==================== MESSAGING ROUTES ====================

@api_router.get("/conversations")
async def get_conversations(user: dict = Depends(get_current_user)):
    convs = await db.conversations.find(
        {"participants": user["user_id"]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(50)
    
    # Enrich with participant info
    for conv in convs:
        other_id = [p for p in conv["participants"] if p != user["user_id"]][0]
        other_user = await db.users.find_one({"user_id": other_id}, {"_id": 0})
        if other_user:
            conv["other_user"] = {
                "user_id": other_user["user_id"],
                "name": other_user.get("name"),
                "picture": other_user.get("picture")
            }
    
    return convs

@api_router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not conv or user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    # Mark as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "receiver_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.post("/messages")
async def send_message(msg_data: MessageCreate, user: dict = Depends(get_current_user)):
    # Find or create conversation
    conv = await db.conversations.find_one({
        "participants": {"$all": [user["user_id"], msg_data.receiver_id]}
    }, {"_id": 0})
    
    if not conv:
        conv = Conversation(participants=[user["user_id"], msg_data.receiver_id])
        await db.conversations.insert_one(conv.model_dump())
        conv = conv.model_dump()
    
    # Create message
    message = Message(
        conversation_id=conv["conversation_id"],
        sender_id=user["user_id"],
        receiver_id=msg_data.receiver_id,
        content=msg_data.content
    )
    await db.messages.insert_one(message.model_dump())
    
    # Update conversation
    await db.conversations.update_one(
        {"conversation_id": conv["conversation_id"]},
        {"$set": {
            "last_message": msg_data.content[:100],
            "last_message_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message_id": message.message_id, "conversation_id": conv["conversation_id"]}

# ==================== REVIEWS ROUTES ====================

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, user: dict = Depends(get_current_user)):
    if user["user_type"] != "business":
        raise HTTPException(status_code=403, detail="Only businesses can create reviews")
    
    review = Review(
        creator_id=review_data.creator_id,
        business_id=user["user_id"],
        campaign_id=review_data.campaign_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    await db.reviews.insert_one(review.model_dump())
    
    # Update creator rating
    reviews = await db.reviews.find({"creator_id": review_data.creator_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.creator_profiles.update_one(
        {"user_id": review_data.creator_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return {"review_id": review.review_id}

@api_router.get("/reviews/{creator_id}")
async def get_creator_reviews(creator_id: str):
    reviews = await db.reviews.find({"creator_id": creator_id}, {"_id": 0}).to_list(100)
    
    # Enrich with business info
    for review in reviews:
        business = await db.users.find_one({"user_id": review["business_id"]}, {"_id": 0})
        if business:
            review["business_name"] = business.get("name")
    
    return reviews

# ==================== STATS ROUTES ====================

@api_router.get("/stats/platform")
async def get_platform_stats():
    creators_count = await db.creator_profiles.count_documents({})
    businesses_count = await db.business_profiles.count_documents({})
    campaigns_count = await db.campaigns.count_documents({"status": "completed"})
    
    # Calculate total videos (estimated)
    videos_count = campaigns_count * 15  # Average videos per campaign
    
    return {
        "creators_count": max(creators_count, 150),  # Show minimum for social proof
        "businesses_count": max(businesses_count, 45),
        "videos_count": max(videos_count, 2500),
        "campaigns_count": campaigns_count
    }

@api_router.get("/stats/creator")
async def get_creator_stats(user: dict = Depends(get_current_user)):
    profile = await db.creator_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    campaigns = await db.campaigns.find({"creator_ids": user["user_id"]}, {"_id": 0}).to_list(100)
    messages_count = await db.messages.count_documents({"receiver_id": user["user_id"], "read": False})
    
    return {
        "rating": profile.get("rating", 0) if profile else 0,
        "reviews_count": profile.get("reviews_count", 0) if profile else 0,
        "completed_projects": len([c for c in campaigns if c.get("status") == "completed"]),
        "active_campaigns": len([c for c in campaigns if c.get("status") == "active"]),
        "unread_messages": messages_count
    }

@api_router.get("/stats/business")
async def get_business_stats(user: dict = Depends(get_current_user)):
    campaigns = await db.campaigns.find({"business_id": user["user_id"]}, {"_id": 0}).to_list(100)
    messages_count = await db.messages.count_documents({"receiver_id": user["user_id"], "read": False})
    
    total_spent = sum(c.get("budget", 0) for c in campaigns if c.get("status") == "completed")
    
    return {
        "total_campaigns": len(campaigns),
        "active_campaigns": len([c for c in campaigns if c.get("status") == "active"]),
        "completed_campaigns": len([c for c in campaigns if c.get("status") == "completed"]),
        "total_spent": total_spent,
        "unread_messages": messages_count
    }

# ==================== CONTACT/QUOTE REQUEST ====================

@api_router.post("/quote-request")
async def request_quote(request: Request):
    body = await request.json()
    
    quote_id = f"quote_{uuid.uuid4().hex[:12]}"
    quote_doc = {
        "quote_id": quote_id,
        "company_name": body.get("company_name"),
        "email": body.get("email"),
        "phone": body.get("phone"),
        "pack_id": body.get("pack_id"),
        "message": body.get("message"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quote_requests.insert_one(quote_doc)
    
    return {"quote_id": quote_id, "message": "Quote request submitted"}

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
