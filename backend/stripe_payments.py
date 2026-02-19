"""
Stripe Payment Integration for OpenAmbassadors
Handles Premium subscriptions and Pool campaign payments
Using emergentintegrations library
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

# Import emergentintegrations Stripe module
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

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
        "description": "Abonnement Premium mensuel pour créateurs"
    },
    "creator_premium_yearly": {
        "name": "Premium Créateur Annuel",
        "amount": 199.99,
        "currency": "eur",
        "description": "Abonnement Premium annuel pour créateurs (2 mois offerts)"
    }
}

# Pool campaign packages (amounts as floats for Stripe)
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


def get_stripe_checkout(request: Request) -> StripeCheckout:
    """Initialize StripeCheckout with API key and webhook URL"""
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        logging.error("STRIPE_API_KEY not found in environment")
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


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
    stripe_checkout = get_stripe_checkout(request)
    
    origin_url = checkout_request.origin_url.rstrip("/")
    success_url = f"{origin_url}/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/billing?status=cancelled"
    
    try:
        checkout_req = CheckoutSessionRequest(
            amount=package["amount"],
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "user_email": user_email,
                "type": "premium_subscription",
                "package_id": package_id
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
        
        # Store transaction in database
        db = get_db()
        transaction = {
            "session_id": session.session_id,
            "user_id": user_id,
            "user_email": user_email,
            "type": "premium_subscription",
            "package_id": package_id,
            "amount": package["amount"],
            "currency": package["currency"],
            "status": "pending",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)
        
        logging.info(f"Premium checkout session created: {session.session_id} for user {user_id}")
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logging.error(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def check_payment_status(session_id: str, user_id: str, request: Request):
    """Check payment status and update user premium status"""
    stripe_checkout = get_stripe_checkout(request)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        db = get_db()
        
        # Find existing transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        if transaction:
            # Check if already processed to avoid double processing
            if transaction.get("payment_status") == "paid":
                return {
                    "status": "complete",
                    "payment_status": "paid",
                    "message": "Paiement déjà traité"
                }
            
            # Update transaction status
            update_data = {
                "status": status.status,
                "payment_status": status.payment_status,
                "updated_at": datetime.now(timezone.utc)
            }
            
            # If payment successful, upgrade user to premium
            if status.payment_status == "paid":
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "is_premium": True,
                        "premium_since": datetime.now(timezone.utc)
                    }}
                )
                logging.info(f"User {user_id} upgraded to premium")
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
        
    except Exception as e:
        logging.error(f"Payment status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        stripe_checkout = get_stripe_checkout(request)
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            db = get_db()
            session_id = webhook_response.session_id
            
            # Update transaction
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
                
                # Handle based on payment type
                metadata = webhook_response.metadata or {}
                payment_type = metadata.get("type")
                user_id = metadata.get("user_id")
                
                if payment_type == "premium_subscription" and user_id:
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {"is_premium": True, "premium_since": datetime.now(timezone.utc)}}
                    )
                elif payment_type == "pool_campaign" and user_id:
                    # Create pool after payment
                    pool_data_str = metadata.get("pool_data")
                    if pool_data_str:
                        import influence_pools
                        pool_data = json.loads(pool_data_str)
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
    """Create a Stripe checkout session for pool campaign payment"""
    pool_data = checkout_request.pool_data
    package_amount = pool_data.get("package")
    
    # Validate package exists
    if package_amount not in POOL_PACKAGES:
        raise HTTPException(status_code=400, detail="Package invalide")
    
    package = POOL_PACKAGES[package_amount]
    stripe_checkout = get_stripe_checkout(request)
    
    origin_url = checkout_request.origin_url.rstrip("/")
    success_url = f"{origin_url}/business/pools/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/business/pools/new?status=cancelled"
    
    try:
        checkout_req = CheckoutSessionRequest(
            amount=package["amount"],
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "user_email": user_email,
                "type": "pool_campaign",
                "package_amount": str(package_amount),
                "pool_data": json.dumps(pool_data)
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
        
        # Store transaction in database
        db = get_db()
        transaction = {
            "session_id": session.session_id,
            "user_id": user_id,
            "user_email": user_email,
            "type": "pool_campaign",
            "package_amount": package_amount,
            "amount": package["amount"],
            "currency": package["currency"],
            "status": "pending",
            "payment_status": "pending",
            "pool_data": pool_data,
            "created_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)
        
        logging.info(f"Pool checkout session created: {session.session_id} for user {user_id}")
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logging.error(f"Pool checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def check_pool_payment_and_create(session_id: str, user_id: str, request: Request):
    """Check pool payment status and create pool if paid"""
    import influence_pools
    
    stripe_checkout = get_stripe_checkout(request)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        db = get_db()
        
        # Find existing transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        # Check if already processed
        if transaction.get("payment_status") == "paid" and transaction.get("pool_id"):
            return {
                "status": "success",
                "payment_status": "paid",
                "pool_id": transaction.get("pool_id"),
                "message": "Pool déjà créé"
            }
        
        payment_status = status.payment_status
        
        # Update transaction status
        update_data = {
            "status": status.status,
            "payment_status": payment_status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        pool_id = None
        
        # If payment successful, create the pool
        if payment_status == "paid":
            pool_data = transaction.get("pool_data")
            if pool_data:
                user = await db.users.find_one({"user_id": user_id})
                if user:
                    pool_request = influence_pools.CreatePoolRequest(**pool_data)
                    pool = await influence_pools.create_pool(db, user, pool_request)
                    pool_id = pool.get("pool_id")
                    update_data["pool_id"] = pool_id
                    logging.info(f"Pool {pool_id} created after payment for user {user_id}")
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        return {
            "status": status.status,
            "payment_status": payment_status,
            "pool_id": pool_id,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Pool payment check error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
