"""
Stripe Payments Integration for OpenAmbassadors
Uses official Stripe SDK - No emergentintegrations dependency
"""
import os
import logging
import stripe
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Fixed pricing packages - NEVER accept amounts from frontend
PACKAGES = {
    # Creator plans
    "creator_premium": {
        "name": "Creator Premium",
        "amount": 19.99,
        "currency": "eur",
        "user_type": "creator",
        "features": ["Offres illimitées", "Liens illimités", "Statistiques avancées", "Badge Premium"]
    },
    # Business plans
    "business_pro": {
        "name": "Business Pro",
        "amount": 29.99,
        "currency": "eur",
        "user_type": "business",
        "features": ["Accès créateurs", "10 propositions/mois", "Support prioritaire"]
    },
    "business_enterprise": {
        "name": "Business Enterprise",
        "amount": 49.99,
        "currency": "eur",
        "user_type": "business",
        "features": ["Accès créateurs illimité", "Propositions illimitées", "Account manager dédié", "API access"]
    }
}

# Request/Response models
class CheckoutRequest(BaseModel):
    package_id: str = Field(..., description="Package ID to purchase")
    origin_url: str = Field(..., description="Frontend origin URL for redirects")

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    package_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None

class PackageInfo(BaseModel):
    id: str
    name: str
    amount: float
    currency: str
    user_type: str
    features: list

def create_payment_routes(db: AsyncIOMotorDatabase, get_current_user):
    """Create payment routes with database dependency"""
    
    stripe_api_key = os.environ.get("STRIPE_SECRET_KEY")
    stripe_webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    
    if stripe_api_key:
        stripe.api_key = stripe_api_key
        logging.info("Stripe API configured")
    else:
        logging.warning("STRIPE_SECRET_KEY not configured - payments disabled")
    
    @router.get("/packages")
    async def get_packages():
        """Get all available packages"""
        return [
            PackageInfo(id=pkg_id, **{k: v for k, v in pkg.items()})
            for pkg_id, pkg in PACKAGES.items()
        ]
    
    @router.get("/packages/{user_type}")
    async def get_packages_by_type(user_type: str):
        """Get packages for a specific user type"""
        packages = [
            PackageInfo(id=pkg_id, **{k: v for k, v in pkg.items()})
            for pkg_id, pkg in PACKAGES.items()
            if pkg["user_type"] == user_type
        ]
        return packages
    
    @router.post("/checkout", response_model=CheckoutResponse)
    async def create_checkout_session(
        request: Request,
        data: CheckoutRequest,
        user: dict = Depends(get_current_user)
    ):
        """Create a Stripe checkout session for a package"""
        if not stripe_api_key:
            raise HTTPException(status_code=503, detail="Paiements non configurés")
        
        # Validate package exists
        if data.package_id not in PACKAGES:
            raise HTTPException(status_code=400, detail="Forfait invalide")
        
        package = PACKAGES[data.package_id]
        
        # Validate user type matches package
        if package["user_type"] != user.get("user_type"):
            raise HTTPException(
                status_code=400, 
                detail=f"Ce forfait est réservé aux comptes {package['user_type']}"
            )
        
        # Check if user already has an active subscription
        existing_sub = await db.subscriptions.find_one({
            "user_id": user["user_id"],
            "status": "active"
        })
        if existing_sub:
            raise HTTPException(
                status_code=400,
                detail="Vous avez déjà un abonnement actif"
            )
        
        # Build URLs from frontend origin
        success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{data.origin_url}/payment/cancel"
        
        try:
            # Create Stripe Checkout Session
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": package["currency"],
                        "product_data": {
                            "name": package["name"],
                            "description": ", ".join(package["features"][:3]),
                        },
                        "unit_amount": int(package["amount"] * 100),  # Stripe uses cents
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=user.get("email"),
                metadata={
                    "user_id": user["user_id"],
                    "user_email": user.get("email", ""),
                    "package_id": data.package_id,
                    "package_name": package["name"]
                }
            )
            
            # Create payment transaction record BEFORE redirect
            await db.payment_transactions.insert_one({
                "session_id": checkout_session.id,
                "user_id": user["user_id"],
                "email": user.get("email"),
                "package_id": data.package_id,
                "package_name": package["name"],
                "amount": package["amount"],
                "currency": package["currency"],
                "status": "pending",
                "payment_status": "initiated",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            logging.info(f"Checkout session created: {checkout_session.id} for user {user['user_id']}")
            
            return CheckoutResponse(
                checkout_url=checkout_session.url,
                session_id=checkout_session.id
            )
            
        except stripe.error.StripeError as e:
            logging.error(f"Stripe error: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de la création du paiement")
        except Exception as e:
            logging.error(f"Checkout error: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de la création du paiement")
    
    @router.get("/status/{session_id}", response_model=PaymentStatusResponse)
    async def get_payment_status(
        request: Request,
        session_id: str,
        user: dict = Depends(get_current_user)
    ):
        """Get payment status and update database"""
        if not stripe_api_key:
            raise HTTPException(status_code=503, detail="Paiements non configurés")
        
        # Find transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        # Verify ownership
        if transaction["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # If already processed successfully, return cached status
        if transaction.get("payment_status") == "paid":
            return PaymentStatusResponse(
                status="complete",
                payment_status="paid",
                package_id=transaction.get("package_id"),
                amount=transaction.get("amount"),
                currency=transaction.get("currency")
            )
        
        try:
            # Retrieve session from Stripe
            checkout_session = stripe.checkout.Session.retrieve(session_id)
            
            payment_status = checkout_session.payment_status  # 'paid', 'unpaid', 'no_payment_required'
            status = checkout_session.status  # 'open', 'complete', 'expired'
            
            # Update transaction status
            update_data = {
                "status": status,
                "payment_status": payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
            
            # If payment successful, activate subscription (only once)
            if payment_status == "paid" and not transaction.get("subscription_activated"):
                await activate_subscription(db, transaction)
            
            return PaymentStatusResponse(
                status=status,
                payment_status=payment_status,
                package_id=transaction.get("package_id"),
                amount=transaction.get("amount"),
                currency=transaction.get("currency")
            )
            
        except stripe.error.StripeError as e:
            logging.error(f"Stripe error checking status: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de la vérification du paiement")
        except Exception as e:
            logging.error(f"Error checking payment status: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de la vérification du paiement")
    
    @router.post("/webhook")
    async def stripe_webhook(request: Request):
        """Handle Stripe webhooks"""
        if not stripe_api_key:
            raise HTTPException(status_code=503, detail="Paiements non configurés")
        
        payload = await request.body()
        sig_header = request.headers.get("Stripe-Signature")
        
        try:
            # Verify webhook signature if secret is configured
            if stripe_webhook_secret:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, stripe_webhook_secret
                )
            else:
                # Without webhook secret, parse the event directly (less secure)
                import json
                event = stripe.Event.construct_from(
                    json.loads(payload), stripe.api_key
                )
            
            # Handle the event
            if event["type"] == "checkout.session.completed":
                session = event["data"]["object"]
                session_id = session["id"]
                
                # Find and update transaction
                transaction = await db.payment_transactions.find_one({"session_id": session_id})
                if transaction and not transaction.get("subscription_activated"):
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {
                            "status": "complete",
                            "payment_status": "paid",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    await activate_subscription(db, transaction)
                    logging.info(f"Webhook: Subscription activated for session {session_id}")
            
            return {"status": "ok"}
            
        except stripe.error.SignatureVerificationError as e:
            logging.error(f"Webhook signature verification failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
        except Exception as e:
            logging.error(f"Webhook error: {e}")
            return {"status": "error", "message": str(e)}
    
    @router.get("/subscription")
    async def get_subscription(user: dict = Depends(get_current_user)):
        """Get current user's subscription status"""
        subscription = await db.subscriptions.find_one(
            {"user_id": user["user_id"], "status": "active"},
            {"_id": 0}
        )
        
        if subscription:
            return {
                "has_subscription": True,
                "plan": subscription.get("package_id"),
                "plan_name": subscription.get("package_name"),
                "started_at": subscription.get("started_at"),
                "expires_at": subscription.get("expires_at")
            }
        
        return {"has_subscription": False}
    
    async def activate_subscription(db: AsyncIOMotorDatabase, transaction: dict):
        """Activate subscription after successful payment"""
        user_id = transaction["user_id"]
        package_id = transaction["package_id"]
        package = PACKAGES.get(package_id, {})
        
        # Create subscription record
        subscription_data = {
            "user_id": user_id,
            "package_id": package_id,
            "package_name": transaction.get("package_name"),
            "amount": transaction.get("amount"),
            "currency": transaction.get("currency"),
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": None,  # Will be set for recurring subscriptions
            "payment_session_id": transaction["session_id"]
        }
        
        await db.subscriptions.insert_one(subscription_data)
        
        # Update user's premium status
        update_fields = {"is_premium": True, "subscription_plan": package_id}
        
        if package.get("user_type") == "business":
            update_fields["is_subscribed"] = True
        
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
        
        # Mark transaction as processed
        await db.payment_transactions.update_one(
            {"session_id": transaction["session_id"]},
            {"$set": {"subscription_activated": True}}
        )
        
        logging.info(f"Subscription activated for user {user_id}: {package_id}")
    
    return router
