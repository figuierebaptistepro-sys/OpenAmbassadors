# affiliate.py - Système d'Affiliation OpenAmbassadors
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import secrets

router = APIRouter(prefix="/api/affiliate", tags=["affiliate"])

# ==================== MODELS ====================

class AffiliateStats(BaseModel):
    """Statistiques d'affiliation d'un utilisateur"""
    total_clicks: int = 0
    total_signups: int = 0
    conversion_rate: float = 0.0
    active_subscribers: int = 0
    mrr_generated: float = 0.0
    pending_earnings: float = 0.0
    validated_earnings: float = 0.0
    total_earnings: float = 0.0
    monthly_estimate: float = 0.0

class ReferredUser(BaseModel):
    """Utilisateur parrainé"""
    user_id: str
    name: Optional[str]
    email: str
    user_type: Optional[str]  # creator / business
    status: str  # free / trial / paying / cancelled
    plan: Optional[str]
    created_at: datetime
    mrr_generated: float = 0.0

class AffiliateLink(BaseModel):
    """Lien d'affiliation"""
    code: str
    full_url: str
    created_at: datetime

# ==================== HELPER FUNCTIONS ====================

def generate_affiliate_code(user_id: str) -> str:
    """Génère un code d'affiliation unique basé sur le user_id"""
    # Utilise les 8 premiers caractères du user_id + 4 caractères aléatoires
    base = user_id.replace("user_", "")[:8]
    suffix = secrets.token_hex(2)
    return f"{base}{suffix}".upper()

def calculate_conversion_rate(clicks: int, signups: int) -> float:
    """Calcule le taux de conversion"""
    if clicks == 0:
        return 0.0
    return round((signups / clicks) * 100, 2)

def get_subscription_status(user: dict) -> str:
    """Détermine le statut d'abonnement d'un utilisateur"""
    # Pour l'instant basé sur is_subscribed et is_premium
    # Sera mis à jour avec Stripe
    if user.get("subscription_status") == "cancelled":
        return "cancelled"
    if user.get("is_subscribed") or user.get("is_premium"):
        return "paying"
    if user.get("trial_ends_at"):
        trial_end = user.get("trial_ends_at")
        if isinstance(trial_end, str):
            trial_end = datetime.fromisoformat(trial_end)
        if trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < trial_end:
            return "trial"
    return "free"

def get_plan_name(user: dict) -> str:
    """Retourne le nom du plan de l'utilisateur"""
    status = get_subscription_status(user)
    if status == "paying":
        if user.get("user_type") == "business":
            return user.get("subscription_plan", "Business Pro")
        return user.get("subscription_plan", "Créateur Premium")
    if status == "trial":
        return "Essai gratuit"
    if status == "cancelled":
        return "Résilié"
    return "Gratuit"

# ==================== ROUTES SETUP ====================

def setup_affiliate_routes(api_router, db, get_current_user, FRONTEND_URL):
    """Configure toutes les routes du système d'affiliation"""
    
    # ==================== LIEN D'AFFILIATION ====================
    
    @api_router.get("/affiliate/link")
    async def get_affiliate_link(user: dict = Depends(get_current_user)):
        """Récupère ou génère le lien d'affiliation de l'utilisateur"""
        user_id = user["user_id"]
        
        # Chercher si un code existe déjà
        affiliate_data = await db.affiliate_codes.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not affiliate_data:
            # Créer un nouveau code
            code = generate_affiliate_code(user_id)
            affiliate_data = {
                "user_id": user_id,
                "code": code,
                "created_at": datetime.now(timezone.utc)
            }
            await db.affiliate_codes.insert_one(affiliate_data)
        
        full_url = f"{FRONTEND_URL}/login?ref={affiliate_data['code']}"
        
        return {
            "code": affiliate_data["code"],
            "full_url": full_url,
            "created_at": affiliate_data["created_at"].isoformat() if isinstance(affiliate_data["created_at"], datetime) else affiliate_data["created_at"]
        }
    
    # ==================== TRACKING CLICS ====================
    
    @api_router.post("/affiliate/track-click")
    async def track_affiliate_click(request: Request):
        """Enregistre un clic sur un lien d'affiliation (public, pas d'auth)"""
        body = await request.json()
        ref_code = body.get("ref")
        
        if not ref_code:
            return {"tracked": False}
        
        # Trouver le propriétaire du code
        affiliate = await db.affiliate_codes.find_one(
            {"code": ref_code.upper()},
            {"_id": 0}
        )
        
        if not affiliate:
            return {"tracked": False}
        
        # Enregistrer le clic
        click_data = {
            "click_id": f"click_{uuid.uuid4().hex[:12]}",
            "referrer_id": affiliate["user_id"],
            "ref_code": ref_code.upper(),
            "ip_hash": hash(request.client.host) if request.client else None,
            "user_agent": request.headers.get("user-agent", "")[:200],
            "created_at": datetime.now(timezone.utc)
        }
        await db.affiliate_clicks.insert_one(click_data)
        
        # Mettre à jour le compteur de clics
        await db.affiliate_stats.update_one(
            {"user_id": affiliate["user_id"]},
            {
                "$inc": {"total_clicks": 1},
                "$setOnInsert": {
                    "total_signups": 0,
                    "active_subscribers": 0,
                    "mrr_generated": 0,
                    "pending_earnings": 0,
                    "validated_earnings": 0,
                    "created_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        return {"tracked": True}
    
    # ==================== ENREGISTREMENT PARRAINAGE ====================
    
    @api_router.post("/affiliate/register-referral")
    async def register_referral(request: Request):
        """
        Enregistre un parrainage lors de l'inscription (appelé après création du compte).
        Endpoint interne, appelé par le flow d'inscription.
        """
        body = await request.json()
        ref_code = body.get("ref_code")
        referred_user_id = body.get("user_id")
        
        if not ref_code or not referred_user_id:
            return {"registered": False}
        
        # Trouver le parrain
        affiliate = await db.affiliate_codes.find_one(
            {"code": ref_code.upper()},
            {"_id": 0}
        )
        
        if not affiliate:
            return {"registered": False, "error": "Code invalide"}
        
        referrer_id = affiliate["user_id"]
        
        # Vérifier que l'utilisateur ne se parraine pas lui-même
        if referrer_id == referred_user_id:
            return {"registered": False, "error": "Auto-parrainage impossible"}
        
        # Vérifier si ce parrainage existe déjà
        existing = await db.affiliate_referrals.find_one({
            "referred_user_id": referred_user_id
        })
        if existing:
            return {"registered": False, "error": "Utilisateur déjà parrainé"}
        
        # Récupérer les infos du filleul
        referred_user = await db.users.find_one(
            {"user_id": referred_user_id},
            {"_id": 0}
        )
        
        if not referred_user:
            return {"registered": False, "error": "Utilisateur non trouvé"}
        
        # Créer le parrainage
        referral_data = {
            "referral_id": f"ref_{uuid.uuid4().hex[:12]}",
            "referrer_id": referrer_id,
            "referred_user_id": referred_user_id,
            "referred_email": referred_user.get("email"),
            "referred_name": referred_user.get("name"),
            "referred_user_type": referred_user.get("user_type"),
            "status": "free",  # free / trial / paying / cancelled
            "plan": None,
            "mrr_generated": 0,
            "commission_rate": 0.20,  # 20% par défaut
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.affiliate_referrals.insert_one(referral_data)
        
        # Mettre à jour les stats du parrain
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
        
        # Enregistrer le referrer_id dans le user
        await db.users.update_one(
            {"user_id": referred_user_id},
            {"$set": {"referrer_id": referrer_id}}
        )
        
        return {"registered": True, "referrer_id": referrer_id}
    
    # ==================== DASHBOARD STATS ====================
    
    @api_router.get("/affiliate/dashboard")
    async def get_affiliate_dashboard(user: dict = Depends(get_current_user)):
        """Récupère toutes les données du dashboard affiliation"""
        user_id = user["user_id"]
        
        # Récupérer ou créer les stats
        stats = await db.affiliate_stats.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not stats:
            stats = {
                "total_clicks": 0,
                "total_signups": 0,
                "active_subscribers": 0,
                "mrr_generated": 0,
                "pending_earnings": 0,
                "validated_earnings": 0
            }
        
        # Récupérer tous les filleuls
        referrals = await db.affiliate_referrals.find(
            {"referrer_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Enrichir avec les données utilisateurs actualisées
        referred_users = []
        active_count = 0
        total_mrr = 0
        
        creators_invited = []
        businesses_invited = []
        
        for ref in referrals:
            # Récupérer les données actuelles de l'utilisateur
            referred_user = await db.users.find_one(
                {"user_id": ref["referred_user_id"]},
                {"_id": 0, "password": 0}
            )
            
            if referred_user:
                current_status = get_subscription_status(referred_user)
                current_plan = get_plan_name(referred_user)
                user_type = referred_user.get("user_type") or ref.get("referred_user_type")
                
                # Calculer le MRR si abonné
                user_mrr = 0
                if current_status == "paying":
                    active_count += 1
                    # Prix mockés pour l'instant - sera mis à jour avec Stripe
                    if user_type == "business":
                        user_mrr = 99  # Prix mensuel business
                    else:
                        user_mrr = 29  # Prix mensuel créateur premium
                    total_mrr += user_mrr
                
                user_data = {
                    "user_id": ref["referred_user_id"],
                    "name": referred_user.get("name") or ref.get("referred_name"),
                    "email": referred_user.get("email") or ref.get("referred_email"),
                    "picture": referred_user.get("picture"),
                    "user_type": user_type,
                    "status": current_status,
                    "plan": current_plan,
                    "created_at": ref["created_at"].isoformat() if isinstance(ref["created_at"], datetime) else ref["created_at"],
                    "mrr_generated": user_mrr
                }
                
                referred_users.append(user_data)
                
                # Séparer par type
                if user_type == "business":
                    businesses_invited.append(user_data)
                elif user_type == "creator":
                    creators_invited.append(user_data)
                else:
                    # Type non défini encore - ajouter aux deux listes avec marqueur
                    user_data_copy = {**user_data, "type_pending": True}
                    creators_invited.append(user_data_copy)
        
        # Calculer les revenus
        commission_rate = 0.20  # 20%
        pending_earnings = total_mrr * commission_rate  # Commissions du mois en cours
        validated_earnings = stats.get("validated_earnings", 0)
        total_earnings = validated_earnings + stats.get("paid_earnings", 0)
        
        # Taux de conversion
        total_clicks = stats.get("total_clicks", 0)
        total_signups = len(referrals)
        conversion_rate = calculate_conversion_rate(total_clicks, total_signups)
        
        return {
            # Bloc 1: Performance
            "performance": {
                "total_clicks": total_clicks,
                "total_signups": total_signups,
                "conversion_rate": conversion_rate,
                "active_subscribers": active_count,
                "mrr_generated": total_mrr
            },
            # Bloc 2: Revenus
            "revenue": {
                "pending_earnings": round(pending_earnings, 2),
                "validated_earnings": round(validated_earnings, 2),
                "total_earnings": round(total_earnings, 2),
                "monthly_estimate": round(pending_earnings, 2),
                "commission_rate": commission_rate * 100  # En pourcentage
            },
            # Bloc 3: Utilisateurs invités
            "referred_users": referred_users,
            "creators_invited": creators_invited,
            "businesses_invited": businesses_invited,
            # Totaux par type
            "summary": {
                "total_creators": len(creators_invited),
                "total_businesses": len(businesses_invited),
                "total_users": len(referred_users)
            }
        }
    
    # ==================== MISE À JOUR STATUT (pour webhook Stripe futur) ====================
    
    @api_router.post("/affiliate/update-status")
    async def update_referral_status(request: Request):
        """
        Met à jour le statut d'un filleul (appelé par webhook Stripe).
        Endpoint interne / webhook.
        """
        body = await request.json()
        user_id = body.get("user_id")
        new_status = body.get("status")  # free / trial / paying / cancelled
        plan = body.get("plan")
        mrr = body.get("mrr", 0)
        
        if not user_id or not new_status:
            raise HTTPException(status_code=400, detail="user_id et status requis")
        
        # Trouver le parrainage
        referral = await db.affiliate_referrals.find_one(
            {"referred_user_id": user_id},
            {"_id": 0}
        )
        
        if not referral:
            return {"updated": False, "error": "Pas de parrainage trouvé"}
        
        old_status = referral.get("status")
        
        # Mettre à jour le parrainage
        update_data = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc)
        }
        if plan:
            update_data["plan"] = plan
        if mrr:
            update_data["mrr_generated"] = mrr
        
        await db.affiliate_referrals.update_one(
            {"referred_user_id": user_id},
            {"$set": update_data}
        )
        
        # Mettre à jour les stats du parrain
        referrer_id = referral["referrer_id"]
        
        # Si passage en paying
        if new_status == "paying" and old_status != "paying":
            commission = mrr * referral.get("commission_rate", 0.20)
            await db.affiliate_stats.update_one(
                {"user_id": referrer_id},
                {
                    "$inc": {
                        "active_subscribers": 1,
                        "mrr_generated": mrr,
                        "pending_earnings": commission
                    }
                }
            )
            
            # Créer une entrée de commission
            commission_entry = {
                "commission_id": f"comm_{uuid.uuid4().hex[:12]}",
                "referrer_id": referrer_id,
                "referred_user_id": user_id,
                "amount": commission,
                "mrr_source": mrr,
                "status": "pending",  # pending / validated / paid
                "created_at": datetime.now(timezone.utc)
            }
            await db.affiliate_commissions.insert_one(commission_entry)
        
        # Si résiliation
        elif new_status == "cancelled" and old_status == "paying":
            await db.affiliate_stats.update_one(
                {"user_id": referrer_id},
                {
                    "$inc": {
                        "active_subscribers": -1,
                        "mrr_generated": -mrr
                    }
                }
            )
        
        return {"updated": True, "old_status": old_status, "new_status": new_status}
    
    # ==================== HISTORIQUE COMMISSIONS ====================
    
    @api_router.get("/affiliate/commissions")
    async def get_commissions(user: dict = Depends(get_current_user)):
        """Récupère l'historique des commissions"""
        user_id = user["user_id"]
        
        commissions = await db.affiliate_commissions.find(
            {"referrer_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Enrichir avec les noms des filleuls
        enriched = []
        for comm in commissions:
            referred = await db.users.find_one(
                {"user_id": comm["referred_user_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            enriched.append({
                **comm,
                "referred_name": referred.get("name") if referred else "Utilisateur",
                "referred_email": referred.get("email") if referred else "",
                "created_at": comm["created_at"].isoformat() if isinstance(comm["created_at"], datetime) else comm["created_at"]
            })
        
        return enriched
    
    return api_router
