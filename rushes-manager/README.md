# 🎬 Rushes Manager — SD Card → R2 → Monteurs

## Plan complet du flux

```
📷 Carte SD
    ↓
🖥️  Script upload_sd.py (Mac/PC)
    ↓  (upload automatique + organisation par client/projet)
☁️  Cloudflare R2  (rushes/client/projet/date_CAM_A/)
    ↓  (notification automatique)
🌐  Dashboard Web (toi + ta collaboratrice)
    ↓  (tu sélectionnes les batches + tu choisis le monteur)
👤  Monteur reçoit ses rushs
    ↓  (il télécharge, monte, marque terminé)
✅  Projet livré
```

---

## Installation

### 1. Backend (sur ton serveur ou en local)
```bash
cd backend
cp .env.example .env   # remplis avec tes credentials R2
pip install -r requirements.txt
python server.py
# Dashboard dispo sur http://localhost:8001
```

### 2. Script upload SD (sur ton Mac)
```bash
cd upload-cli
cp .env.example .env   # mêmes credentials R2
pip install boto3 python-dotenv tqdm
python upload_sd.py
```

---

## Utilisation

### Workflow complet

**1. Toi / ta collaboratrice (après le tournage)**
```bash
python3 upload_sd.py
# → Chemin carte SD : /Volumes/NOM_CARTE
# → Client : nike
# → Projet : campagne_ete_2025
# → Label : CAM_A
# → Upload automatique + notification dashboard
```

**2. Dashboard (toi)**
- Va sur le dashboard → Projets
- Sélectionne les batches uploadés
- Assigne au monteur de ton choix

**3. Monteur**
- Se connecte au dashboard avec son email/mdp
- Voit ses rushs assignés
- Clique "Télécharger" → liens directs vers R2
- Marque "En cours" puis "Terminé"

---

## Ajouter un monteur
Dashboard → Monteurs → + Ajouter monteur
(il reçoit un email/mdp pour se connecter)

---

## Credentials par défaut
- Admin : admin@studio.com / admin123
- **Change le mot de passe admin en production !**
