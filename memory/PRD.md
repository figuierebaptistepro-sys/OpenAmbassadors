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

#### 1. Système Learn/Articles (NEW - Décembre 2025)
**Backend** (`/app/backend/articles.py`):
- CRUD complet pour les articles de formation
- Support bannières images et vidéos
- Système de points par article complété
- Filtrage par catégorie et recherche
- Compteur de vues automatique
- Routes admin protégées (création, modification, suppression)

**Frontend**:
- `/learn` - Liste des articles avec grille, filtres et recherche
- `/learn/:articleId` - Page détail avec contenu formaté (markdown basique)
- Interface admin intégrée pour créer des articles
- Gestion du contenu premium avec verrouillage pour non-premium
- Tracking de progression utilisateur

**Collections MongoDB**: `articles`, `article_progress`

#### 2. Authentication
- Email/password login & registration
- Google social login (Emergent-managed)
- Password reset flow (blocked by Resend sandbox)

#### 2. User Dashboards
- Creator dashboard with portfolio management
- Business dashboard with project creation
- Profile completion scoring

#### 3. Creator Discovery (`/creators`)
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

#### 4. Video Portfolio
- 9/16 vertical aspect ratio
- In-app fullscreen player
- Client-side FFmpeg.wasm compression (>10MB files)
- Automatic thumbnail generation

#### 5. Real-Time Messaging (MVP)
- WebSocket-based live messaging
- Conversation rules: Premium businesses can DM any creator; all businesses can chat with applicants
- Inbox with unread count badges
- Entry points from creator profiles and applications

#### 6. Project/Application System
- Businesses post projects with briefs
- Creators apply to projects
- Application management workflow

#### 7. 🆕 Système de Notation Hybride (NEW)
**Backend** (`/app/backend/reviews.py`):
- **Avis vérifiés** (post-mission): Générés après mission complétée, poids 1.0
- **Avis externes** (invitation): Email avec token sécurisé (7 jours), poids 0.6
- **Score pondéré**: `score = somme(rating × poids) / somme(poids)`
- **Badges automatiques**:
  - `top_rated`: Note ≥4.8 + 10 avis vérifiés
  - `rising_star`: Note ≥4.5 + 5 avis vérifiés
  - `verified_pro`: ≥3 avis vérifiés
  - `perfect_streak`: 5 étoiles consécutives
  - `trusted_external`: ≥3 avis externes validés
- **Modération admin**: Masquer/supprimer avis, système de signalement

**API Endpoints**:
- `POST /api/reviews` - Créer avis vérifié
- `PUT /api/reviews/{id}` - Modifier (fenêtre 48h)
- `GET /api/reviews/user/{id}` - Avis + stats + badges
- `GET /api/reviews/pending` - Missions en attente d'avis
- `POST /api/reviews/invite` - Inviter entreprise externe
- `GET /api/reviews/invitations` - Liste invitations
- `GET /api/reviews/external/validate` - Valider token
- `POST /api/reviews/external` - Soumettre avis externe (sans auth)
- `GET /api/admin/reviews` - Admin: tous les avis
- `POST /api/reviews/{id}/report` - Signaler un avis

**Frontend**:
- `ReviewModal.jsx` - Modal de notation 5 étoiles
- `ReviewsSection.jsx` - Affichage avis + stats + badges sur profils
- `InviteExternalReview.jsx` - Interface invitation externe
- `ExternalReviewPage.jsx` - Page publique `/review/external?token=xxx`
- Section avis sur `CreatorProfile.jsx`
- Onglet "Avis" dans `AccountSettings.jsx` (créateurs)

#### 8. 🆕 Système d'Affiliation (NEW - Feb 2026)
**Backend** (`/app/backend/affiliate.py`):
- Génération de lien d'affiliation unique par utilisateur
- Tracking des clics sur les liens
- Enregistrement automatique du parrainage à l'inscription
- Dashboard avec stats (clics, inscriptions, conversion, abonnés, MRR)
- Séparation créateurs/entreprises invités
- Commissions 20% récurrentes sur abonnements

**Collections MongoDB**:
- `affiliate_codes`: Codes d'affiliation des utilisateurs
- `affiliate_clicks`: Tracking des clics
- `affiliate_referrals`: Liens parrain-filleul
- `affiliate_stats`: Statistiques agrégées
- `affiliate_commissions`: Historique des commissions

**API Endpoints**:
- `GET /api/affiliate/link` - Obtenir son lien d'affiliation
- `GET /api/affiliate/dashboard` - Stats complètes
- `POST /api/affiliate/track-click` - Tracker un clic (public)
- `POST /api/affiliate/register-referral` - Enregistrer parrainage
- `POST /api/affiliate/update-status` - MAJ statut (pour webhook Stripe)
- `GET /api/affiliate/commissions` - Historique commissions

**Frontend**:
- `AffiliatePage.jsx` - Dashboard complet `/affiliate`
- Menu "Affiliation" dans la sidebar (créateurs + entreprises)
- Capture du `?ref=CODE` sur `/login` avec tracking automatique

**Statuts utilisateur**:
- `free` - Inscrit gratuit
- `trial` - En période d'essai
- `paying` - Abonné actif
- `cancelled` - Résilié

**Note**: Les commissions seront déclenchées via webhook Stripe `invoice.paid` (à implémenter avec Stripe)

### 🚧 In Progress / Blocked
1. **Forgot Password Email** - BLOCKED on Resend domain verification

### 📋 Upcoming (P0-P1)
1. **P0 - Custom Google OAuth** - User wants to use their own credentials
2. **P1 - Stripe Integration** - Replace mocked `is_subscribed` with real payments
   - Connecter les webhooks au système d'affiliation

### 📦 Future (P2+)
1. VPS deployment guidance
2. Admin moderation workflows (messaging + reviews)
3. Image cropper for uploads
4. Widget externe embarquable pour profils créateurs
5. Page publique SEO `/creator/{slug}`

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
  "review_count": int,
  "verified_review_count": int,
  "portfolio_videos": [{url, title, views, platform}]
}
```

### Reviews (NEW)
```json
{
  "review_id": "string",
  "reviewee_id": "string",
  "reviewee_role": "creator|company",
  "reviewer_id": "string|null",
  "reviewer_role": "business|creator|external_company",
  "reviewer_name": "string",
  "reviewer_company": "string|null",
  "reviewer_email_hash": "string",
  "mission_id": "string|null",
  "invitation_id": "string|null",
  "rating": 1-5,
  "comment": "string",
  "source": "verified|external",
  "is_verified": boolean,
  "is_published": boolean,
  "created_at": "datetime",
  "updated_at": "datetime",
  "can_edit_until": "datetime|null"
}
```

### Review Invitations (NEW)
```json
{
  "invitation_id": "string",
  "creator_id": "string",
  "creator_name": "string",
  "company_name": "string",
  "company_email_hash": "string",
  "collaboration_description": "string|null",
  "token": "string",
  "token_expires_at": "datetime",
  "status": "pending|completed|expired",
  "created_at": "datetime"
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

## Test Credentials
- **Business/Admin:** figuierebaptistepro@gmail.com / TempPass123!
- **Creator Test:** createur.test@test.com / Test123!

## Known Issues
1. Resend sandbox limits "forgot password" emails to verified owner only
2. Subscription status is mocked (`is_subscribed` boolean)

## File Structure
```
/app/
├── backend/
│   ├── server.py (main FastAPI app)
│   ├── messaging.py (messaging module)
│   ├── reviews.py (NEW - reviews system)
│   └── .env
├── frontend/src/
│   ├── components/
│   │   ├── AppLayout.jsx
│   │   ├── ReviewModal.jsx (NEW)
│   │   ├── ReviewsSection.jsx (NEW)
│   │   ├── InviteExternalReview.jsx (NEW)
│   │   └── ui/ (shadcn components)
│   ├── pages/
│   │   ├── BrowseCreators.jsx (discovery with filters)
│   │   ├── CreatorDashboard.jsx
│   │   ├── CreatorProfile.jsx (+ reviews section)
│   │   ├── AccountSettings.jsx (+ reviews tab)
│   │   ├── ExternalReviewPage.jsx (NEW)
│   │   ├── MessagesPage.jsx
│   │   └── ...
│   └── App.js
└── memory/PRD.md
```

---
*Last updated: 2026-02-04 - Système de Notation Hybride implémenté*
