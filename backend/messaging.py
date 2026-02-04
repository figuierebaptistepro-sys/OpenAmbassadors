# Messaging Module for OpenAmbassadors
# Handles conversations, messages, WebSocket, and admin moderation

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import json
import asyncio

# ==================== MODELS ====================

class ConversationCreate(BaseModel):
    creator_id: str
    mission_id: Optional[str] = None  # If provided, mission chat; else direct chat

class MessageCreate(BaseModel):
    content_type: str = "text"  # text, file, mixed
    text: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_mime: Optional[str] = None
    file_size: Optional[int] = None

class ReportCreate(BaseModel):
    conversation_id: str
    message_id: Optional[str] = None
    reason: str  # spam, harassment, scam, hate, other
    note: Optional[str] = None

# ==================== WEBSOCKET MANAGER ====================

class ConnectionManager:
    def __init__(self):
        # {user_id: [websocket, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # {conversation_id: [user_id, ...]}
        self.conversation_subscribers: Dict[str, set] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    def subscribe_to_conversation(self, user_id: str, conversation_id: str):
        if conversation_id not in self.conversation_subscribers:
            self.conversation_subscribers[conversation_id] = set()
        self.conversation_subscribers[conversation_id].add(user_id)
    
    def unsubscribe_from_conversation(self, user_id: str, conversation_id: str):
        if conversation_id in self.conversation_subscribers:
            self.conversation_subscribers[conversation_id].discard(user_id)
    
    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def broadcast_to_conversation(self, conversation_id: str, message: dict, exclude_user: str = None):
        if conversation_id in self.conversation_subscribers:
            for user_id in self.conversation_subscribers[conversation_id]:
                if user_id != exclude_user:
                    await self.send_to_user(user_id, message)

manager = ConnectionManager()

# ==================== MESSAGING ROUTES ====================

def create_messaging_router(db: AsyncIOMotorDatabase, get_current_user, upload_to_r2_func=None):
    router = APIRouter(prefix="/messaging", tags=["Messaging"])
    
    # ========== CONVERSATIONS ==========
    
    @router.get("/conversations")
    async def get_conversations(user: dict = Depends(get_current_user)):
        """Get all conversations for current user"""
        user_id = user["user_id"]
        user_type = user.get("user_type")
        
        # Build query based on user type
        if user_type == "creator":
            query = {"creator_id": user_id}
        elif user_type == "business":
            query = {"company_id": user_id}
        else:
            # Admin can see all
            if user.get("email") in ["figuierebaptistepro@gmail.com"]:
                query = {}
            else:
                raise HTTPException(status_code=403, detail="User type not set")
        
        conversations = await db.conversations.find(
            query, {"_id": 0}
        ).sort("last_message_at", -1).to_list(100)
        
        # Enrich with participant info and unread count
        for conv in conversations:
            # Get other participant info
            if user_type == "creator":
                other_user = await db.users.find_one(
                    {"user_id": conv["company_id"]}, 
                    {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
                )
                conv["other_participant"] = other_user
            else:
                other_user = await db.users.find_one(
                    {"user_id": conv["creator_id"]}, 
                    {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
                )
                conv["other_participant"] = other_user
            
            # Get last message preview
            last_msg = await db.messages.find_one(
                {"conversation_id": conv["conversation_id"]},
                {"_id": 0, "text": 1, "content_type": 1, "created_at": 1, "sender_id": 1}
            )
            conv["last_message"] = last_msg
            
            # Get unread count
            read_record = await db.conversation_reads.find_one({
                "conversation_id": conv["conversation_id"],
                "user_id": user_id
            })
            last_read = read_record["last_read_at"] if read_record else datetime.min.replace(tzinfo=timezone.utc)
            
            unread_count = await db.messages.count_documents({
                "conversation_id": conv["conversation_id"],
                "created_at": {"$gt": last_read},
                "sender_id": {"$ne": user_id}
            })
            conv["unread_count"] = unread_count
            
            # Get mission info if mission chat
            if conv.get("mission_id"):
                mission = await db.projects.find_one(
                    {"project_id": conv["mission_id"]},
                    {"_id": 0, "title": 1}
                )
                conv["mission"] = mission
        
        return conversations
    
    @router.post("/conversations")
    async def create_conversation(data: ConversationCreate, user: dict = Depends(get_current_user)):
        """Create or get existing conversation"""
        user_id = user["user_id"]
        user_type = user.get("user_type")
        
        # Only businesses can initiate conversations
        if user_type != "business":
            raise HTTPException(status_code=403, detail="Seules les entreprises peuvent initier une conversation")
        
        creator_id = data.creator_id
        mission_id = data.mission_id
        
        # Verify creator exists
        creator = await db.users.find_one({"user_id": creator_id, "user_type": "creator"})
        if not creator:
            raise HTTPException(status_code=404, detail="Créateur non trouvé")
        
        if mission_id:
            # MISSION CHAT - verify mission and application
            mission = await db.projects.find_one({"project_id": mission_id})
            if not mission:
                raise HTTPException(status_code=404, detail="Mission non trouvée")
            
            if mission.get("business_id") != user_id:
                raise HTTPException(status_code=403, detail="Vous n'êtes pas propriétaire de cette mission")
            
            # Check if creator applied to this mission
            application = await db.applications.find_one({
                "project_id": mission_id,
                "creator_id": creator_id
            })
            if not application:
                raise HTTPException(status_code=403, detail="Ce créateur n'a pas postulé à cette mission")
            
            conv_type = "mission"
            
            # Check for existing conversation
            existing = await db.conversations.find_one({
                "company_id": user_id,
                "creator_id": creator_id,
                "mission_id": mission_id,
                "type": "mission"
            }, {"_id": 0})
            
        else:
            # DIRECT CHAT - verify subscription
            company = await db.users.find_one({"user_id": user_id})
            
            # Check subscription status (mock for MVP)
            if not company.get("is_subscribed", False) and not company.get("is_premium", False):
                raise HTTPException(
                    status_code=403, 
                    detail="Abonnement requis pour contacter directement les créateurs",
                    headers={"X-Require-Subscription": "true"}
                )
            
            conv_type = "direct"
            
            # Check for existing conversation
            existing = await db.conversations.find_one({
                "company_id": user_id,
                "creator_id": creator_id,
                "type": "direct"
            }, {"_id": 0})
        
        if existing:
            return existing
        
        # Create new conversation
        conversation = {
            "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
            "type": conv_type,
            "company_id": user_id,
            "creator_id": creator_id,
            "mission_id": mission_id,
            "status": "active",
            "created_by_role": "company",
            "created_by_id": user_id,
            "last_message_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.conversations.insert_one(conversation)
        del conversation["_id"]
        
        # Get participant info
        creator_info = await db.users.find_one(
            {"user_id": creator_id}, 
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        conversation["other_participant"] = creator_info
        
        return conversation
    
    @router.get("/conversations/{conversation_id}")
    async def get_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
        """Get conversation details"""
        user_id = user["user_id"]
        
        conversation = await db.conversations.find_one(
            {"conversation_id": conversation_id}, {"_id": 0}
        )
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        # Check access
        is_admin = user.get("email") in ["figuierebaptistepro@gmail.com"]
        if not is_admin and conversation["company_id"] != user_id and conversation["creator_id"] != user_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Enrich with participant info
        company = await db.users.find_one(
            {"user_id": conversation["company_id"]}, 
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        creator = await db.users.find_one(
            {"user_id": conversation["creator_id"]}, 
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        conversation["company"] = company
        conversation["creator"] = creator
        
        if conversation.get("mission_id"):
            mission = await db.projects.find_one(
                {"project_id": conversation["mission_id"]},
                {"_id": 0, "title": 1, "project_id": 1}
            )
            conversation["mission"] = mission
        
        return conversation
    
    # ========== MESSAGES ==========
    
    @router.get("/conversations/{conversation_id}/messages")
    async def get_messages(
        conversation_id: str, 
        limit: int = 50,
        before: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get messages in a conversation (paginated)"""
        user_id = user["user_id"]
        
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        # Check access
        is_admin = user.get("email") in ["figuierebaptistepro@gmail.com"]
        if not is_admin and conversation["company_id"] != user_id and conversation["creator_id"] != user_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        query = {"conversation_id": conversation_id, "deleted_at": None}
        if before:
            query["created_at"] = {"$lt": before}
        
        messages = await db.messages.find(
            query, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Reverse to get chronological order
        messages.reverse()
        
        # Enrich with sender info
        for msg in messages:
            sender = await db.users.find_one(
                {"user_id": msg["sender_id"]},
                {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
            )
            msg["sender"] = sender
        
        return messages
    
    @router.post("/conversations/{conversation_id}/messages")
    async def send_message(
        conversation_id: str,
        data: MessageCreate,
        user: dict = Depends(get_current_user)
    ):
        """Send a message in a conversation"""
        user_id = user["user_id"]
        user_type = user.get("user_type")
        
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        # Check access
        is_admin = user.get("email") in ["figuierebaptistepro@gmail.com"]
        if not is_admin and conversation["company_id"] != user_id and conversation["creator_id"] != user_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Check if blocked
        if conversation.get("status") == "blocked" and not is_admin:
            raise HTTPException(status_code=403, detail="Cette conversation est bloquée")
        
        # Validate message content
        if data.content_type == "text" and not data.text:
            raise HTTPException(status_code=400, detail="Message vide")
        if data.content_type == "file" and not data.file_url:
            raise HTTPException(status_code=400, detail="Fichier manquant")
        
        # Determine sender role
        if is_admin:
            sender_role = "admin"
        elif user_type == "business":
            sender_role = "company"
        else:
            sender_role = "creator"
        
        message = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "conversation_id": conversation_id,
            "sender_role": sender_role,
            "sender_id": user_id,
            "content_type": data.content_type,
            "text": data.text,
            "file_url": data.file_url,
            "file_name": data.file_name,
            "file_mime": data.file_mime,
            "file_size": data.file_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None,
            "deleted_by_admin_id": None
        }
        
        await db.messages.insert_one(message)
        del message["_id"]
        
        # Update conversation last_message_at
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"last_message_at": message["created_at"]}}
        )
        
        # Get sender info for response
        sender = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        message["sender"] = sender
        
        # Broadcast to WebSocket subscribers
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "message:new",
                "conversation_id": conversation_id,
                "message": message
            },
            exclude_user=user_id
        )
        
        # Also notify conversation update
        other_user_id = conversation["creator_id"] if user_type == "business" else conversation["company_id"]
        await manager.send_to_user(other_user_id, {
            "type": "conversation:updated",
            "conversation_id": conversation_id,
            "last_message_at": message["created_at"]
        })
        
        return message
    
    @router.post("/conversations/{conversation_id}/read")
    async def mark_as_read(conversation_id: str, user: dict = Depends(get_current_user)):
        """Mark conversation as read"""
        user_id = user["user_id"]
        user_type = user.get("user_type")
        
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        # Check access
        if conversation["company_id"] != user_id and conversation["creator_id"] != user_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        user_role = "company" if user_type == "business" else "creator"
        
        await db.conversation_reads.update_one(
            {"conversation_id": conversation_id, "user_id": user_id},
            {
                "$set": {
                    "conversation_id": conversation_id,
                    "user_role": user_role,
                    "user_id": user_id,
                    "last_read_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {"status": "ok"}
    
    # ========== REPORTS ==========
    
    @router.post("/reports")
    async def create_report(data: ReportCreate, user: dict = Depends(get_current_user)):
        """Report a conversation or message"""
        user_id = user["user_id"]
        user_type = user.get("user_type")
        
        # Verify conversation exists
        conversation = await db.conversations.find_one({"conversation_id": data.conversation_id})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        # Check access
        if conversation["company_id"] != user_id and conversation["creator_id"] != user_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Verify message if provided
        if data.message_id:
            message = await db.messages.find_one({"message_id": data.message_id})
            if not message or message["conversation_id"] != data.conversation_id:
                raise HTTPException(status_code=404, detail="Message non trouvé")
        
        report = {
            "report_id": f"report_{uuid.uuid4().hex[:12]}",
            "conversation_id": data.conversation_id,
            "message_id": data.message_id,
            "reported_by_role": "company" if user_type == "business" else "creator",
            "reported_by_id": user_id,
            "reason": data.reason,
            "note": data.note,
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "closed_at": None,
            "closed_by_admin_id": None
        }
        
        await db.reports.insert_one(report)
        del report["_id"]
        
        return report
    
    # ========== ADMIN ==========
    
    @router.get("/admin/conversations")
    async def admin_get_conversations(
        status: Optional[str] = None,
        type: Optional[str] = None,
        search: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Admin: Get all conversations"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {}
        if status:
            query["status"] = status
        if type:
            query["type"] = type
        
        conversations = await db.conversations.find(query, {"_id": 0}).sort("last_message_at", -1).to_list(100)
        
        for conv in conversations:
            company = await db.users.find_one(
                {"user_id": conv["company_id"]}, 
                {"_id": 0, "name": 1, "picture": 1}
            )
            creator = await db.users.find_one(
                {"user_id": conv["creator_id"]}, 
                {"_id": 0, "name": 1, "picture": 1}
            )
            conv["company"] = company
            conv["creator"] = creator
            
            # Message count
            conv["message_count"] = await db.messages.count_documents({"conversation_id": conv["conversation_id"]})
        
        return conversations
    
    @router.post("/admin/messages/{message_id}/delete")
    async def admin_delete_message(message_id: str, user: dict = Depends(get_current_user)):
        """Admin: Soft delete a message"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.messages.update_one(
            {"message_id": message_id},
            {"$set": {
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "deleted_by_admin_id": user["user_id"]
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message non trouvé")
        
        return {"status": "deleted"}
    
    @router.post("/admin/conversations/{conversation_id}/block")
    async def admin_block_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
        """Admin: Block a conversation"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"status": "blocked"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        # Notify participants via WebSocket
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if conversation:
            await manager.send_to_user(conversation["company_id"], {
                "type": "conversation:blocked",
                "conversation_id": conversation_id
            })
            await manager.send_to_user(conversation["creator_id"], {
                "type": "conversation:blocked",
                "conversation_id": conversation_id
            })
        
        return {"status": "blocked"}
    
    @router.post("/admin/conversations/{conversation_id}/unblock")
    async def admin_unblock_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
        """Admin: Unblock a conversation"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"status": "active"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        return {"status": "active"}
    
    @router.get("/admin/reports")
    async def admin_get_reports(status: str = "open", user: dict = Depends(get_current_user)):
        """Admin: Get all reports"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {}
        if status:
            query["status"] = status
        
        reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        for report in reports:
            reporter = await db.users.find_one(
                {"user_id": report["reported_by_id"]},
                {"_id": 0, "name": 1}
            )
            report["reporter"] = reporter
            
            if report.get("message_id"):
                message = await db.messages.find_one(
                    {"message_id": report["message_id"]},
                    {"_id": 0, "text": 1, "sender_id": 1}
                )
                report["message"] = message
        
        return reports
    
    @router.post("/admin/reports/{report_id}/close")
    async def admin_close_report(report_id: str, user: dict = Depends(get_current_user)):
        """Admin: Close a report"""
        if user.get("email") not in ["figuierebaptistepro@gmail.com"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.reports.update_one(
            {"report_id": report_id},
            {"$set": {
                "status": "closed",
                "closed_at": datetime.now(timezone.utc).isoformat(),
                "closed_by_admin_id": user["user_id"]
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Report non trouvé")
        
        return {"status": "closed"}
    
    return router


# ==================== WEBSOCKET ENDPOINT ====================

async def websocket_endpoint(websocket: WebSocket, db: AsyncIOMotorDatabase, get_user_from_token):
    """WebSocket endpoint for real-time messaging"""
    user = None
    user_id = None
    
    try:
        # Accept connection first
        await websocket.accept()
        
        # Wait for auth message
        auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        
        if auth_data.get("type") != "auth":
            await websocket.close(code=4001, reason="Auth required")
            return
        
        token = auth_data.get("token")
        if not token:
            await websocket.close(code=4001, reason="Token required")
            return
        
        # Verify token
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        user_id = user["user_id"]
        
        # Re-register connection (already accepted)
        if user_id not in manager.active_connections:
            manager.active_connections[user_id] = []
        manager.active_connections[user_id].append(websocket)
        
        await websocket.send_json({"type": "auth:success", "user_id": user_id})
        
        # Auto-subscribe to user's conversations
        user_type = user.get("user_type")
        if user_type == "creator":
            convs = await db.conversations.find({"creator_id": user_id}, {"conversation_id": 1}).to_list(100)
        elif user_type == "business":
            convs = await db.conversations.find({"company_id": user_id}, {"conversation_id": 1}).to_list(100)
        else:
            convs = []
        
        for conv in convs:
            manager.subscribe_to_conversation(user_id, conv["conversation_id"])
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "subscribe":
                conv_id = data.get("conversation_id")
                if conv_id:
                    manager.subscribe_to_conversation(user_id, conv_id)
                    await websocket.send_json({"type": "subscribed", "conversation_id": conv_id})
            
            elif data.get("type") == "unsubscribe":
                conv_id = data.get("conversation_id")
                if conv_id:
                    manager.unsubscribe_from_conversation(user_id, conv_id)
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        await websocket.close(code=4001, reason="Auth timeout")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if user_id:
            manager.disconnect(websocket, user_id)
