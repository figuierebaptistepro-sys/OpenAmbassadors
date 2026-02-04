# OpenAmbassadors - Product Requirements Document

## Project Overview
**OpenAmbassadors** is a premium SaaS platform connecting businesses with content creators (UGC, micro-trottoir, face cam, ads, interviews, montage).

## Tech Stack
- **Frontend:** React, TailwindCSS, Framer Motion, Leaflet (maps), FFmpeg.wasm (video compression)
- **Backend:** FastAPI, Pydantic, MongoDB (motor), WebSockets
- **Authentication:** JWT + Emergent Google OAuth
- **Storage:** Cloudflare R2
- **Email:** Resend

## Core Features

### ✅ Implemented
1. **Authentication**
   - Email/password login & registration
   - Google social login (Emergent-managed)
   - Password reset flow (blocked by Resend sandbox)

2. **User Dashboards**
   - Creator dashboard with portfolio management
   - Business dashboard with project creation
   - Profile completion scoring

3. **Creator Discovery (`/creators`)**
   - Three views: Créateurs (list), Vidéos (TikTok-style grid), Carte (map)
   - **Advanced filtering panel** (left sidebar on desktop, drawer on mobile):
     - Search by name/keyword
     - City selection
     - Content types (multi-select)
     - Experience level
     - Minimum rating slider
     - Available only toggle
     - Premium only toggle
   - Filter tags display with clear all option

4. **Video Portfolio**
   - 9/16 vertical aspect ratio
   - In-app fullscreen player
   - Client-side FFmpeg.wasm compression (>10MB files)
   - Automatic thumbnail generation

5. **Real-Time Messaging (MVP)**
   - WebSocket-based live messaging
   - Conversation rules: Premium businesses can DM any creator; all businesses can chat with applicants
   - Inbox with unread count badges
   - Entry points from creator profiles and applications

6. **Project/Application System**
   - Businesses post projects with briefs
   - Creators apply to projects
   - Application management workflow

### 🚧 In Progress / Blocked
1. **Forgot Password Email** - BLOCKED on Resend domain verification
2. **Responsive audit** - Specific bugs fixed, full audit pending

### 📋 Upcoming (P0-P1)
1. **P0 - Custom Google OAuth** - User wants to use their own credentials
2. **P1 - Stripe Integration** - Replace mocked `is_subscribed` with real payments

### 📦 Future (P2+)
1. VPS deployment guidance
2. Admin moderation workflows
3. Image cropper for uploads
4. Hashtag/keyword search for creators

## Data Models

### Users
```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "user_type": "creator|business",
  "city": "string",
  "content_types": ["UGC", "Face cam", ...],
  "experience_level": "beginner|intermediate|expert",
  "available": boolean,
  "is_premium": boolean,
  "is_subscribed": boolean (mocked),
  "rating": float,
  "portfolio_videos": [{url, title, views, platform}]
}
```

### Conversations (Messaging)
```json
{
  "id": "string",
  "type": "direct|project",
  "company_id": "string",
  "creator_id": "string",
  "mission_id": "string|null",
  "status": "active|archived|blocked",
  "last_message_at": "datetime"
}
```

### Messages
```json
{
  "id": "string",
  "conversation_id": "string",
  "sender_role": "business|creator",
  "sender_id": "string",
  "text": "string",
  "file_url": "string|null",
  "created_at": "datetime"
}
```

## Key API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/creators` - List/filter creators
- `GET /api/creators/browse` - Discovery with videos
- `GET /api/conversations` - User's conversations
- `POST /api/conversations` - Create conversation (checks subscription)
- `/ws` - WebSocket for real-time messaging

## Test Credentials
- **Business:** figuierebaptistepro@gmail.com / TempPass123!
- **Creator:** testcreator@test.com / testtest

## Known Issues
1. Resend sandbox limits "forgot password" emails to verified owner only
2. Subscription status is mocked (`is_subscribed` boolean)

## File Structure
```
/app/
├── backend/
│   ├── server.py (main FastAPI app)
│   ├── messaging.py (messaging module)
│   └── .env
├── frontend/src/
│   ├── components/
│   │   ├── AppLayout.jsx (main layout, sidebar)
│   │   └── ui/ (shadcn components)
│   ├── pages/
│   │   ├── BrowseCreators.jsx (discovery with filters)
│   │   ├── CreatorDashboard.jsx (portfolio management)
│   │   ├── MessagesPage.jsx (inbox/chat)
│   │   └── ...
│   └── App.js
└── memory/PRD.md
```

---
*Last updated: 2026-02-04*
