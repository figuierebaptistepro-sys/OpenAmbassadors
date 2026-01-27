# Incubateur des Créateurs - Product Requirements Document

## Vision
Plateforme privée où les entreprises trouvent des créateurs qualifiés pour générer du contenu performant. Système de progression intelligent et non-bloquant.

## Problem Statement Original
Refonte vers une plateforme privée avec:
- Login only (pas de page marketing)
- Onboarding non-bloquant (email + type seuls obligatoires)
- Progression intelligente impactant visibilité
- Incubateur Premium payant

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Google OAuth + OTP Email
- **UI**: Light theme (#F6F7FB background, #FFFFFF cards) avec accent pink (#FF2E63)

## User Personas
1. **Créateur**: Développer son activité, compléter son profil progressivement, accéder aux missions
2. **Entreprise**: Trouver des créateurs qualifiés via filtres et recommandations, déposer des projets

## Core Requirements (Static)
- Plateforme privée (login-first)
- Auth: Google + OTP Email + Demande d'accès
- Sélection type utilisateur après 1ère connexion
- Dashboard avec barre progression profil
- Système de scores (complétion/fiabilité/performance)
- Incubateur Premium (49€/mois)
- Bibliothèque formations
- Système projets/missions

## What's Been Implemented

### January 2025 - Art Direction & Structure Refactor
✅ New light/pink design system (#F6F7FB, #FFFFFF, #FF2E63)
✅ Fixed left sidebar navigation
✅ Account Settings page (Profile, Notifications, Security, Preferences tabs)
✅ Support & Guides page (FAQ, Guides, Contact support)
✅ Learn page (Free & Premium trainings with gamification)
✅ Find Creator as dedicated page
✅ Pack selection dialog bug fix (better accessibility with buttons)
✅ User avatar + subscription type badge in sidebar
✅ Creator Wallet (cagnotte) system with withdrawals
✅ Enhanced project creation page with mandatory banner
✅ Project cards display banners and business logos
✅ Premium users: 0% platform fees
✅ Verified/Premium badges on creator profiles

### December 2024 - Core MVP
✅ Login page privée (Google + OTP + Demande accès)
✅ Sélection type utilisateur
✅ Dashboard créateur avec scores et progression
✅ Profil éditable non-bloquant (sheet slide-out)
✅ Portfolio avec warning <3 vidéos
✅ CTA Incubateur Premium (49€/mois)
✅ Bibliothèque formations (gratuites + premium verrouillées)
✅ Page missions avec candidature
✅ Dashboard entreprise avec sélection pack
✅ Browse créateurs avec filtres (disponible, premium only)
✅ Profil créateur public avec scores
✅ Création projet (nécessite pack)

## Scoring System
- **Complétion** (0-100%): Bio, ville, spécialités, équipement, expérience, portfolio, tarifs
- **Fiabilité**: Basé sur missions réalisées
- **Performance**: Basé sur résultats et avis

## Verification Statuses
- Non vérifié
- Identité vérifiée  
- Portfolio validé
- Certifié Incubateur

## Prioritized Backlog

### P0 - Done ✅
- [x] Auth (Google + OTP)
- [x] Dashboards créateur/entreprise
- [x] Système progression/scores
- [x] Incubateur Premium (MOCKED - subscription only)
- [x] Formations
- [x] Projets/Missions
- [x] Art Direction light/pink theme
- [x] Account Settings, Support, Learn pages

### P1 - Next Phase
- [ ] Intégration Stripe réelle pour Incubateur (49€/mois)
- [ ] Intégration Stripe pour packs business
- [ ] Envoi email OTP réel (SendGrid)
- [ ] Système de matching créateurs/projets
- [ ] Notifications
- [ ] Intégration PayPal pour retraits cagnotte (marqué "Soon")

### P2 - Future
- [ ] Chat/messagerie via projets
- [ ] Système escrow pour paiements
- [ ] Analytics avancés
- [ ] Validation identité automatique
- [ ] Export base de données créateurs (admin)
- [ ] App mobile
- [ ] Interface admin pour validation des paiements/retraits

## Current Status
- **Frontend**: Fully functional with all pages implemented
- **Backend**: All core APIs working
- **Payment**: MOCKED (Stripe not integrated yet)
- **Email**: Debug mode (OTP codes shown in toast, not sent via email)

## Next Tasks
1. Intégrer Stripe pour paiement Incubateur Premium (49€/mois)
2. Intégrer Stripe pour packs business
3. Configurer envoi email OTP réel (SendGrid)
4. Ajouter matching intelligent créateurs/projets
5. Système notifications temps réel
