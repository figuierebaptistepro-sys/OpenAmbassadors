# reviews.py - Système de Notation Hybride OpenAmbassadors
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import hashlib
import secrets

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

# ==================== MODELS ====================

class ReviewCreate(BaseModel):
    """Créer un avis vérifié (post-mission)"""
    mission_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=10, max_length=2000)

class ReviewUpdate(BaseModel):
    """Modifier un avis (fenêtre 48h)"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, min_length=10, max_length=2000)

class ExternalInviteCreate(BaseModel):
    """Inviter une entreprise externe à laisser un avis"""
    company_name: str = Field(..., min_length=2, max_length=100)
    company_email: EmailStr
    collaboration_description: Optional[str] = Field(None, max_length=500)

class ExternalReviewCreate(BaseModel):
    """Avis externe (via token d'invitation)"""
    token: str
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=10, max_length=2000)
    reviewer_name: str = Field(..., min_length=2, max_length=100)

class ReviewResponse(BaseModel):
    """Format de réponse d'un avis"""
    review_id: str
    reviewee_id: str
    reviewee_role: str  # creator / company
    reviewer_name: str
    reviewer_company: Optional[str]
    rating: int
    comment: str
    source: str  # verified / external
    is_verified: bool
    mission_id: Optional[str]
    created_at: datetime
    badges: List[str] = []

# ==================== HELPER FUNCTIONS ====================

def hash_email(email: str) -> str:
    """Hash un email pour stockage sécurisé"""
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()

def generate_invite_token() -> str:
    """Génère un token sécurisé pour invitation externe"""
    return secrets.token_urlsafe(32)

def calculate_weighted_score(reviews: List[dict]) -> dict:
    """
    Calcule le score pondéré selon la formule :
    - Avis vérifiés : poids 1.0
    - Avis externes : poids 0.6
    """
    if not reviews:
        return {"score": 0, "count": 0, "verified_count": 0, "external_count": 0}
    
    total_weighted = 0
    total_weight = 0
    verified_count = 0
    external_count = 0
    
    for review in reviews:
        if not review.get("is_published", True):
            continue
            
        weight = 1.0 if review.get("source") == "verified" else 0.6
        total_weighted += review["rating"] * weight
        total_weight += weight
        
        if review.get("source") == "verified":
            verified_count += 1
        else:
            external_count += 1
    
    score = round(total_weighted / total_weight, 2) if total_weight > 0 else 0
    
    return {
        "score": score,
        "count": verified_count + external_count,
        "verified_count": verified_count,
        "external_count": external_count
    }

def get_rating_distribution(reviews: List[dict]) -> dict:
    """Répartition par étoiles"""
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        if review.get("is_published", True):
            rating = review.get("rating", 0)
            if rating in distribution:
                distribution[rating] += 1
    return distribution

def calculate_badges(reviews: List[dict], user_data: dict) -> List[str]:
    """Calcule les badges automatiques"""
    badges = []
    stats = calculate_weighted_score(reviews)
    
    # Top Rated: note ≥ 4.8 avec au moins 10 avis vérifiés
    if stats["score"] >= 4.8 and stats["verified_count"] >= 10:
        badges.append("top_rated")
    
    # Rising Star: note ≥ 4.5 avec au moins 5 avis vérifiés
    if stats["score"] >= 4.5 and stats["verified_count"] >= 5:
        badges.append("rising_star")
    
    # Verified Pro: au moins 3 avis vérifiés
    if stats["verified_count"] >= 3:
        badges.append("verified_pro")
    
    # 5 étoiles consécutives
    verified_reviews = [r for r in reviews if r.get("source") == "verified" and r.get("is_published", True)]
    verified_reviews.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    if len(verified_reviews) >= 5:
        last_5 = verified_reviews[:5]
        if all(r.get("rating") == 5 for r in last_5):
            badges.append("perfect_streak")
    
    # Trusted by externals: au moins 3 avis externes validés
    if stats["external_count"] >= 3:
        badges.append("trusted_external")
    
    return badges

# ==================== ROUTES SETUP ====================

def setup_reviews_routes(api_router, db, get_current_user, send_email, FRONTEND_URL):
    """Configure toutes les routes du système de notation"""
    
    # ==================== AVIS VÉRIFIÉS (POST-MISSION) ====================
    
    @api_router.post("/reviews")
    async def create_verified_review(review_data: ReviewCreate, user: dict = Depends(get_current_user)):
        """
        Créer un avis vérifié après une mission complétée.
        - Seuls les participants de la mission peuvent noter
        - Un seul avis par mission et par partie
        """
        mission_id = review_data.mission_id
        
        # Trouver la mission/projet
        project = await db.projects.find_one({"project_id": mission_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Mission non trouvée")
        
        # Vérifier que la mission est complétée
        if project.get("status") != "completed":
            raise HTTPException(status_code=400, detail="La mission doit être terminée pour laisser un avis")
        
        user_id = user["user_id"]
        user_type = user.get("user_type")
        
        # Déterminer qui note qui
        if user_type == "business" and project.get("business_id") == user_id:
            # L'entreprise note le créateur
            # Trouver le créateur accepté de la mission
            accepted_app = next((a for a in project.get("applications", []) if a.get("status") == "accepted"), None)
            if not accepted_app:
                raise HTTPException(status_code=400, detail="Aucun créateur accepté sur cette mission")
            
            reviewee_id = accepted_app["creator_id"]
            reviewee_role = "creator"
            reviewer_role = "business"
            
        elif user_type == "creator":
            # Le créateur note l'entreprise
            # Vérifier que le créateur était accepté sur cette mission
            was_accepted = any(
                a.get("creator_id") == user_id and a.get("status") == "accepted" 
                for a in project.get("applications", [])
            )
            if not was_accepted:
                raise HTTPException(status_code=403, detail="Vous n'étiez pas sur cette mission")
            
            reviewee_id = project["business_id"]
            reviewee_role = "company"
            reviewer_role = "creator"
        else:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas noter cette mission")
        
        # Vérifier qu'un avis n'existe pas déjà
        existing = await db.reviews.find_one({
            "mission_id": mission_id,
            "reviewer_id": user_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Vous avez déjà laissé un avis pour cette mission")
        
        # Récupérer les infos du reviewer
        reviewer_profile = None
        if user_type == "business":
            reviewer_profile = await db.business_profiles.find_one({"user_id": user_id}, {"_id": 0})
        
        # Créer l'avis
        review = {
            "review_id": f"rev_{uuid.uuid4().hex[:12]}",
            "reviewee_id": reviewee_id,
            "reviewee_role": reviewee_role,
            "reviewer_id": user_id,
            "reviewer_role": reviewer_role,
            "reviewer_name": user.get("name", "Anonyme"),
            "reviewer_company": reviewer_profile.get("company_name") if reviewer_profile else None,
            "reviewer_email_hash": hash_email(user.get("email", "")),
            "mission_id": mission_id,
            "rating": review_data.rating,
            "comment": review_data.comment,
            "source": "verified",
            "is_verified": True,
            "is_published": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "can_edit_until": datetime.now(timezone.utc) + timedelta(hours=48)
        }
        
        await db.reviews.insert_one(review)
        
        # Mettre à jour le score du reviewee
        await update_user_rating(db, reviewee_id, reviewee_role)
        
        # Créer une notification
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": reviewee_id,
            "type": "review",
            "title": "Nouvel avis reçu !",
            "message": f"Vous avez reçu un avis {review_data.rating} étoiles",
            "icon": "⭐",
            "link": "/settings?tab=reviews",
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {
            "review_id": review["review_id"],
            "message": "Avis publié avec succès",
            "can_edit_until": review["can_edit_until"].isoformat()
        }
    
    @api_router.put("/reviews/{review_id}")
    async def update_review(review_id: str, review_data: ReviewUpdate, user: dict = Depends(get_current_user)):
        """Modifier un avis dans la fenêtre de 48h"""
        review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
        if not review:
            raise HTTPException(status_code=404, detail="Avis non trouvé")
        
        if review.get("reviewer_id") != user["user_id"]:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier cet avis")
        
        # Vérifier la fenêtre de modification
        can_edit_until = review.get("can_edit_until")
        if can_edit_until and datetime.now(timezone.utc) > can_edit_until:
            raise HTTPException(status_code=400, detail="La fenêtre de modification de 48h est expirée")
        
        update_data = {"updated_at": datetime.now(timezone.utc)}
        if review_data.rating is not None:
            update_data["rating"] = review_data.rating
        if review_data.comment is not None:
            update_data["comment"] = review_data.comment
        
        await db.reviews.update_one({"review_id": review_id}, {"$set": update_data})
        
        # Recalculer le score
        await update_user_rating(db, review["reviewee_id"], review["reviewee_role"])
        
        return {"message": "Avis modifié avec succès"}
    
    # ==================== AVIS EXTERNES (INVITATION) ====================
    
    @api_router.post("/reviews/invite")
    async def create_external_invite(invite_data: ExternalInviteCreate, user: dict = Depends(get_current_user)):
        """
        Inviter une entreprise externe à laisser un avis.
        Réservé aux créateurs.
        """
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Réservé aux créateurs")
        
        email_hash = hash_email(invite_data.company_email)
        
        # Vérifier qu'une invitation n'existe pas déjà pour cet email
        existing = await db.review_invitations.find_one({
            "creator_id": user["user_id"],
            "company_email_hash": email_hash,
            "status": {"$in": ["pending", "completed"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Une invitation a déjà été envoyée à cette entreprise")
        
        # Créer l'invitation
        token = generate_invite_token()
        invitation = {
            "invitation_id": f"inv_{uuid.uuid4().hex[:12]}",
            "creator_id": user["user_id"],
            "creator_name": user.get("name", "Créateur"),
            "company_name": invite_data.company_name,
            "company_email": invite_data.company_email,  # Stocké pour l'envoi, puis supprimé
            "company_email_hash": email_hash,
            "collaboration_description": invite_data.collaboration_description,
            "token": token,
            "token_expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "status": "pending",  # pending, completed, expired
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.review_invitations.insert_one(invitation)
        
        # Envoyer l'email d'invitation
        review_url = f"{FRONTEND_URL}/review/external?token={token}"
        
        await send_email(
            to=invite_data.company_email,
            subject=f"🌟 {user.get('name', 'Un créateur')} vous invite à partager votre expérience",
            html=f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #fafafa;">
                <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 28px;">⭐</span>
                        </div>
                        <h1 style="color: #333; margin: 0; font-size: 22px;">Votre avis compte !</h1>
                    </div>
                    
                    <p style="color: #555; line-height: 1.7; font-size: 15px;">
                        <strong>{user.get('name', 'Un créateur')}</strong> vous invite à partager votre expérience de collaboration sur <strong>OpenAmbassadors</strong>.
                    </p>
                    
                    {f'<p style="color: #777; font-size: 14px; font-style: italic;">"{invite_data.collaboration_description}"</p>' if invite_data.collaboration_description else ''}
                    
                    <p style="color: #555; line-height: 1.7; font-size: 15px;">
                        Votre avis aidera d'autres entreprises à découvrir ce créateur talentueux.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{review_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #E91E63 0%, #FF5722 100%); color: white; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 15px;">
                            Laisser un avis
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Ce lien expire dans 7 jours.
                    </p>
                </div>
                
                <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
                    OpenAmbassadors - La plateforme qui connecte créateurs et entreprises
                </p>
            </div>
            """
        )
        
        # Supprimer l'email en clair pour sécurité
        await db.review_invitations.update_one(
            {"invitation_id": invitation["invitation_id"]},
            {"$unset": {"company_email": ""}}
        )
        
        return {
            "invitation_id": invitation["invitation_id"],
            "message": f"Invitation envoyée à {invite_data.company_name}"
        }
    
    @api_router.get("/reviews/invitations")
    async def get_my_invitations(user: dict = Depends(get_current_user)):
        """Récupérer mes invitations envoyées (créateur)"""
        if user.get("user_type") != "creator":
            raise HTTPException(status_code=403, detail="Réservé aux créateurs")
        
        invitations = await db.review_invitations.find(
            {"creator_id": user["user_id"]},
            {"_id": 0, "token": 0}
        ).sort("created_at", -1).to_list(50)
        
        return invitations
    
    @api_router.get("/reviews/external/validate")
    async def validate_external_token(token: str):
        """Valider un token d'invitation externe (page publique)"""
        invitation = await db.review_invitations.find_one(
            {"token": token, "status": "pending"},
            {"_id": 0}
        )
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation invalide ou expirée")
        
        # Vérifier l'expiration
        if datetime.now(timezone.utc) > invitation.get("token_expires_at", datetime.min.replace(tzinfo=timezone.utc)):
            await db.review_invitations.update_one(
                {"token": token},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(status_code=400, detail="Cette invitation a expiré")
        
        # Récupérer les infos du créateur
        creator = await db.users.find_one(
            {"user_id": invitation["creator_id"]},
            {"_id": 0, "password": 0}
        )
        
        return {
            "creator_name": invitation.get("creator_name"),
            "creator_picture": creator.get("picture") if creator else None,
            "company_name": invitation.get("company_name"),
            "collaboration_description": invitation.get("collaboration_description")
        }
    
    @api_router.post("/reviews/external")
    async def submit_external_review(review_data: ExternalReviewCreate):
        """Soumettre un avis externe (page publique, pas d'auth)"""
        invitation = await db.review_invitations.find_one(
            {"token": review_data.token, "status": "pending"},
            {"_id": 0}
        )
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation invalide ou déjà utilisée")
        
        # Vérifier l'expiration
        if datetime.now(timezone.utc) > invitation.get("token_expires_at", datetime.min.replace(tzinfo=timezone.utc)):
            raise HTTPException(status_code=400, detail="Cette invitation a expiré")
        
        # Créer l'avis externe
        review = {
            "review_id": f"rev_{uuid.uuid4().hex[:12]}",
            "reviewee_id": invitation["creator_id"],
            "reviewee_role": "creator",
            "reviewer_id": None,  # Pas d'utilisateur connecté
            "reviewer_role": "external_company",
            "reviewer_name": review_data.reviewer_name,
            "reviewer_company": invitation.get("company_name"),
            "reviewer_email_hash": invitation.get("company_email_hash"),
            "mission_id": None,  # Pas de mission associée
            "invitation_id": invitation["invitation_id"],
            "rating": review_data.rating,
            "comment": review_data.comment,
            "source": "external",
            "is_verified": False,  # Avis externe = non vérifié
            "is_published": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "can_edit_until": None  # Pas de modification pour les avis externes
        }
        
        await db.reviews.insert_one(review)
        
        # Marquer l'invitation comme complétée
        await db.review_invitations.update_one(
            {"invitation_id": invitation["invitation_id"]},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
        )
        
        # Mettre à jour le score du créateur
        await update_user_rating(db, invitation["creator_id"], "creator")
        
        # Notifier le créateur
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": invitation["creator_id"],
            "type": "review",
            "title": "Nouvel avis externe reçu !",
            "message": f"{review_data.reviewer_name} de {invitation.get('company_name')} vous a laissé {review_data.rating} étoiles",
            "icon": "🌟",
            "link": "/settings?tab=reviews",
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"message": "Merci pour votre avis !"}
    
    # ==================== LECTURE DES AVIS ====================
    
    @api_router.get("/reviews/user/{user_id}")
    async def get_user_reviews(user_id: str, limit: int = 20, offset: int = 0):
        """Récupérer les avis d'un utilisateur (page publique)"""
        reviews = await db.reviews.find(
            {"reviewee_id": user_id, "is_published": True},
            {"_id": 0, "reviewer_email_hash": 0, "reviewer_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        # Récupérer les infos du user pour les badges
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        all_reviews = await db.reviews.find(
            {"reviewee_id": user_id, "is_published": True},
            {"_id": 0}
        ).to_list(1000)
        
        stats = calculate_weighted_score(all_reviews)
        badges = calculate_badges(all_reviews, user or {})
        distribution = get_rating_distribution(all_reviews)
        
        return {
            "reviews": reviews,
            "stats": stats,
            "badges": badges,
            "distribution": distribution
        }
    
    @api_router.get("/reviews/mission/{mission_id}")
    async def get_mission_reviews(mission_id: str, user: dict = Depends(get_current_user)):
        """Récupérer les avis d'une mission"""
        reviews = await db.reviews.find(
            {"mission_id": mission_id},
            {"_id": 0, "reviewer_email_hash": 0}
        ).to_list(10)
        
        # Vérifier si l'utilisateur peut encore noter
        user_review = next((r for r in reviews if r.get("reviewer_id") == user["user_id"]), None)
        can_review = user_review is None
        
        return {
            "reviews": reviews,
            "can_review": can_review,
            "user_review": user_review
        }
    
    @api_router.get("/reviews/pending")
    async def get_pending_reviews(user: dict = Depends(get_current_user)):
        """Récupérer les missions terminées en attente d'avis"""
        user_id = user["user_id"]
        user_type = user.get("user_type")
        
        pending = []
        
        if user_type == "business":
            # Missions de l'entreprise qui sont terminées
            projects = await db.projects.find(
                {"business_id": user_id, "status": "completed"},
                {"_id": 0}
            ).to_list(50)
            
            for project in projects:
                # Vérifier si un avis existe déjà
                existing = await db.reviews.find_one({
                    "mission_id": project["project_id"],
                    "reviewer_id": user_id
                })
                if not existing:
                    accepted_app = next((a for a in project.get("applications", []) if a.get("status") == "accepted"), None)
                    if accepted_app:
                        creator = await db.users.find_one({"user_id": accepted_app["creator_id"]}, {"_id": 0, "password": 0})
                        pending.append({
                            "mission_id": project["project_id"],
                            "mission_title": project.get("title"),
                            "reviewee_id": accepted_app["creator_id"],
                            "reviewee_name": creator.get("name") if creator else "Créateur",
                            "reviewee_picture": creator.get("picture") if creator else None,
                            "completed_at": project.get("completed_at")
                        })
        
        else:  # creator
            # Missions où le créateur était accepté et qui sont terminées
            projects = await db.projects.find(
                {
                    "status": "completed",
                    "applications": {"$elemMatch": {"creator_id": user_id, "status": "accepted"}}
                },
                {"_id": 0}
            ).to_list(50)
            
            for project in projects:
                existing = await db.reviews.find_one({
                    "mission_id": project["project_id"],
                    "reviewer_id": user_id
                })
                if not existing:
                    business = await db.users.find_one({"user_id": project["business_id"]}, {"_id": 0, "password": 0})
                    business_profile = await db.business_profiles.find_one({"user_id": project["business_id"]}, {"_id": 0})
                    pending.append({
                        "mission_id": project["project_id"],
                        "mission_title": project.get("title"),
                        "reviewee_id": project["business_id"],
                        "reviewee_name": business_profile.get("company_name") if business_profile else "Entreprise",
                        "reviewee_picture": business.get("picture") if business else None,
                        "completed_at": project.get("completed_at")
                    })
        
        return pending
    
    # ==================== ADMIN / MODÉRATION ====================
    
    @api_router.get("/admin/reviews")
    async def admin_get_all_reviews(
        user: dict = Depends(get_current_user),
        source: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ):
        """Admin: Liste tous les avis"""
        # Vérifier admin
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        query = {}
        if source:
            query["source"] = source
        
        reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        total = await db.reviews.count_documents(query)
        
        # Enrichir avec les infos
        enriched = []
        for review in reviews:
            reviewee = await db.users.find_one({"user_id": review.get("reviewee_id")}, {"_id": 0, "password": 0})
            enriched.append({
                **review,
                "reviewee_name": reviewee.get("name") if reviewee else "Inconnu",
                "reviewee_picture": reviewee.get("picture") if reviewee else None
            })
        
        return {"reviews": enriched, "total": total}
    
    @api_router.put("/admin/reviews/{review_id}/toggle")
    async def admin_toggle_review(review_id: str, user: dict = Depends(get_current_user)):
        """Admin: Masquer/afficher un avis"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
        if not review:
            raise HTTPException(status_code=404, detail="Avis non trouvé")
        
        new_status = not review.get("is_published", True)
        await db.reviews.update_one(
            {"review_id": review_id},
            {"$set": {"is_published": new_status}}
        )
        
        # Recalculer le score
        await update_user_rating(db, review["reviewee_id"], review["reviewee_role"])
        
        return {"is_published": new_status}
    
    @api_router.delete("/admin/reviews/{review_id}")
    async def admin_delete_review(review_id: str, user: dict = Depends(get_current_user)):
        """Admin: Supprimer un avis"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
        if not review:
            raise HTTPException(status_code=404, detail="Avis non trouvé")
        
        await db.reviews.delete_one({"review_id": review_id})
        
        # Recalculer le score
        await update_user_rating(db, review["reviewee_id"], review["reviewee_role"])
        
        return {"message": "Avis supprimé"}
    
    @api_router.post("/reviews/{review_id}/report")
    async def report_review(review_id: str, request: Request, user: dict = Depends(get_current_user)):
        """Signaler un avis"""
        body = await request.json()
        reason = body.get("reason", "")
        
        review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
        if not review:
            raise HTTPException(status_code=404, detail="Avis non trouvé")
        
        report = {
            "report_id": f"rpt_{uuid.uuid4().hex[:12]}",
            "review_id": review_id,
            "reported_by_id": user["user_id"],
            "reason": reason,
            "status": "open",  # open, reviewed, closed
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.review_reports.insert_one(report)
        
        return {"message": "Signalement enregistré"}
    
    # ==================== PROFIL PUBLIC ====================
    
    @api_router.get("/creators/{user_id}/public")
    async def get_creator_public_profile(user_id: str):
        """Page publique SEO d'un créateur avec ses avis"""
        creator = await db.users.find_one(
            {"user_id": user_id, "user_type": "creator"},
            {"_id": 0, "password": 0, "email": 0}
        )
        if not creator:
            raise HTTPException(status_code=404, detail="Créateur non trouvé")
        
        # Récupérer tous les avis publiés
        reviews = await db.reviews.find(
            {"reviewee_id": user_id, "is_published": True},
            {"_id": 0, "reviewer_email_hash": 0, "reviewer_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        stats = calculate_weighted_score(reviews)
        badges = calculate_badges(reviews, creator)
        distribution = get_rating_distribution(reviews)
        
        return {
            "creator": {
                "user_id": creator.get("user_id"),
                "name": creator.get("name"),
                "picture": creator.get("picture"),
                "banner_url": creator.get("banner_url"),
                "city": creator.get("city"),
                "bio": creator.get("bio"),
                "content_types": creator.get("content_types", []),
                "is_premium": creator.get("is_premium", False),
                "portfolio_videos": creator.get("portfolio_videos", [])[:6]
            },
            "reviews": reviews[:10],  # 10 derniers avis
            "stats": stats,
            "badges": badges,
            "distribution": distribution
        }
    
    # Helper function pour mise à jour du rating
    async def update_user_rating(db, user_id: str, user_role: str):
        """Recalcule et met à jour le rating d'un utilisateur"""
        reviews = await db.reviews.find(
            {"reviewee_id": user_id, "is_published": True},
            {"_id": 0}
        ).to_list(1000)
        
        stats = calculate_weighted_score(reviews)
        
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "rating": stats["score"],
                "review_count": stats["count"],
                "verified_review_count": stats["verified_count"]
            }}
        )
    
    return api_router
