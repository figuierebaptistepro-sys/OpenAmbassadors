# share_links.py - Public share links + email notifications subscribers
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone
import secrets
import hashlib
import asyncio
import logging

router = APIRouter(tags=["share-links"])


# ==================== MODELS ====================

class ShareLinkSubscribe(BaseModel):
    email: EmailStr


# ==================== HELPERS ====================

def _gen_token() -> str:
    return secrets.token_urlsafe(24)


def _gen_unsub_token(share_token: str, email: str) -> str:
    """Deterministic unsubscribe token based on share_token + email"""
    raw = f"{share_token}:{email.lower().strip()}".encode()
    return hashlib.sha256(raw).hexdigest()[:32]


def _share_email_wrapper(content: str, frontend_url: str) -> str:
    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#f9f9f9;">
      <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#FF2E63 0%,#c2185b 100%);padding:28px 32px;text-align:center;">
          <span style="font-size:28px;font-weight:900;color:white;letter-spacing:-0.5px;">OpenAmbassadors</span>
        </div>
        <div style="padding:32px;">{content}</div>
        <div style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="color:#aaa;font-size:12px;margin:0;">© OpenAmbassadors · <a href="{frontend_url}" style="color:#FF2E63;text-decoration:none;">openambassadors.com</a></p>
        </div>
      </div>
    </div>"""


# ==================== SETUP FUNCTION ====================

def setup_share_routes(api_router, db, get_current_user, send_email, FRONTEND_URL, ADMIN_EMAILS):
    """Register all share-link routes onto the api_router."""

    def is_admin(user: dict) -> bool:
        return user.get("email") in ADMIN_EMAILS

    # ---------- ADMIN: create / get / revoke share link ----------

    @api_router.post("/admin/agency/campaigns/{campaign_id}/share-link")
    async def create_share_link(campaign_id: str, user: dict = Depends(get_current_user)):
        """Admin: create or rotate share link for a campaign."""
        if not is_admin(user):
            raise HTTPException(status_code=403, detail="Admin only")

        campaign = await db.agency_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campagne introuvable")

        # Revoke any existing token for this campaign (rotation)
        await db.share_links.delete_many({"campaign_id": campaign_id})

        token = _gen_token()
        doc = {
            "token": token,
            "campaign_id": campaign_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("user_id"),
            "revoked": False,
        }
        await db.share_links.insert_one(doc)
        return {
            "token": token,
            "url": f"{FRONTEND_URL}/share/{token}",
            "campaign_id": campaign_id,
            "created_at": doc["created_at"],
        }

    @api_router.get("/admin/agency/campaigns/{campaign_id}/share-link")
    async def get_share_link(campaign_id: str, user: dict = Depends(get_current_user)):
        """Admin: get current share link for a campaign (if any) + subscriber count."""
        if not is_admin(user):
            raise HTTPException(status_code=403, detail="Admin only")

        link = await db.share_links.find_one(
            {"campaign_id": campaign_id, "revoked": {"$ne": True}}, {"_id": 0}
        )
        if not link:
            return {"exists": False}

        sub_count = await db.share_subscribers.count_documents({"token": link["token"]})
        return {
            "exists": True,
            "token": link["token"],
            "url": f"{FRONTEND_URL}/share/{link['token']}",
            "campaign_id": campaign_id,
            "created_at": link.get("created_at"),
            "subscriber_count": sub_count,
        }

    @api_router.delete("/admin/agency/campaigns/{campaign_id}/share-link")
    async def revoke_share_link(campaign_id: str, user: dict = Depends(get_current_user)):
        """Admin: revoke share link (and remove subscribers)."""
        if not is_admin(user):
            raise HTTPException(status_code=403, detail="Admin only")

        links = await db.share_links.find({"campaign_id": campaign_id}).to_list(length=10)
        for l in links:
            await db.share_subscribers.delete_many({"token": l["token"]})
        await db.share_links.delete_many({"campaign_id": campaign_id})
        return {"message": "Lien révoqué"}

    @api_router.get("/admin/agency/campaigns/{campaign_id}/share-link/subscribers")
    async def list_share_subscribers(campaign_id: str, user: dict = Depends(get_current_user)):
        """Admin: list emails subscribed to notifications for this campaign's share link."""
        if not is_admin(user):
            raise HTTPException(status_code=403, detail="Admin only")
        link = await db.share_links.find_one(
            {"campaign_id": campaign_id, "revoked": {"$ne": True}}, {"_id": 0}
        )
        if not link:
            return {"subscribers": []}
        subs = await db.share_subscribers.find(
            {"token": link["token"]}, {"_id": 0, "email": 1, "subscribed_at": 1}
        ).to_list(length=500)
        return {"subscribers": subs}

    # ---------- PUBLIC: view shared campaign ----------

    @api_router.get("/share/{token}")
    async def get_shared_campaign(token: str):
        """Public: get sanitized campaign info by share token."""
        link = await db.share_links.find_one({"token": token, "revoked": {"$ne": True}}, {"_id": 0})
        if not link:
            raise HTTPException(status_code=404, detail="Lien invalide ou expiré")

        campaign = await db.agency_campaigns.find_one(
            {"campaign_id": link["campaign_id"]}, {"_id": 0}
        )
        if not campaign:
            raise HTTPException(status_code=404, detail="Campagne introuvable")

        # Sanitize: only expose what's safe for public
        delivered = campaign.get("delivered_videos", []) or []
        return {
            "title": campaign.get("title", "Partage"),
            "status": campaign.get("status", ""),
            "videos_total": campaign.get("videos_total"),
            "videos_delivered": campaign.get("videos_delivered", len(delivered)),
            "delivery_notes": campaign.get("delivery_notes"),
            "delivered_videos": [
                {
                    "video_id": v.get("video_id"),
                    "url": v.get("url"),
                    "thumbnail": v.get("thumbnail"),
                    "filename": v.get("filename"),
                    "size": v.get("size"),
                    "uploaded_at": v.get("uploaded_at"),
                }
                for v in delivered
            ],
            "video_delivery_link": campaign.get("video_delivery_link"),
        }

    # ---------- PUBLIC: subscribe / unsubscribe ----------

    @api_router.post("/share/{token}/subscribe")
    async def subscribe_to_share(token: str, data: ShareLinkSubscribe):
        """Public: subscribe an email to notifications for a shared campaign."""
        link = await db.share_links.find_one({"token": token, "revoked": {"$ne": True}}, {"_id": 0})
        if not link:
            raise HTTPException(status_code=404, detail="Lien invalide ou expiré")

        email = data.email.lower().strip()

        # Upsert (idempotent)
        await db.share_subscribers.update_one(
            {"token": token, "email": email},
            {"$set": {
                "token": token,
                "campaign_id": link["campaign_id"],
                "email": email,
                "subscribed_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # Confirmation email
        campaign = await db.agency_campaigns.find_one(
            {"campaign_id": link["campaign_id"]}, {"_id": 0}
        )
        title = campaign.get("title", "votre partage") if campaign else "votre partage"
        unsub_token = _gen_unsub_token(token, email)
        unsub_url = f"{FRONTEND_URL}/share/{token}/unsubscribe?email={email}&t={unsub_token}"
        share_url = f"{FRONTEND_URL}/share/{token}"

        content = f"""
          <h2 style="color:#FF2E63;margin:0 0 8px;">Notifications activées ✅</h2>
          <p style="color:#555;line-height:1.7;">Vous recevrez un email à chaque nouveau fichier ajouté sur <strong>"{title}"</strong>.</p>
          <div style="text-align:center;margin-top:24px;">
            <a href="{share_url}" style="background:linear-gradient(135deg,#FF2E63,#c2185b);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Voir le partage</a>
          </div>
          <p style="color:#999;font-size:12px;margin-top:32px;text-align:center;">
            <a href="{unsub_url}" style="color:#999;">Se désinscrire</a>
          </p>"""
        try:
            asyncio.create_task(send_email(
                to=email,
                subject=f"✅ Notifications activées — {title}",
                html=_share_email_wrapper(content, FRONTEND_URL),
            ))
        except Exception as e:
            logging.warning(f"Confirmation email scheduling failed: {e}")

        return {"message": "Inscription confirmée", "email": email}

    @api_router.get("/share/{token}/unsubscribe")
    async def unsubscribe_from_share(token: str, email: str, t: Optional[str] = None):
        """Public: unsubscribe an email. `t` is the verification token."""
        expected = _gen_unsub_token(token, email)
        if t != expected:
            raise HTTPException(status_code=400, detail="Lien de désinscription invalide")
        await db.share_subscribers.delete_one({"token": token, "email": email.lower().strip()})
        return {"message": "Désinscrit"}

    # ---------- INTERNAL: notify subscribers (called from upload endpoint) ----------

    async def notify_share_subscribers_video(campaign_id: str, video_filename: str, videos_count: int):
        """Notify all share-link subscribers that a new video was delivered."""
        link = await db.share_links.find_one(
            {"campaign_id": campaign_id, "revoked": {"$ne": True}}, {"_id": 0}
        )
        if not link:
            return

        token = link["token"]
        share_url = f"{FRONTEND_URL}/share/{token}"
        campaign = await db.agency_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
        title = campaign.get("title", "votre partage") if campaign else "votre partage"

        subs = await db.share_subscribers.find(
            {"token": token}, {"_id": 0, "email": 1}
        ).to_list(length=1000)

        for s in subs:
            email = s.get("email")
            if not email:
                continue
            unsub_token = _gen_unsub_token(token, email)
            unsub_url = f"{FRONTEND_URL}/share/{token}/unsubscribe?email={email}&t={unsub_token}"
            content = f"""
              <h2 style="color:#FF2E63;margin:0 0 8px;">Nouveau fichier disponible 🎉</h2>
              <p style="color:#555;line-height:1.7;">Un nouveau fichier vient d'être ajouté sur <strong>"{title}"</strong>.</p>
              <div style="background:#FFF1F5;border-left:4px solid #FF2E63;border-radius:8px;padding:16px 20px;margin:20px 0;">
                <p style="color:#FF2E63;font-weight:700;margin:0 0 4px;">📹 {video_filename}</p>
                <p style="color:#555;margin:0;font-size:14px;">{videos_count} fichier{"s" if videos_count > 1 else ""} disponible{"s" if videos_count > 1 else ""} au total</p>
              </div>
              <div style="text-align:center;margin-top:24px;">
                <a href="{share_url}" style="background:linear-gradient(135deg,#FF2E63,#c2185b);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Voir le partage</a>
              </div>
              <p style="color:#999;font-size:12px;margin-top:32px;text-align:center;">
                <a href="{unsub_url}" style="color:#999;">Se désinscrire</a>
              </p>"""
            try:
                asyncio.create_task(send_email(
                    to=email,
                    subject=f"🎉 Nouveau fichier — {title}",
                    html=_share_email_wrapper(content, FRONTEND_URL),
                ))
            except Exception as e:
                logging.warning(f"Notify subscriber {email} failed: {e}")

    # Expose internal helper on router for server.py access
    router.notify_share_subscribers_video = notify_share_subscribers_video
    return notify_share_subscribers_video
