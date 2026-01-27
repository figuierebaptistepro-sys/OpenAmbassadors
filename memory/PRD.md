# UGC Machine - Product Requirements Document

## Vision
La plateforme où les entreprises trouvent des créateurs qualifiés pour générer du contenu performant (UGC, micro-trottoir, vidéos virales, ads, etc.)

## Problem Statement Original
Plateforme marketplace créateurs/entreprises avec:
- Positionnement: Pas une plateforme d'influence, pas juste un portfolio - Une machine à production de contenu rentable
- Structure: Landing page, Espace Créateur, Espace Entreprise, Packs, Messagerie

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT + Google OAuth (Emergent)
- **Storage**: MongoDB pour données, liens YouTube/Drive pour vidéos

## User Personas
1. **Créateur de contenu**: Veut trouver des missions, valoriser son portfolio, fixer ses tarifs
2. **Entreprise**: Veut trouver des créateurs qualifiés rapidement, avec garanties et résultats mesurables

## Core Requirements (Static)
- Landing page avec hero, preuve sociale, CTAs
- Authentification créateur/entreprise
- Dashboard créateur avec profil, portfolio, stats
- Dashboard entreprise avec recherche, packs
- Système de packs (Local Impact, Visibilité Digitale, Massive Content)
- Messagerie interne
- Système de notation/avis

## What's Been Implemented (December 2024)
✅ Landing page complète avec hero, stats dynamiques, témoignages
✅ Auth JWT + Google OAuth via Emergent
✅ Dashboard créateur (profil éditable, portfolio vidéo, badges)
✅ Dashboard entreprise (recherche, stats, packs)
✅ Onboarding entreprise (wizard 4 étapes)
✅ Browse créateurs avec filtres
✅ Page profil créateur public
✅ Page packs avec demande de devis
✅ Messagerie interne
✅ API complète (auth, creators, business, packs, messages, reviews)

## Prioritized Backlog

### P0 - Done ✅
- [x] Core auth flows
- [x] Creator/Business dashboards
- [x] Pack system
- [x] Messaging

### P1 - Next Phase
- [ ] Intégration Stripe pour paiements escrow réels
- [ ] Upload vidéo direct (S3/Cloud Storage)
- [ ] Notifications push/email
- [ ] Système de campagnes complet

### P2 - Future
- [ ] Matching intelligent créateurs/entreprises
- [ ] Analytics avancés
- [ ] Abonnements premium créateurs
- [ ] App mobile

## Next Tasks
1. Intégrer Stripe pour paiements réels
2. Ajouter upload vidéo direct
3. Système de notifications
4. Page de gestion des campagnes
