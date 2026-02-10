"""
Stripe Payment Integration for OpenAmbassadors
Handles Premium subscriptions for creators
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

router = APIRouter()

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

class CreateCheckoutRequest(BaseModel):
    package_id: str
    origin_url: str

class CheckoutStatusRequest(BaseModel):
    session_id: str


def get_db():
    """Get database connection"""
    from server import db
    return db


async def create_checkout_session(
    request: Request,
    checkout_request: CreateCheckoutRequest,
    user_id: str,
    user_email: str
):
    """Create a Stripe checkout session for premium subscription"""
    
    # Validate package exists
    if checkout_request.package_id not in PREMIUM_PACKAGES:
        raise HTTPException(status_code=400, detail="Package invalide")
    
    package = PREMIUM_PACKAGES[checkout_request.package_id]
    
    # Get Stripe API key
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    
    # Build URLs from provided origin
    origin_url = checkout_request.origin_url.rstrip("/")
    success_url = f"{origin_url}/billing?session_id={{CHECKOUT_SESSION_ID}}&status=success"
    cancel_url = f"{origin_url}/billing?status=cancelled"
    
    # Initialize Stripe checkout
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Create checkout session request
    checkout_req = CheckoutSessionRequest(
        amount=float(package["amount"]),
        currency=package["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "user_email": user_email,
            "package_id": checkout_request.package_id,
            "package_name": package["name"]
        }
    )
    
    try:
        # Create checkout session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
        
        # Create payment transaction record in database
        db = get_db()
        transaction = {
            "session_id": session.session_id,
            "user_id": user_id,
            "user_email": user_email,
            "package_id": checkout_request.package_id,
            "package_name": package["name"],
            "amount": package["amount"],
            "currency": package["currency"],
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la session: {str(e)}")


async def check_payment_status(session_id: str, user_id: str):
    """Check and update payment status"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        # Get checkout status from Stripe
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        db = get_db()
        
        # Find existing transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        # Check if already processed to prevent double processing
        if transaction.get("payment_status") == "paid":
            return {
                "status": "success",
                "payment_status": "paid",
                "message": "Paiement déjà traité"
            }
        
        # Update transaction status
        new_status = "completed" if status.payment_status == "paid" else status.status
        new_payment_status = status.payment_status
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "status": new_status,
                    "payment_status": new_payment_status,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # If payment successful, upgrade user to premium
        if status.payment_status == "paid":
            await db.users.update_one(
                {"_id": transaction.get("user_id")},
                {
                    "$set": {
                        "is_premium": True,
                        "premium_since": datetime.now(timezone.utc),
                        "premium_package": transaction.get("package_id")
                    }
                }
            )
            
            # Also try updating by user_id string (in case ObjectId conversion needed)
            from bson import ObjectId
            try:
                await db.users.update_one(
                    {"_id": ObjectId(transaction.get("user_id"))},
                    {
                        "$set": {
                            "is_premium": True,
                            "premium_since": datetime.now(timezone.utc),
                            "premium_package": transaction.get("package_id")
                        }
                    }
                )
            except:
                pass
        
        return {
            "status": new_status,
            "payment_status": new_payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification: {str(e)}")


async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        db = get_db()
        
        # Update transaction based on webhook event
        if webhook_response.session_id:
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            
            if transaction and transaction.get("payment_status") != "paid":
                new_payment_status = webhook_response.payment_status
                
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {
                        "$set": {
                            "payment_status": new_payment_status,
                            "webhook_event_id": webhook_response.event_id,
                            "webhook_event_type": webhook_response.event_type,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # If payment successful, upgrade user to premium
                if new_payment_status == "paid":
                    from bson import ObjectId
                    try:
                        await db.users.update_one(
                            {"_id": ObjectId(transaction.get("user_id"))},
                            {
                                "$set": {
                                    "is_premium": True,
                                    "premium_since": datetime.now(timezone.utc),
                                    "premium_package": transaction.get("package_id")
                                }
                            }
                        )
                    except:
                        pass
        
        return {"status": "received"}
        
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}
