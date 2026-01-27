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
- **UI**: Dark theme slate-900 avec accents secondary (lime)

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

## What's Been Implemented (December 2024)
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
- [x] Incubateur Premium (mock)
- [x] Formations
- [x] Projets/Missions

### P1 - Next Phase
- [ ] Intégration Stripe réelle pour Incubateur
- [ ] Envoi email OTP réel (SendGrid)
- [ ] Système de matching créateurs/projets
- [ ] Notifications

### P2 - Future
- [ ] Chat/messagerie via projets
- [ ] Analytics avancés
- [ ] Validation identité automatique
- [ ] App mobile

## Next Tasks
1. Intégrer Stripe pour paiement Incubateur
2. Configurer envoi email OTP réel
3. Ajouter matching intelligent
4. Système notifications
