"""
Stripe Payment Integration for OpenAmbassadors
Handles Premium subscriptions for creators
Using standard Stripe library
"""
import os
import logging
import stripe
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

# Fixed pricing packages (server-side only for security)
PREMIUM_PACKAGES = {
    "creator_premium_monthly": {
        "name": "Premium Créateur",
        "amount": 1999,  # Stripe uses cents
        "currency": "eur",
        "description": "Abonnement Premium mensuel pour créateurs"
    },
    "creator_premium_yearly": {
        "name": "Premium Créateur Annuel",
        "amount": 19999,  # Stripe uses cents
        "currency": "eur",
        "description": "Abonnement Premium annuel pour créateurs (2 mois offerts)"
    }
}

# Pool campaign packages
POOL_PACKAGES = {
    5000: {
        "name": "Pool Campagne 5000€",
        "amount": 500000,  # 5000€ in cents
        "currency": "eur",
        "description": "Campagne Pool - Budget 5000€"
    },
    15000: {
        "name": "Pool Campagne 15000€",
        "amount": 1500000,  # 15000€ in cents
        "currency": "eur",
        "description": "Campagne Pool - Budget 15000€"
    },
    25000: {
        "name": "Pool Campagne 25000€",
        "amount": 2500000,  # 25000€ in cents
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
        logging.error("STRIPE_API_KEY not found in environment")
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    
    stripe.api_key = api_key
    
    # Build URLs from provided origin
    origin_url = checkout_request.origin_url.rstrip("/")
    success_url = f"{origin_url}/billing?session_id={{CHECKOUT_SESSION_ID}}&status=success"
    cancel_url = f"{origin_url}/billing?status=cancelled"
    
    try:
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": package["currency"],
                    "product_data": {
                        "name": package["name"],
                        "description": package["description"],
                    },
                    "unit_amount": package["amount"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user_email,
            metadata={
                "user_id": user_id,
                "user_email": user_email,
                "package_id": checkout_request.package_id,
                "package_name": package["name"]
            }
        )
        
        # Create payment transaction record in database
        db = get_db()
        transaction = {
            "session_id": session.id,
            "user_id": user_id,
            "user_email": user_email,
            "package_id": checkout_request.package_id,
            "package_name": package["name"],
            "amount": package["amount"] / 100,  # Store in euros
            "currency": package["currency"],
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "url": session.url,
            "session_id": session.id
        }
        
    except stripe.error.StripeError as e:
        logging.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Stripe: {str(e)}")
    except Exception as e:
        logging.error(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def check_payment_status(session_id: str, user_id: str):
    """Check and update payment status"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    
    stripe.api_key = api_key
    
    try:
        # Get session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
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
        
        # Map Stripe status
        payment_status = session.payment_status  # "paid", "unpaid", "no_payment_required"
        status = session.status  # "complete", "expired", "open"
        
        # Update transaction status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "status": status,
                    "payment_status": payment_status,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # If payment successful, upgrade user to premium
        if payment_status == "paid":
            result = await db.users.update_one(
                {"user_id": transaction.get("user_id")},
                {
                    "$set": {
                        "is_premium": True,
                        "premium_since": datetime.now(timezone.utc),
                        "premium_package": transaction.get("package_id")
                    }
                }
            )
            logging.info(f"User {transaction.get('user_id')} upgraded to premium: {result.modified_count}")
        
        return {
            "status": status,
            "payment_status": payment_status,
            "amount_total": session.amount_total,
            "currency": session.currency
        }
        
    except stripe.error.StripeError as e:
        logging.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Stripe: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    
    if not api_key:
        return {"status": "error", "message": "Configuration Stripe manquante"}
    
    stripe.api_key = api_key
    
    try:
        body = await request.body()
        sig_header = request.headers.get("Stripe-Signature", "")
        
        # Verify webhook signature if secret is configured
        if webhook_secret:
            try:
                event = stripe.Webhook.construct_event(body, sig_header, webhook_secret)
            except stripe.error.SignatureVerificationError:
                logging.error("Invalid webhook signature")
                return {"status": "error", "message": "Invalid signature"}
        else:
            # Parse event without verification (not recommended for production)
            import json
            event = json.loads(body)
        
        # Handle checkout.session.completed event
        if event.get("type") == "checkout.session.completed":
            session = event["data"]["object"]
            session_id = session.get("id")
            payment_status = session.get("payment_status")
            
            db = get_db()
            
            # Find and update transaction
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "payment_status": payment_status,
                            "status": "complete",
                            "webhook_event_id": event.get("id"),
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Upgrade user to premium
                if payment_status == "paid":
                    await db.users.update_one(
                        {"user_id": transaction.get("user_id")},
                        {
                            "$set": {
                                "is_premium": True,
                                "premium_since": datetime.now(timezone.utc),
                                "premium_package": transaction.get("package_id")
                            }
                        }
                    )
        
        return {"status": "received"}
        
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}
