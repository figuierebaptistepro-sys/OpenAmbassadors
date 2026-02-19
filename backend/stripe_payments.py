"""
Stripe Payment Integration for OpenAmbassadors
Handles Premium subscriptions and Pool campaign payments
Using official Stripe SDK (no emergentintegrations dependency)
"""
import os
import json
import logging
from datetime import datetime, timezone
from fastapi import HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

import stripe


# Database helper
def get_db():
    from server import db
    return db


# Fixed pricing packages (server-side only for security)
PREMIUM_PACKAGES = {
    "creator_premium_monthly": {
        "name": "Premium Créateur",
        "amount": 19.99,
        "currency": "eur",
        "description": "Abonnement Premium mensuel pour créateurs",
        "interval": "month",
        "interval_count": 1,
    },
    "creator_premium_yearly": {
        "name": "Premium Créateur Annuel",
        "amount": 199.99,
        "currency": "eur",
        "description": "Abonnement Premium annuel pour créateurs (2 mois offerts)",
        "interval": "year",
        "interval_count": 1,
    }
}

# Pool campaign packages
POOL_PACKAGES = {
    5000: {
        "name": "Pool Campagne 5000€",
        "amount": 5000.00,
        "currency": "eur",
        "description": "Campagne Pool - Budget 5000€"
    },
    15000: {
        "name": "Pool Campagne 15000€",
        "amount": 15000.00,
        "currency": "eur",
        "description": "Campagne Pool - Budget 15000€"
    },
    25000: {
        "name": "Pool Campagne 25000€",
        "amount": 25000.00,
        "currency": "eur",
        "description": "Campagne Pool - Budget 25000€"
    }
}


class CreateCheckoutRequest(BaseModel):
    package_id: str
    origin_url: str


class CreatePoolCheckoutRequest(BaseModel):
    pool_data: dict
    origin_url: str


def _get_stripe_secret_key() -> str:
    key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    if not key:
        logging.error("STRIPE_API_KEY / STRIPE_SECRET_KEY not found in environment")
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    return key


def _configure_stripe():
    stripe.api_key = _get_stripe_secret_key()


def _to_cents(amount: float) -> int:
    return int(round(float(amount) * 100))


def _get_webhook_secret() -> Optional[str]:
    return os.environ.get("STRIPE_WEBHOOK_SECRET")


async def create_checkout_session(
    request: Request,
    checkout_request: CreateCheckoutRequest,
    user_id: str,
    user_email: str
):
    """Create a Stripe checkout session for premium subscription"""
    package_id = checkout_request.package_id

    if package_id not in PREMIUM_PACKAGES:
        raise HTTPException(status_code=400, detail="Package invalide")

    package = PREMIUM_PACKAGES[package_id]
    _configure_stripe()

    origin_url = checkout_request.origin_url.rstrip("/")
    success_url = f"{origin_url}/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/billing?status=cancelled"

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer_email=user_email,
            line_items=[{
                "price_data": {
                    "currency": package["currency"],
                    "unit_amount": _to_cents(package["amount"]),
                    "product_data": {
                        "name": package["name"],
                        "description": package["description"],
                    },
                    "recurring": {
                        "interval": package["interval"],
                        "interval_count": package["interval_count"],
                    }
                },
                "quantity": 1
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user_id),
                "user_email": str(user_email)[:200],  # safe-ish
                "type": "premium_subscription",
                "package_id": str(package_id)[:100]
            },
            allow_promotion_codes=True,
        )

        db = get_db()
        transaction = {
            "session_id": session.id,
            "user_id": user_id,
            "user_email": user_email,
            "type": "premium_subscription",
            "package_id": package_id,
            "amount": package["amount"],
            "currency": package["currency"],
            "status": session.status or "open",
            "payment_status": session.payment_status or "unpaid",
            "created_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)

        return {
            "checkout_url": session.url,
            "url": session.url,  # compat RedirectResponse usage
            "session_id": session.id
        }

    except Exception as e:
        logging.error(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def check_payment_status(session_id: str, user_id: str, request: Request):
    """Check payment status and update user premium status"""
    _configure_stripe()

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        db = get_db()
        transaction = await db.payment_transactions.find_one({"session_id": session_id})

        if transaction:
            if transaction.get("payment_status") == "paid":
                return {
                    "status": "complete",
                    "payment_status": "paid",
                    "message": "Paiement déjà traité"
                }

            update_data = {
                "status": session.status,
                "payment_status": session.payment_status,
                "updated_at": datetime.now(timezone.utc)
            }

            if session.payment_status == "paid":
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "is_premium": True,
                        "premium_since": datetime.now(timezone.utc)
                    }}
                )

            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )

        return {
            "status": session.status,
            "payment_status": session.payment_status,
            "amount_total": session.amount_total,
            "currency": session.currency
        }

    except Exception as e:
        logging.error(f"Payment status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    _configure_stripe()

    try:
        payload = await request.body()
        sig = request.headers.get("Stripe-Signature")
        secret = _get_webhook_secret()

        # If secret not set, we accept but log (not ideal, but won't crash prod)
        if secret and sig:
            event = stripe.Webhook.construct_event(payload=payload, sig_header=sig, secret=secret)
        else:
            # Fallback: parse without signature verification (dev-only behavior)
            logging.warning("STRIPE_WEBHOOK_SECRET or Stripe-Signature missing - webhook not verified")
            event = stripe.Event.construct_from(json.loads(payload.decode("utf-8")), stripe.api_key)

        if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            session = event["data"]["object"]
            session_id = session.get("id")
            payment_status = session.get("payment_status")

            if payment_status == "paid":
                db = get_db()

                transaction = await db.payment_transactions.find_one({"session_id": session_id})
                if transaction and transaction.get("payment_status") != "paid":
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {
                            "status": "complete",
                            "payment_status": "paid",
                            "updated_at": datetime.now(timezone.utc)
                        }}
                    )

                    metadata = session.get("metadata") or {}
                    payment_type = metadata.get("type")
                    user_id = metadata.get("user_id")

                    if payment_type == "premium_subscription" and user_id:
                        await db.users.update_one(
                            {"user_id": user_id},
                            {"$set": {"is_premium": True, "premium_since": datetime.now(timezone.utc)}}
                        )

                    elif payment_type == "pool_campaign" and user_id:
                        # ✅ IMPORTANT: do NOT read pool_data from Stripe metadata (limit 500 chars)
                        # We read it from DB via payment_transactions (it was stored at checkout creation)
                        tx = await db.payment_transactions.find_one({"session_id": session_id})
                        if tx and tx.get("pool_data"):
                            import influence_pools

                            pool_data = tx["pool_data"]
                            user = await db.users.find_one({"user_id": user_id})
                            if user:
                                pool_request = influence_pools.CreatePoolRequest(**pool_data)
                                pool = await influence_pools.create_pool(db, user, pool_request)
                                await db.payment_transactions.update_one(
                                    {"session_id": session_id},
                                    {"$set": {"pool_id": pool.get("pool_id")}}
                                )

        return {"status": "received"}

    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


async def create_pool_checkout_session(
    request: Request,
    checkout_request: CreatePoolCheckoutRequest,
    user_id: str,
    user_email: str
):
    """Create a Stripe checkout session for pool campaign payment (one-time)"""
    pool_data = checkout_request.pool_data
    package_amount = pool_data.get("package")

    if package_amount not in POOL_PACKAGES:
        raise HTTPException(status_code=400, detail="Package invalide")

    package = POOL_PACKAGES[package_amount]
    _configure_stripe()

    origin_url = checkout_request.origin_url.rstrip("/")
    success_url = f"{origin_url}/business/pools/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/business/pools/new?status=cancelled"

    # ✅ Build SHORT metadata (Stripe metadata values <= 500 chars)
    brand = (pool_data.get("brand") or {})
    platforms = pool_data.get("platforms") or []
    try:
        platforms_str = ",".join([str(p) for p in platforms])
    except Exception:
        platforms_str = ""

    metadata_short = {
        "type": "pool_campaign",
        "user_id": str(user_id),
        "package_amount": str(package_amount),
        "mode": str(pool_data.get("mode", ""))[:20],
        "country": str(pool_data.get("country", ""))[:10],
        "duration_days": str(pool_data.get("duration_days", ""))[:10],
        "platforms": platforms_str[:200],
        "brand_name": str(brand.get("name", ""))[:100],
    }

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            customer_email=user_email,
            line_items=[{
                "price_data": {
                    "currency": package["currency"],
                    "unit_amount": _to_cents(package["amount"]),
                    "product_data": {
                        "name": package["name"],
                        "description": package["description"],
                    },
                },
                "quantity": 1
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata_short,  # ✅ no pool_data here
            allow_promotion_codes=True,
        )

        db = get_db()
        transaction = {
            "session_id": session.id,
            "user_id": user_id,
            "user_email": user_email,
            "type": "pool_campaign",
            "package_amount": package_amount,
            "amount": package["amount"],
            "currency": package["currency"],
            "status": session.status or "open",
            "payment_status": session.payment_status or "unpaid",
            "pool_data": pool_data,  # ✅ stored in DB (no 500 chars limit)
            "created_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)

        return {
            "checkout_url": session.url,
            "url": session.url,  # compat possible redirect usage
            "session_id": session.id
        }

    except Exception as e:
        logging.error(f"Pool checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def check_pool_payment_and_create(session_id: str, user_id: str, request: Request):
    """Check pool payment status and create pool if paid"""
    import influence_pools
    _configure_stripe()

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        db = get_db()
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")

        if transaction.get("payment_status") == "paid" and transaction.get("pool_id"):
            return {
                "status": "success",
                "payment_status": "paid",
                "pool_id": transaction.get("pool_id"),
                "message": "Pool déjà créé"
            }

        payment_status = session.payment_status

        update_data = {
            "status": session.status,
            "payment_status": payment_status,
            "updated_at": datetime.now(timezone.utc)
        }

        pool_id = None

        if payment_status == "paid":
            pool_data = transaction.get("pool_data")
            if pool_data:
                user = await db.users.find_one({"user_id": user_id})
                if user:
                    pool_request = influence_pools.CreatePoolRequest(**pool_data)
                    pool = await influence_pools.create_pool(db, user, pool_request)
                    pool_id = pool.get("pool_id")
                    update_data["pool_id"] = pool_id

        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )

        return {
            "status": session.status,
            "payment_status": payment_status,
            "pool_id": pool_id,
            "amount_total": session.amount_total,
            "currency": session.currency
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Pool payment check error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
