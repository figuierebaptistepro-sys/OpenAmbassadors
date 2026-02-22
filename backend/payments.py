"""
Stripe Payments Integration for OpenAmbassadors (official Stripe SDK)
- Creates Checkout Sessions for subscriptions
- Webhook endpoint verifies Stripe signature (raw body)
"""
import os
import logging
from typing import Dict, Any, Optional

import stripe
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])


# Use Stripe Price IDs (recommended). Add to .env:
# STRIPE_PRICE_CREATOR_PREMIUM=price_...
# STRIPE_PRICE_BUSINESS_PRO=price_...
# STRIPE_PRICE_BUSINESS_ENTERPRISE=price_...

PACKAGES = {
    "creator_premium": {
        "name": "Creator Premium",
        "stripe_price_id": os.getenv("STRIPE_PRICE_CREATOR_PREMIUM"),
    },
    "business_pro": {
        "name": "Business Pro",
        "stripe_price_id": os.getenv("STRIPE_PRICE_BUSINESS_PRO"),
    },
    "business_enterprise": {
        "name": "Business Enterprise",
        "stripe_price_id": os.getenv("STRIPE_PRICE_BUSINESS_ENTERPRISE"),
    },
}


class CheckoutRequest(BaseModel):
    package_id: str


def _require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v


def create_payment_routes(db: AsyncIOMotorDatabase, get_current_user):
    """
    Keep your current server.py pattern:
      payment_router = create_payment_routes(db, get_current_user)
      app.include_router(payment_router)
    """
    stripe.api_key = _require_env("STRIPE_SECRET_KEY")

    # URLs
    frontend_url = os.getenv("FRONTEND_URL", "https://app.openambassadors.com")
    success_url = os.getenv("STRIPE_SUCCESS_URL", f"{frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}")
    cancel_url = os.getenv("STRIPE_CANCEL_URL", f"{frontend_url}/billing/cancel")

    webhook_secret = _require_env("STRIPE_WEBHOOK_SECRET")

    @router.post("/checkout")
    async def create_checkout_session(payload: CheckoutRequest, user=Depends(get_current_user)):  # type: ignore
        pkg = PACKAGES.get(payload.package_id)
        if not pkg:
            raise HTTPException(status_code=400, detail="Unknown package_id")

        price_id = pkg.get("stripe_price_id")
        if not price_id:
            raise HTTPException(
                status_code=500,
                detail=f"Missing Stripe Price ID for package {payload.package_id} (set STRIPE_PRICE_... in .env)",
            )

        try:
            # Create or reuse customer (optional simple strategy: create every time)
            customer_email: Optional[str] = None
            if isinstance(user, dict):
                customer_email = user.get("email")

            session = stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=customer_email,
                metadata={
                    "package_id": payload.package_id,
                    "user_id": str(user.get("_id") if isinstance(user, dict) else ""),
                },
            )
            return {"url": session.url, "id": session.id}
        except Exception as e:
            logger.exception("Stripe checkout session error")
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/webhook")
    async def stripe_webhook(request: Request):
        # Stripe requires raw body for signature verification
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")

        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")

        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=sig_header,
                secret=webhook_secret,
            )
        except Exception as e:
            logger.exception("Stripe webhook signature verification failed")
            raise HTTPException(status_code=400, detail=str(e))

        event_type = event.get("type")
        data = event.get("data", {}).get("object", {})

        # TODO: Update your DB according to event type
        # Examples: checkout.session.completed, invoice.paid, customer.subscription.updated, customer.subscription.deleted
        if event_type == "checkout.session.completed":
            # You can store subscription status for the user using metadata.user_id
            pass

        return {"received": True, "type": event_type}

    return router
