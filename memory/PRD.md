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

#### 9. 🆕 Système Pool d'Influence (Feb 2026)
**Backend** (`/app/backend/influence_pools.py`):
- **Modes de rémunération:**
  - CPM (Coût Par Mille): Paiement basé sur les vues
  - POOL: Budget partagé selon performance
- **Packages disponibles:** 5000€, 15000€, 25000€
- **Système d'approbation:**
  - Option `requires_approval` pour filtrer les créateurs
  - Workflow: Postuler → En attente → Approuvé/Refusé → Soumettre vidéos
- **Gestion des candidatures:**
  - Message de motivation optionnel
  - Approbation/rejet par la marque
  - Notifications automatiques
- **Soumission de contenu:**
  - Support multi-plateformes (TikTok, Instagram Reels, YouTube Shorts)
  - Plusieurs vidéos par participant
  - Tracking des vues et gains

**Collections MongoDB:**
- `influence_pools`: Pools avec brief, budget, plateformes
- `pool_participations`: Participants actifs
- `pool_applications`: Candidatures en attente/traitées
- `pool_submissions`: Vidéos soumises

**API Endpoints (Business):**
- `GET /api/pools` - Liste des pools
- `POST /api/pools` - Créer une pool
- `GET /api/pools/{id}/applications` - Voir candidatures
- `POST /api/pools/{id}/applications/{app_id}/approve` - Approuver
- `POST /api/pools/{id}/applications/{app_id}/reject` - Refuser
- `PUT /api/pools/{id}/status` - Mettre en pause/reprendre

**API Endpoints (Creator):**
- `GET /api/pools` - Pools disponibles
- `POST /api/pools/{id}/join` - Rejoindre/Postuler
- `POST /api/pools/{id}/submit` - Soumettre vidéo
- `GET /api/pools/my/applications` - Mes candidatures
- `GET /api/pools/my/participations` - Mes participations
- `GET /api/pools/my/submissions` - Mes soumissions

**Frontend (Business):**
- `BusinessPoolsPage.jsx` - Liste pools avec filtres
- `BusinessPoolDetailPage.jsx` - Détail + onglet Candidatures
- `CreatePoolPage.jsx` - Formulaire création avec option approbation
- Menu "Pool" dans sidebar → `/business/pools`

**Frontend (Creator):**
- `ArenaPage.jsx` - Liste pools disponibles (`/pool`)
- `PoolDetailPage.jsx` - Brief + boutons Postuler/Rejoindre/Soumettre
- Modal de candidature avec message de motivation
- Menu "Pool" dans sidebar

### 🚧 In Progress / Blocked
1. **Forgot Password Email** - BLOCKED on Resend domain verification
2. **Demandes de collaboration** - Nécessite abonnement business actif pour tester l'envoi complet

### 📋 Backlog (P1-P2)
1. **P1** - Ajouter fonctionnalité "Accepter/Refuser/Négocier" côté créateur pour les demandes de collaboration
2. **P1** - Configurer abonnement business pour les utilisateurs de test
3. **P2** - Notifications email lors de nouvelles demandes de collaboration
4. **P2** - Historique des demandes côté business

### ✅ Récemment complété (Feb 21, 2026)
- **Formulaire de collaboration** : Budget obligatoire, envoi de message au créateur
- **Bouton Favoris** : API POST/DELETE, toggle visuel, page "Mes Favoris"
- **Portfolio photos** : Section visible sur profil créateur

### ✅ Security Improvements (Feb 2026)

#### Favicon & SEO (Feb 2026)
- Favicon avec le logo OpenAmbassadors (32x32, 192x192, 512x512)
- Meta tags Open Graph pour le partage social
- Description et keywords SEO
- Theme-color pink (#E91E63)

#### Système de Niches / Secteurs pour Créateurs (Feb 2026)
**18 niches disponibles:**
- 💄 Beauté & Cosmétique
- 🎰 iGaming & Paris
- 🎮 Gaming & Esport
- 👗 Mode & Fashion
- 📱 Tech & Gadgets
- 🍕 Food & Gastronomie
- 💪 Fitness & Sport
- ✈️ Voyage & Lifestyle
- 💰 Finance & Crypto
- 🏠 Immobilier
- 🚗 Auto & Moto
- 📚 Éducation & Formation
- 🧘 Santé & Bien-être
- 👶 Famille & Enfants
- 🐾 Animaux
- 🎵 Musique & Art
- 💼 B2B & SaaS
- 🛒 E-commerce

**Fonctionnalités:**
- Sélection multiple dans le profil créateur
- Filtrage par niche sur la page Browse Creators
- Affichage des niches sur le profil public
- Validation côté backend

#### Module de Sécurité (`/app/backend/security.py`)
**Rate Limiting** (slowapi):
- Login: 5 requêtes/minute
- Register: 3 requêtes/minute  
- OTP Request: 3 requêtes/minute
- OTP Verify: 5 requêtes/minute
- Password Reset: 3-5 requêtes/minute
- Uploads: 10 requêtes/minute

**Protection Brute-Force**:
- Verrouillage compte après 10 tentatives échouées
- Durée de verrouillage: 15 minutes
- OTP limité à 5 tentatives par code

**Headers de Sécurité HTTP**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (restrictif)
- `Strict-Transport-Security` (HTTPS)

**Validation & Sanitization**:
- Longueurs maximales pour tous les champs
- Sanitization des entrées (null bytes, control chars)
- Validation de force de mot de passe (8+ chars, lettre + chiffre)

**Logs de Sécurité** (`/app/backend/security.log`):
- Tentatives d'authentification (success/fail)
- Rate limits atteints
- Événements de sécurité importants
- Emails masqués pour confidentialité

**Tokens Sécurisés**:
- JWT_SECRET obligatoire (64+ caractères)
- OTP cryptographiquement sécurisé
- Tokens de session avec `secrets.token_urlsafe()`
- Invalidation des anciens tokens de reset

**CORS Restrictif**:
- Origins explicites uniquement
- Méthodes HTTP spécifiques
- Headers autorisés spécifiques

#### 🆕 Creator Card - Profil Public Partageable (Feb 2026)
**URL publique:** `openambassadors.com/c/{username}`

**Backend** (`/app/backend/creator_card.py`):
- Système de username unique avec validation:
  - 3-30 caractères, alphanumériques + underscore/tiret
  - Liste de slugs réservés (admin, api, login, etc.)
  - Vérification disponibilité en temps réel
- Gestion des offres (services):
  - Titre, description, prix optionnel, lien externe
  - Limite: 1 offre (gratuit) / illimité (premium)
- Gestion des liens (type linktree):
  - Titre, URL, icône optionnelle
  - Limite: 3 liens (gratuit) / illimité (premium)
- Score de profil calculé automatiquement
- Badges dynamiques (Premium, Vérifié, Top Rated, Expérimenté)

**API Endpoints**:
- `GET /api/username/check/{username}` - Vérifier disponibilité
- `POST /api/creators/me/username` - Définir/modifier username
- `GET /api/creators/me/card` - Données de sa Creator Card
- `POST /api/creators/me/offers` - Ajouter une offre
- `PUT /api/creators/me/offers/{id}` - Modifier une offre
- `DELETE /api/creators/me/offers/{id}` - Supprimer une offre
- `POST /api/creators/me/links` - Ajouter un lien
- `PUT /api/creators/me/links/{id}` - Modifier un lien
- `DELETE /api/creators/me/links/{id}` - Supprimer un lien
- `GET /api/c/{username}` - Page publique (sans auth)

**Frontend**:
- `CreatorCardPage.jsx` - Page publique `/c/{username}`
  - Hero: photo, nom, bio, niche, score, badges
  - CTA "Proposer une collaboration" avec logique de redirection
  - Section offres (cartes)
  - Section liens (style linktree)
  - Footer "Powered by OpenAmbassadors"
  - Design mobile-first, minimal et professionnel
- `CreatorCardManager.jsx` - Gestion dans le dashboard créateur
  - Configuration username
  - CRUD offres et liens
  - Preview et partage

**Comportement bouton CTA:**
- Non connecté → `/login`
- Connecté non-entreprise → `/select-type`
- Entreprise non abonnée → `/business/subscribe`
- Entreprise abonnée → `/dashboard/proposals/new?creator={username}`

**Collection MongoDB:** `creator_cards`
```json
{
  "user_id": "string",
  "username": "string (unique)",
  "offers": [{ "offer_id", "title", "description", "price", "external_link", "order" }],
  "links": [{ "link_id", "title", "url", "icon", "order" }],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### Google OAuth Personnel (Feb 2026)
**Backend** (`/app/backend/google_oauth.py`):
- Configuration Authlib pour OAuth 2.0
- Support ProxyHeadersMiddleware pour reverse proxy (NPM, nginx)
- SessionMiddleware avec same_site="lax", https_only=True
- Gestion automatique des nouveaux utilisateurs vs existants

**API Endpoints**:
- `GET /api/auth/google/login` - Initier le flux OAuth
- `GET /api/auth/google/callback` - Callback après consentement Google
- `GET /api/auth/google/client-id` - Retourner Client ID pour frontend

**Configuration requise (.env)**:
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

#### 🆕 Fiche Créateur V2 - Mini Landing Page B2B (Feb 2026)
**Objectif:** Transformer la fiche créateur en landing page B2B optimisée conversion

**Frontend** (`/app/frontend/src/pages/CreatorProfileV2.jsx`):
- **Hero Section:**
  - Cover réduite + Avatar + Nom
  - Badge dynamique (Nouveau créateur / Premium / Top Rated / Expérimenté)
  - Localisation, temps de réponse, nombre de projets
  - Tagline 1 ligne max
  - CTA "Demander une collaboration" + Favoris

- **Section Vidéos** (position 1):
  - Titre: "Réalisations vidéo"
  - 3-6 vidéos autoplay muted
  - Badge vues + type contenu
  - Hover preview

- **Section Portfolio Photos** (nouveau champ `portfolio_photos`):
  - Grille photos (produit, backstage, lifestyle, instagram)
  - Lightbox au clic

- **Section Marques** (`brands_worked`):
  - Logos/noms des marques collaborées
  - Masquée si vide

- **Section Avis**:
  - Note moyenne + nombre d'avis
  - 2-3 avis visibles + "Voir tous"
  - Message "Nouveau créateur" si vide

- **Section Services**:
  - Types de collaborations: UGC, Ads, Micro-trottoir, etc.
  - Sans détail ni promesses fixes

- **Tarification Flexible**:
  - "À partir de XX€"
  - Pas de packs figés

- **Sidebar Sticky** (desktop):
  - Prix, disponibilité, temps de réponse, badge
  - Bouton "Demander collaboration"

**Backend** (nouvelles routes dans `server.py`):
- `GET /api/creators/{user_id}/reviews` - Avis enrichis
- `POST /api/collaboration-requests` - Demande de collaboration
- `GET /api/collaboration-requests/creator` - Liste pour créateur
- `GET /api/collaboration-requests/business` - Liste pour entreprise
- `PATCH /api/collaboration-requests/{id}/status` - Accepter/Refuser
- `POST /api/creators/me/photos` - Ajouter photo portfolio
- `DELETE /api/creators/me/photos/{index}` - Supprimer photo

**Nouveaux champs CreatorProfile:**
- `portfolio_photos: List[dict]` - [{url, caption, type}]
- `tagline: Optional[str]` - Accroche courte
- `response_time: Optional[str]` - "< 24h", "2-3 jours"

**Collection MongoDB:** `collaboration_requests`
```json
{
  "request_id": "collab_xxx",
  "creator_id": "string",
  "business_id": "string",
  "business_name": "string",
  "content_types": ["UGC", "Ads"],
  "platforms": ["tiktok", "instagram"],
  "budget_range": "500-1000",
  "deadline": "2026-03-01",
  "brief": "Description du projet...",
  "deliverables": "1 vidéo TikTok...",
  "additional_info": "...",
  "status": "pending|accepted|declined",
  "created_at": "datetime"
}
```

**Tests:** 100% backend + frontend vérifiés
- `/app/backend/tests/test_creator_profile_v2.py`

### 📋 Upcoming (P0-P1)
1. **P0 - CAPTCHA** - Cloudflare Turnstile sur création compte et mot de passe oublié
2. **P1 - Stripe Integration** - Remplacer `is_subscribed` mocké par paiements réels
   - Connecter les webhooks au système d'affiliation
3. **P1 - Page Proposals** - `/dashboard/proposals/new?creator={username}` pour soumettre collaborations

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
*Last updated: 2026-02-21 - Fiche Créateur V2 (Mini Landing Page B2B) implémentée*
