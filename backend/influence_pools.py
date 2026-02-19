"""
Influence Pools Module - OpenAmbassadors
Système de campagnes massives avec rémunération basée sur la performance
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid

# ==================== CONSTANTS ====================

# Package configurations
PACKAGES = {
    5000: {
        "budget_total": 5000,
        "max_payout_per_creator": 100,
        "pool_size_estimation": "petit à moyen",
        "publication_estimation": "50 à 200",
        "estimated_creators_min": 50,
        "estimated_creators_max": 200
    },
    15000: {
        "budget_total": 15000,
        "max_payout_per_creator": 250,
        "pool_size_estimation": "moyen à élevé",
        "publication_estimation": "200 à 800",
        "estimated_creators_min": 60,
        "estimated_creators_max": 800
    },
    25000: {
        "budget_total": 25000,
        "max_payout_per_creator": 400,
        "pool_size_estimation": "élevé à massif",
        "publication_estimation": "500 à 2000",
        "estimated_creators_min": 62,
        "estimated_creators_max": 2000
    }
}

# CPM rates by platform and country (internal only)
CPM_RATES = {
    "FR": {
        "TIKTOK": 2.50,
        "INSTAGRAM_REELS": 3.00,
        "YOUTUBE_SHORTS": 2.80
    },
    "US": {
        "TIKTOK": 3.50,
        "INSTAGRAM_REELS": 4.00,
        "YOUTUBE_SHORTS": 3.80
    },
    "DEFAULT": {
        "TIKTOK": 2.00,
        "INSTAGRAM_REELS": 2.50,
        "YOUTUBE_SHORTS": 2.30
    }
}

# ==================== MODELS ====================

class PoolMode(str, Enum):
    CPM = "CPM"
    POOL = "POOL"

class Platform(str, Enum):
    TIKTOK = "TIKTOK"
    INSTAGRAM_REELS = "INSTAGRAM_REELS"
    YOUTUBE_SHORTS = "YOUTUBE_SHORTS"

class PoolStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class SubmissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Request Models
class BrandInfo(BaseModel):
    name: str
    industry: str
    website: Optional[str] = None
    social_handles: List[str] = []

class BriefInfo(BaseModel):
    offer_description: str
    key_message: str
    cta: str
    landing_url: Optional[str] = None
    mandatory_hashtags: List[str] = []
    mandatory_mentions: List[str] = []
    content_format: Optional[str] = None
    examples_links: List[str] = []
    brand_guidelines: List[str] = []
    things_to_avoid: List[str] = []

class CreatePoolRequest(BaseModel):
    package: Literal[5000, 15000, 25000]
    mode: PoolMode
    platforms: List[Platform]
    country: str = "FR"
    language: str = "fr"
    duration_days: int = Field(ge=7, le=90)
    brand: BrandInfo
    brief: BriefInfo

class JoinPoolRequest(BaseModel):
    pool_id: str

class SubmitContentRequest(BaseModel):
    pool_id: str
    platform: Platform
    content_url: str
    description: Optional[str] = None

class UpdateViewsRequest(BaseModel):
    submission_id: str
    views: int

# ==================== HELPER FUNCTIONS ====================

def generate_pool_id():
    return f"pool_{uuid.uuid4().hex[:12]}"

def generate_submission_id():
    return f"sub_{uuid.uuid4().hex[:12]}"

def get_cpm_rate(platform: str, country: str) -> float:
    """Get CPM rate for platform and country (internal use only)"""
    country_rates = CPM_RATES.get(country, CPM_RATES["DEFAULT"])
    return country_rates.get(platform, 2.0)

def get_package_config(package: int) -> dict:
    """Get package configuration"""
    return PACKAGES.get(package, PACKAGES[5000])

def calculate_cpm_payout(views: int, platform: str, country: str, max_payout: float, budget_remaining: float) -> float:
    """
    Calculate payout in CPM mode
    Formula: payout = min((eligible_views / 1000) * cpm_platform, max_payout_per_creator, budget_remaining)
    """
    cpm = get_cpm_rate(platform, country)
    raw_payout = (views / 1000) * cpm
    return min(raw_payout, max_payout, budget_remaining)

def calculate_pool_payout(creator_views: int, total_views: int, budget_total: float, max_payout: float) -> float:
    """
    Calculate payout in POOL mode
    Formula: payout_raw = (creator_views / total_campaign_views) * budget_total
             payout_final = min(payout_raw, max_payout_per_creator)
    """
    if total_views == 0:
        return 0
    raw_payout = (creator_views / total_views) * budget_total
    return min(raw_payout, max_payout)

# ==================== DATABASE OPERATIONS ====================

async def create_pool(db, business_user: dict, pool_data: CreatePoolRequest) -> dict:
    """Create a new influence pool campaign"""
    package_config = get_package_config(pool_data.package)
    
    pool_id = generate_pool_id()
    now = datetime.now(timezone.utc)
    end_date = now + timedelta(days=pool_data.duration_days)
    
    pool = {
        "pool_id": pool_id,
        "business_id": business_user["user_id"],
        "business_name": pool_data.brand.name,
        "status": PoolStatus.ACTIVE.value,
        
        # Package & Budget
        "package": pool_data.package,
        "budget_total": package_config["budget_total"],
        "budget_spent": 0,
        "budget_remaining": package_config["budget_total"],
        
        # Mode & Rules
        "mode": pool_data.mode.value,
        "max_payout_per_creator": package_config["max_payout_per_creator"],
        
        # Platforms & Targeting
        "platforms": [p.value for p in pool_data.platforms],
        "country": pool_data.country,
        "language": pool_data.language,
        
        # Timeline
        "duration_days": pool_data.duration_days,
        "start_date": now.isoformat(),
        "end_date": end_date.isoformat(),
        
        # Brand Info
        "brand": pool_data.brand.model_dump(),
        
        # Brief
        "brief": pool_data.brief.model_dump(),
        
        # Stats
        "total_participants": 0,
        "total_submissions": 0,
        "total_views": 0,
        
        # Estimations (for UI)
        "pool_size_estimation": package_config["pool_size_estimation"],
        "publication_estimation": package_config["publication_estimation"],
        
        # Metadata
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.influence_pools.insert_one(pool)
    
    # Remove MongoDB _id from response
    pool.pop("_id", None)
    return pool

async def get_pool_by_id(db, pool_id: str) -> dict:
    """Get pool by ID"""
    pool = await db.influence_pools.find_one({"pool_id": pool_id}, {"_id": 0})
    return pool

async def get_active_pools(db, limit: int = 50) -> list:
    """Get all active pools for creators to discover"""
    pools = await db.influence_pools.find(
        {"status": PoolStatus.ACTIVE.value},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    return pools

async def get_business_pools(db, business_id: str) -> list:
    """Get all pools created by a business"""
    pools = await db.influence_pools.find(
        {"business_id": business_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    return pools

async def join_pool(db, creator_user: dict, pool_id: str) -> dict:
    """Creator joins a pool"""
    pool = await get_pool_by_id(db, pool_id)
    if not pool:
        raise ValueError("Pool not found")
    
    if pool["status"] != PoolStatus.ACTIVE.value:
        raise ValueError("Pool is not active")
    
    # Check if already joined
    existing = await db.pool_participations.find_one({
        "pool_id": pool_id,
        "creator_id": creator_user["user_id"]
    })
    if existing:
        raise ValueError("Already joined this pool")
    
    now = datetime.now(timezone.utc)
    participation = {
        "participation_id": f"part_{uuid.uuid4().hex[:12]}",
        "pool_id": pool_id,
        "creator_id": creator_user["user_id"],
        "creator_name": creator_user.get("name", "Créateur"),
        "creator_picture": creator_user.get("picture"),
        "status": "active",
        "total_views": 0,
        "total_submissions": 0,
        "estimated_earnings": 0,
        "paid_earnings": 0,
        "joined_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.pool_participations.insert_one(participation)
    
    # Update pool stats
    await db.influence_pools.update_one(
        {"pool_id": pool_id},
        {"$inc": {"total_participants": 1}}
    )
    
    participation.pop("_id", None)
    return participation

async def get_creator_participations(db, creator_id: str) -> list:
    """Get all pools a creator has joined"""
    participations = await db.pool_participations.find(
        {"creator_id": creator_id},
        {"_id": 0}
    ).sort("joined_at", -1).to_list(length=100)
    
    # Enrich with pool data
    for p in participations:
        pool = await get_pool_by_id(db, p["pool_id"])
        if pool:
            p["pool"] = pool
    
    return participations

async def submit_content(db, creator_user: dict, submission_data: SubmitContentRequest) -> dict:
    """Creator submits content for a pool"""
    pool = await get_pool_by_id(db, submission_data.pool_id)
    if not pool:
        raise ValueError("Pool not found")
    
    if pool["status"] != PoolStatus.ACTIVE.value:
        raise ValueError("Pool is not active")
    
    # Check if creator has joined
    participation = await db.pool_participations.find_one({
        "pool_id": submission_data.pool_id,
        "creator_id": creator_user["user_id"]
    })
    if not participation:
        raise ValueError("You must join the pool first")
    
    # Check platform is allowed
    if submission_data.platform.value not in pool["platforms"]:
        raise ValueError(f"Platform {submission_data.platform.value} is not allowed for this pool")
    
    now = datetime.now(timezone.utc)
    submission_id = generate_submission_id()
    
    submission = {
        "submission_id": submission_id,
        "pool_id": submission_data.pool_id,
        "creator_id": creator_user["user_id"],
        "creator_name": creator_user.get("name", "Créateur"),
        "platform": submission_data.platform.value,
        "content_url": submission_data.content_url,
        "description": submission_data.description,
        "status": SubmissionStatus.APPROVED.value,  # Auto-approved as per requirements
        "views": 0,
        "estimated_payout": 0,
        "submitted_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.pool_submissions.insert_one(submission)
    
    # Update participation stats
    await db.pool_participations.update_one(
        {"pool_id": submission_data.pool_id, "creator_id": creator_user["user_id"]},
        {"$inc": {"total_submissions": 1}}
    )
    
    # Update pool stats
    await db.influence_pools.update_one(
        {"pool_id": submission_data.pool_id},
        {"$inc": {"total_submissions": 1}}
    )
    
    submission.pop("_id", None)
    return submission

async def get_pool_submissions(db, pool_id: str) -> list:
    """Get all submissions for a pool"""
    submissions = await db.pool_submissions.find(
        {"pool_id": pool_id},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(length=500)
    return submissions

async def get_creator_submissions(db, creator_id: str, pool_id: str = None) -> list:
    """Get all submissions by a creator"""
    query = {"creator_id": creator_id}
    if pool_id:
        query["pool_id"] = pool_id
    
    submissions = await db.pool_submissions.find(
        query,
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(length=100)
    return submissions

async def update_submission_views(db, submission_id: str, views: int) -> dict:
    """Update views for a submission (for future API integration)"""
    submission = await db.pool_submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise ValueError("Submission not found")
    
    pool = await get_pool_by_id(db, submission["pool_id"])
    if not pool:
        raise ValueError("Pool not found")
    
    old_views = submission.get("views", 0)
    views_diff = views - old_views
    
    # Calculate estimated payout based on mode
    if pool["mode"] == PoolMode.CPM.value:
        estimated_payout = calculate_cpm_payout(
            views=views,
            platform=submission["platform"],
            country=pool["country"],
            max_payout=pool["max_payout_per_creator"],
            budget_remaining=pool["budget_remaining"]
        )
    else:
        # For POOL mode, we need total views to calculate
        # This will be recalculated when needed
        estimated_payout = 0
    
    now = datetime.now(timezone.utc)
    
    await db.pool_submissions.update_one(
        {"submission_id": submission_id},
        {
            "$set": {
                "views": views,
                "estimated_payout": estimated_payout,
                "updated_at": now.isoformat()
            }
        }
    )
    
    # Update participation total views
    await db.pool_participations.update_one(
        {"pool_id": submission["pool_id"], "creator_id": submission["creator_id"]},
        {"$inc": {"total_views": views_diff}}
    )
    
    # Update pool total views
    await db.influence_pools.update_one(
        {"pool_id": submission["pool_id"]},
        {"$inc": {"total_views": views_diff}}
    )
    
    return {"submission_id": submission_id, "views": views, "estimated_payout": estimated_payout}

async def calculate_pool_payouts(db, pool_id: str) -> list:
    """Calculate payouts for all participants in a pool"""
    pool = await get_pool_by_id(db, pool_id)
    if not pool:
        raise ValueError("Pool not found")
    
    participations = await db.pool_participations.find(
        {"pool_id": pool_id},
        {"_id": 0}
    ).to_list(length=1000)
    
    total_views = pool.get("total_views", 0)
    budget_total = pool["budget_total"]
    max_payout = pool["max_payout_per_creator"]
    
    results = []
    
    for p in participations:
        creator_views = p.get("total_views", 0)
        
        if pool["mode"] == PoolMode.POOL.value:
            payout = calculate_pool_payout(
                creator_views=creator_views,
                total_views=total_views,
                budget_total=budget_total,
                max_payout=max_payout
            )
        else:  # CPM mode - sum up all submissions
            submissions = await get_creator_submissions(db, p["creator_id"], pool_id)
            payout = 0
            for sub in submissions:
                payout += calculate_cpm_payout(
                    views=sub.get("views", 0),
                    platform=sub["platform"],
                    country=pool["country"],
                    max_payout=max_payout,
                    budget_remaining=budget_total - pool.get("budget_spent", 0)
                )
            payout = min(payout, max_payout)
        
        results.append({
            "creator_id": p["creator_id"],
            "creator_name": p["creator_name"],
            "total_views": creator_views,
            "total_submissions": p.get("total_submissions", 0),
            "estimated_payout": round(payout, 2)
        })
    
    # Sort by payout descending
    results.sort(key=lambda x: x["estimated_payout"], reverse=True)
    
    return results

async def get_pool_leaderboard(db, pool_id: str, limit: int = 20) -> list:
    """Get leaderboard for a pool"""
    participations = await db.pool_participations.find(
        {"pool_id": pool_id},
        {"_id": 0, "creator_id": 1, "creator_name": 1, "creator_picture": 1, "total_views": 1, "total_submissions": 1}
    ).sort("total_views", -1).limit(limit).to_list(length=limit)
    
    return participations

async def check_and_complete_pools(db):
    """Check and complete pools that have ended or exhausted budget"""
    now = datetime.now(timezone.utc)
    
    # Find pools to complete
    pools_to_complete = await db.influence_pools.find({
        "status": PoolStatus.ACTIVE.value,
        "$or": [
            {"end_date": {"$lte": now.isoformat()}},
            {"budget_remaining": {"$lte": 0}}
        ]
    }).to_list(length=100)
    
    for pool in pools_to_complete:
        await db.influence_pools.update_one(
            {"pool_id": pool["pool_id"]},
            {"$set": {"status": PoolStatus.COMPLETED.value, "updated_at": now.isoformat()}}
        )
    
    return len(pools_to_complete)

# ==================== UI DISPLAY HELPERS ====================

def get_ui_business_summary(pool: dict) -> dict:
    """Generate UI summary for business dashboard"""
    package_config = get_package_config(pool["package"])
    
    mode_explanation = ""
    if pool["mode"] == PoolMode.CPM.value:
        mode_explanation = "Les créateurs sont rémunérés en fonction des vues générées par leur contenu. Plus ils performent, plus ils gagnent."
    else:
        mode_explanation = "Le budget total est réparti entre les créateurs selon leur performance relative. Plus un créateur génère de vues, plus sa part est importante."
    
    return {
        "budget": pool["budget_total"],
        "budget_spent": pool.get("budget_spent", 0),
        "budget_remaining": pool.get("budget_remaining", pool["budget_total"]),
        "duration": pool["duration_days"],
        "estimated_creator_participation": package_config["pool_size_estimation"],
        "estimated_publications": package_config["publication_estimation"],
        "max_gain_per_creator": pool["max_payout_per_creator"],
        "how_it_works_simple": f"Lancez votre campagne et laissez les créateurs produire du contenu pour vous. Budget maîtrisé, résultats mesurables.",
        "mode_explanation": mode_explanation,
        "total_participants": pool.get("total_participants", 0),
        "total_submissions": pool.get("total_submissions", 0),
        "total_views": pool.get("total_views", 0)
    }

def get_ui_creator_arena(pool: dict, participation: dict = None) -> dict:
    """Generate UI display for creator arena"""
    now = datetime.now(timezone.utc)
    end_date = datetime.fromisoformat(pool["end_date"].replace("Z", "+00:00"))
    time_remaining = max(0, (end_date - now).days)
    
    mode_explanation = ""
    if pool["mode"] == PoolMode.CPM.value:
        mode_explanation = "Tu es payé en fonction du nombre de vues que ton contenu génère. Plus tu performes, plus tu gagnes !"
    else:
        mode_explanation = "Le budget est partagé entre tous les participants selon leur performance. Donne le meilleur de toi-même pour maximiser ta part !"
    
    result = {
        "pool_id": pool["pool_id"],
        "brand_name": pool["brand"]["name"],
        "brand_industry": pool["brand"]["industry"],
        "brief": pool["brief"],
        "platforms": pool["platforms"],
        "budget_remaining": pool.get("budget_remaining", pool["budget_total"]),
        "time_remaining_days": time_remaining,
        "max_possible_gain": pool["max_payout_per_creator"],
        "mode_explanation": mode_explanation,
        "total_participants": pool.get("total_participants", 0),
        "status": pool["status"]
    }
    
    if participation:
        result["has_joined"] = True
        result["my_views"] = participation.get("total_views", 0)
        result["my_submissions"] = participation.get("total_submissions", 0)
        result["my_estimated_earnings"] = participation.get("estimated_earnings", 0)
    else:
        result["has_joined"] = False
    
    return result
