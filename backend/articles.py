"""
Articles/Learn Content Management Module
Handles CRUD operations for learning articles with banner/video support
"""

from fastapi import HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class ArticleCreate(BaseModel):
    title: str
    description: str
    content: str
    category: str
    duration: Optional[str] = None
    points: int = 5
    is_premium: bool = False
    is_published: bool = True
    banner_type: str = "image"  # "image" or "video"
    banner_url: Optional[str] = None
    video_url: Optional[str] = None
    tags: List[str] = []

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[str] = None
    points: Optional[int] = None
    is_premium: Optional[bool] = None
    is_published: Optional[bool] = None
    banner_type: Optional[str] = None
    banner_url: Optional[str] = None
    video_url: Optional[str] = None
    tags: Optional[List[str]] = None


def setup_articles_routes(router, db, get_current_user, upload_to_r2, ADMIN_EMAILS):
    """Setup all article-related routes"""
    
    # ==================== PUBLIC ROUTES ====================
    
    @router.get("/articles")
    async def get_articles(
        category: Optional[str] = None,
        search: Optional[str] = None,
        published_only: bool = True,
        limit: int = 50
    ):
        """Get all articles with optional filtering"""
        query = {}
        
        if published_only:
            query["is_published"] = True
        
        if category and category != "Tous":
            query["category"] = category
        
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$regex": search, "$options": "i"}}
            ]
        
        articles = await db.articles.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Get categories with counts
        pipeline = [
            {"$match": {"is_published": True}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        categories_cursor = db.articles.aggregate(pipeline)
        categories_result = await categories_cursor.to_list(20)
        categories = [{"name": cat["_id"], "count": cat["count"]} for cat in categories_result if cat["_id"]]
        
        return {
            "articles": articles,
            "categories": categories,
            "total": len(articles)
        }
    
    @router.get("/articles/{article_id}")
    async def get_article(article_id: str):
        """Get a single article by ID"""
        article = await db.articles.find_one(
            {"article_id": article_id},
            {"_id": 0}
        )
        
        if not article:
            raise HTTPException(status_code=404, detail="Article non trouvé")
        
        # Increment view count
        await db.articles.update_one(
            {"article_id": article_id},
            {"$inc": {"views": 1}}
        )
        
        return article
    
    # ==================== USER PROGRESS ROUTES ====================
    
    @router.post("/articles/{article_id}/complete")
    async def complete_article(article_id: str, user: dict = None):
        """Mark an article as completed and award points"""
        if user is None:
            user = await get_current_user()
        
        user_id = user["user_id"]
        
        # Check if article exists
        article = await db.articles.find_one({"article_id": article_id})
        if not article:
            raise HTTPException(status_code=404, detail="Article non trouvé")
        
        # Check premium access
        if article.get("is_premium") and not user.get("is_premium"):
            raise HTTPException(status_code=403, detail="Contenu Premium requis")
        
        # Check if already completed
        existing = await db.article_progress.find_one({
            "user_id": user_id,
            "article_id": article_id,
            "completed": True
        })
        
        if existing:
            return {"message": "Article déjà complété", "points_awarded": 0}
        
        # Record completion
        progress = {
            "progress_id": f"progress_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "article_id": article_id,
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.article_progress.update_one(
            {"user_id": user_id, "article_id": article_id},
            {"$set": progress},
            upsert=True
        )
        
        # Award points to creator profile
        points = article.get("points", 5)
        await db.creator_profiles.update_one(
            {"user_id": user_id},
            {"$inc": {"learn_points": points}}
        )
        
        return {
            "message": "Article complété !",
            "points_awarded": points
        }
    
    @router.get("/articles/progress/me")
    async def get_my_progress(user: dict = None):
        """Get current user's article completion progress"""
        if user is None:
            user = await get_current_user()
        
        user_id = user["user_id"]
        
        progress = await db.article_progress.find(
            {"user_id": user_id, "completed": True},
            {"_id": 0}
        ).to_list(100)
        
        completed_ids = [p["article_id"] for p in progress]
        
        # Get total points earned
        total_points = 0
        if completed_ids:
            articles = await db.articles.find(
                {"article_id": {"$in": completed_ids}},
                {"points": 1, "_id": 0}
            ).to_list(100)
            total_points = sum(a.get("points", 5) for a in articles)
        
        return {
            "completed_articles": completed_ids,
            "total_completed": len(completed_ids),
            "total_points": total_points
        }
    
    # ==================== ADMIN ROUTES ====================
    
    @router.post("/admin/articles")
    async def create_article(data: ArticleCreate, user: dict = None):
        """Create a new article (admin only)"""
        if user is None:
            user = await get_current_user()
        
        if user.get("email") not in ADMIN_EMAILS:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        article = {
            "article_id": f"article_{uuid.uuid4().hex[:12]}",
            "title": data.title,
            "description": data.description,
            "content": data.content,
            "category": data.category,
            "duration": data.duration,
            "points": data.points,
            "is_premium": data.is_premium,
            "is_published": data.is_published,
            "banner_type": data.banner_type,
            "banner_url": data.banner_url,
            "video_url": data.video_url,
            "tags": data.tags,
            "views": 0,
            "author_id": user["user_id"],
            "author_name": user.get("name", "Admin"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.articles.insert_one(article)
        
        # Remove _id before returning
        article.pop("_id", None)
        
        logger.info(f"Article created: {article['article_id']} by {user['email']}")
        return article
    
    @router.put("/admin/articles/{article_id}")
    async def update_article(article_id: str, data: ArticleUpdate, user: dict = None):
        """Update an article (admin only)"""
        if user is None:
            user = await get_current_user()
        
        if user.get("email") not in ADMIN_EMAILS:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Build update data
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.articles.update_one(
            {"article_id": article_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Article non trouvé")
        
        # Get updated article
        article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
        
        logger.info(f"Article updated: {article_id} by {user['email']}")
        return article
    
    @router.delete("/admin/articles/{article_id}")
    async def delete_article(article_id: str, user: dict = None):
        """Delete an article (admin only)"""
        if user is None:
            user = await get_current_user()
        
        if user.get("email") not in ADMIN_EMAILS:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        result = await db.articles.delete_one({"article_id": article_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Article non trouvé")
        
        # Also delete progress records
        await db.article_progress.delete_many({"article_id": article_id})
        
        logger.info(f"Article deleted: {article_id} by {user['email']}")
        return {"message": "Article supprimé"}
    
    @router.get("/admin/articles")
    async def get_all_articles_admin(user: dict = None, limit: int = 100):
        """Get all articles including unpublished (admin only)"""
        if user is None:
            user = await get_current_user()
        
        if user.get("email") not in ADMIN_EMAILS:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        articles = await db.articles.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Get stats
        total_views = sum(a.get("views", 0) for a in articles)
        total_completions = await db.article_progress.count_documents({"completed": True})
        
        return {
            "articles": articles,
            "stats": {
                "total_articles": len(articles),
                "published": len([a for a in articles if a.get("is_published")]),
                "premium": len([a for a in articles if a.get("is_premium")]),
                "total_views": total_views,
                "total_completions": total_completions
            }
        }
    
    @router.post("/admin/articles/{article_id}/banner")
    async def upload_article_banner(
        article_id: str,
        file: UploadFile = File(...),
        user: dict = None
    ):
        """Upload banner image for an article (admin only)"""
        if user is None:
            user = await get_current_user()
        
        if user.get("email") not in ADMIN_EMAILS:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Type de fichier non supporté")
        
        # Read file content
        content = await file.read()
        
        # Determine file extension
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"article_{article_id}_{uuid.uuid4().hex[:8]}.{ext}"
        
        # Determine banner type
        banner_type = "video" if file.content_type.startswith("video/") else "image"
        
        # Upload to R2
        try:
            url = await upload_to_r2(content, filename, file.content_type, "articles")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
        # Update article
        update_field = "video_url" if banner_type == "video" else "banner_url"
        await db.articles.update_one(
            {"article_id": article_id},
            {"$set": {update_field: url, "banner_type": banner_type, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"url": url, "banner_type": banner_type}
    
    logger.info("Articles routes initialized")
