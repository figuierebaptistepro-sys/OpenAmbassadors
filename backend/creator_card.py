"""
Creator Card - Public Profile Feature
URL: /@username
"""
import re
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api", tags=["creator-card"])

# Reserved slugs that cannot be used as usernames
RESERVED_SLUGS = {
    "admin", "administrator", "api", "auth", "login", "logout", "register", "signup",
    "dashboard", "settings", "profile", "business", "creator", "creators", "search",
    "find", "browse", "messages", "projects", "wallet", "learn", "support", "help",
    "terms", "privacy", "about", "contact", "home", "index", "app", "www", "mail",
    "blog", "news", "static", "assets", "uploads", "images", "css", "js", "fonts",
    "openambassadors", "ambassador", "ambassadors", "premium", "pro", "enterprise",
    "affiliation", "affiliate", "referral", "invite", "select-type", "onboarding"
}

# ==================== MODELS ====================

class CreatorOffer(BaseModel):
    """Offer/service displayed on creator card"""
    offer_id: str = Field(default_factory=lambda: f"offer_{uuid.uuid4().hex[:8]}")
    title: str
    description: Optional[str] = None
    price: Optional[str] = None  # Optional price display (e.g., "À partir de 500€")
    external_link: Optional[str] = None
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreatorLink(BaseModel):
    """Link displayed on creator card (link-in-bio style)"""
    link_id: str = Field(default_factory=lambda: f"link_{uuid.uuid4().hex[:8]}")
    title: str
    url: str
    icon: Optional[str] = None  # Optional icon identifier
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreatorCardData(BaseModel):
    """Data stored for creator card feature"""
    user_id: str
    username: str  # Unique slug for URL
    offers: List[CreatorOffer] = []
    links: List[CreatorLink] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UsernameCheck(BaseModel):
    username: str
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        v = v.lower().strip()
        # Only allow alphanumeric, underscores, and hyphens
        if not re.match(r'^[a-z0-9_-]{3,30}$', v):
            raise ValueError('Username must be 3-30 characters, only letters, numbers, underscores and hyphens')
        if v in RESERVED_SLUGS:
            raise ValueError('This username is reserved')
        return v

class UsernameSet(BaseModel):
    username: str
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        v = v.lower().strip()
        if not re.match(r'^[a-z0-9_-]{3,30}$', v):
            raise ValueError('Username must be 3-30 characters, only letters, numbers, underscores and hyphens')
        if v in RESERVED_SLUGS:
            raise ValueError('This username is reserved')
        return v

class OfferCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: Optional[str] = None
    external_link: Optional[str] = None

class OfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    external_link: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

class LinkCreate(BaseModel):
    title: str
    url: str
    icon: Optional[str] = None

class LinkUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

# ==================== HELPER FUNCTIONS ====================

def calculate_completion_score(profile: dict, user: dict) -> int:
    """Calculate profile completion score (0-100)"""
    score = 0
    max_score = 100
    
    # Basic info (40 points)
    if user.get("picture"): score += 15
    if user.get("name"): score += 10
    if profile.get("bio"): score += 15
    
    # Location & contact (15 points)
    if profile.get("city"): score += 10
    if profile.get("phone"): score += 5
    
    # Professional info (25 points)
    if profile.get("content_types") and len(profile.get("content_types", [])) > 0: score += 10
    if profile.get("niches") and len(profile.get("niches", [])) > 0: score += 10
    if profile.get("visibility"): score += 5
    
    # Portfolio (20 points)
    if profile.get("portfolio_videos") and len(profile.get("portfolio_videos", [])) > 0: score += 20
    
    return min(score, max_score)

def get_badges(profile: dict, user: dict) -> List[dict]:
    """Get badges for creator card display"""
    badges = []
    
    # Premium badge
    if user.get("is_premium"):
        badges.append({"type": "premium", "label": "Premium", "icon": "crown"})
    
    # Verified badge (profile complete)
    completion = calculate_completion_score(profile, user)
    if completion >= 80:
        badges.append({"type": "verified", "label": "Vérifié", "icon": "shield-check"})
    
    # Top rated badge
    if profile.get("rating", 0) >= 4.5 and profile.get("reviews_count", 0) >= 3:
        badges.append({"type": "top_rated", "label": "Top Rated", "icon": "star"})
    
    # Experienced badge
    if profile.get("completed_projects", 0) >= 5:
        badges.append({"type": "experienced", "label": "Expérimenté", "icon": "trophy"})
    
    return badges

# ==================== ROUTES ====================

def create_creator_card_routes(db: AsyncIOMotorDatabase, get_current_user):
    """Create routes with database dependency"""
    
    @router.get("/username/check/{username}")
    async def check_username_availability(username: str):
        """Check if a username is available"""
        username = username.lower().strip()
        
        # Validate format
        if not re.match(r'^[a-z0-9_-]{3,30}$', username):
            return {"available": False, "reason": "Format invalide (3-30 caractères, lettres, chiffres, _ et - uniquement)"}
        
        # Check reserved
        if username in RESERVED_SLUGS:
            return {"available": False, "reason": "Ce nom d'utilisateur est réservé"}
        
        # Check if already taken
        existing = await db.creator_cards.find_one({"username": username})
        if existing:
            return {"available": False, "reason": "Ce nom d'utilisateur est déjà pris"}
        
        return {"available": True, "username": username}
    
    @router.post("/creators/me/username")
    async def set_username(data: UsernameSet, user: dict = Depends(get_current_user)):
        """Set or update creator's username"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can set a username")
        
        username = data.username.lower().strip()
        
        # Check if already taken by someone else
        existing = await db.creator_cards.find_one({"username": username})
        if existing and existing.get("user_id") != user["user_id"]:
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
        
        # Update or create creator card data
        await db.creator_cards.update_one(
            {"user_id": user["user_id"]},
            {
                "$set": {
                    "username": username,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "user_id": user["user_id"],
                    "offers": [],
                    "links": [],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {"success": True, "username": username}
    
    @router.get("/creators/me/card")
    async def get_my_creator_card(user: dict = Depends(get_current_user)):
        """Get current user's creator card data"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can access this")
        
        card_data = await db.creator_cards.find_one(
            {"user_id": user["user_id"]},
            {"_id": 0}
        )
        
        return card_data or {"user_id": user["user_id"], "username": None, "offers": [], "links": []}
    
    # ==================== OFFERS ====================
    
    @router.post("/creators/me/offers")
    async def create_offer(data: OfferCreate, user: dict = Depends(get_current_user)):
        """Create a new offer"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can create offers")
        
        # Check limits for non-premium
        card_data = await db.creator_cards.find_one({"user_id": user["user_id"]})
        current_offers = card_data.get("offers", []) if card_data else []
        
        if not user.get("is_premium") and len(current_offers) >= 1:
            raise HTTPException(status_code=403, detail="Passez Premium pour ajouter plus d'offres")
        
        new_offer = CreatorOffer(
            title=data.title,
            description=data.description,
            price=data.price,
            external_link=data.external_link,
            order=len(current_offers)
        )
        
        await db.creator_cards.update_one(
            {"user_id": user["user_id"]},
            {
                "$push": {"offers": new_offer.model_dump()},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        return {"success": True, "offer": new_offer.model_dump()}
    
    @router.put("/creators/me/offers/{offer_id}")
    async def update_offer(offer_id: str, data: OfferUpdate, user: dict = Depends(get_current_user)):
        """Update an existing offer"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can update offers")
        
        update_data = {f"offers.$.{k}": v for k, v in data.model_dump(exclude_none=True).items()}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.creator_cards.update_one(
            {"user_id": user["user_id"], "offers.offer_id": offer_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        return {"success": True}
    
    @router.delete("/creators/me/offers/{offer_id}")
    async def delete_offer(offer_id: str, user: dict = Depends(get_current_user)):
        """Delete an offer"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can delete offers")
        
        result = await db.creator_cards.update_one(
            {"user_id": user["user_id"]},
            {
                "$pull": {"offers": {"offer_id": offer_id}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"success": True}
    
    # ==================== LINKS ====================
    
    @router.post("/creators/me/links")
    async def create_link(data: LinkCreate, user: dict = Depends(get_current_user)):
        """Create a new link"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can create links")
        
        # Check limits for non-premium
        card_data = await db.creator_cards.find_one({"user_id": user["user_id"]})
        current_links = card_data.get("links", []) if card_data else []
        
        if not user.get("is_premium") and len(current_links) >= 3:
            raise HTTPException(status_code=403, detail="Passez Premium pour ajouter plus de liens")
        
        new_link = CreatorLink(
            title=data.title,
            url=data.url,
            icon=data.icon,
            order=len(current_links)
        )
        
        await db.creator_cards.update_one(
            {"user_id": user["user_id"]},
            {
                "$push": {"links": new_link.model_dump()},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        return {"success": True, "link": new_link.model_dump()}
    
    @router.put("/creators/me/links/{link_id}")
    async def update_link(link_id: str, data: LinkUpdate, user: dict = Depends(get_current_user)):
        """Update an existing link"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can update links")
        
        update_data = {f"links.$.{k}": v for k, v in data.model_dump(exclude_none=True).items()}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.creator_cards.update_one(
            {"user_id": user["user_id"], "links.link_id": link_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Link not found")
        
        return {"success": True}
    
    @router.delete("/creators/me/links/{link_id}")
    async def delete_link(link_id: str, user: dict = Depends(get_current_user)):
        """Delete a link"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Only creators can delete links")
        
        result = await db.creator_cards.update_one(
            {"user_id": user["user_id"]},
            {
                "$pull": {"links": {"link_id": link_id}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"success": True}
    
    # ==================== PUBLIC CREATOR CARD ====================
    
    @router.get("/c/{username}")
    async def get_public_creator_card(username: str):
        """Get public creator card by username - PUBLIC ENDPOINT"""
        username = username.lower().strip()
        
        # Get creator card data
        card_data = await db.creator_cards.find_one(
            {"username": username},
            {"_id": 0}
        )
        
        if not card_data:
            raise HTTPException(status_code=404, detail="Creator not found")
        
        user_id = card_data["user_id"]
        
        # Get user data
        user = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "password": 0}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="Creator not found")
        
        # Get creator profile
        profile = await db.creator_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Creator profile not found")
        
        # Calculate completion score
        completion_score = calculate_completion_score(profile, user)
        
        # Get badges
        badges = get_badges(profile, user)
        
        # Filter active offers and links only
        active_offers = [o for o in card_data.get("offers", []) if o.get("is_active", True)]
        active_links = [l for l in card_data.get("links", []) if l.get("is_active", True)]
        
        # Sort by order
        active_offers.sort(key=lambda x: x.get("order", 0))
        active_links.sort(key=lambda x: x.get("order", 0))
        
        # Get primary niche
        niches = profile.get("niches", [])
        primary_niche = niches[0] if niches else None
        
        return {
            "username": username,
            "name": user.get("name"),
            "picture": user.get("picture"),
            "banner": user.get("banner"),
            "bio": profile.get("bio"),
            "city": profile.get("city"),
            "niche": primary_niche,
            "niches": niches,
            "completion_score": completion_score,
            "badges": badges,
            "rating": profile.get("rating", 0),
            "reviews_count": profile.get("reviews_count", 0),
            "completed_projects": profile.get("completed_projects", 0),
            "is_premium": user.get("is_premium", False),
            "offers": active_offers,
            "links": active_links,
            "social": {
                "instagram": profile.get("social_instagram"),
                "tiktok": profile.get("social_tiktok"),
                "youtube": profile.get("social_youtube"),
                "twitter": profile.get("social_twitter"),
                "linkedin": profile.get("social_linkedin")
            }
        }
    
    return router
