"""
Apple Sign In — vérification du JWT côté backend
Identique à google_oauth.py en structure.

Variables d'env à configurer dans .env une fois le compte Apple Developer activé :
  APPLE_CLIENT_ID   → ton Service ID (ex: com.openambassadors.web)
  APPLE_TEAM_ID     → ton Team ID (10 caractères, visible dans Apple Developer)
  APPLE_KEY_ID      → l'ID de ta clé privée Sign in with Apple
  APPLE_PRIVATE_KEY → contenu du fichier .p8 (colle le texte brut, garde les sauts de ligne)
"""
import os
import httpx
from pathlib import Path
from dotenv import load_dotenv
from jose import jwt as jose_jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

APPLE_CLIENT_ID   = os.environ.get('APPLE_CLIENT_ID')   # Service ID
APPLE_TEAM_ID     = os.environ.get('APPLE_TEAM_ID')
APPLE_KEY_ID      = os.environ.get('APPLE_KEY_ID')
APPLE_PRIVATE_KEY = os.environ.get('APPLE_PRIVATE_KEY', '').replace('\\n', '\n')

APPLE_ISSUER      = "https://appleid.apple.com"
APPLE_KEYS_URL    = "https://appleid.apple.com/auth/keys"

# Cache des clés publiques Apple (évite un appel réseau à chaque login)
_apple_keys_cache: dict | None = None


async def get_apple_public_keys() -> dict:
    global _apple_keys_cache
    if _apple_keys_cache:
        return _apple_keys_cache
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(APPLE_KEYS_URL)
        r.raise_for_status()
        _apple_keys_cache = r.json()
    return _apple_keys_cache


async def verify_apple_id_token(id_token: str) -> dict:
    """
    Vérifie le JWT renvoyé par Apple Sign In.
    Retourne le payload si valide, lève une exception sinon.
    """
    if not APPLE_CLIENT_ID:
        raise ValueError("APPLE_CLIENT_ID non configuré")

    keys_data = await get_apple_public_keys()

    # Lit le kid dans le header du token pour trouver la bonne clé publique
    header = jose_jwt.get_unverified_header(id_token)
    kid = header.get('kid')
    key = next((k for k in keys_data['keys'] if k['kid'] == kid), None)
    if not key:
        # Cache périmé → on force un refresh
        global _apple_keys_cache
        _apple_keys_cache = None
        keys_data = await get_apple_public_keys()
        key = next((k for k in keys_data['keys'] if k['kid'] == kid), None)
        if not key:
            raise ValueError(f"Clé publique Apple introuvable (kid={kid})")

    payload = jose_jwt.decode(
        id_token,
        key,
        algorithms=['RS256'],
        audience=APPLE_CLIENT_ID,
        issuer=APPLE_ISSUER,
        options={"verify_at_hash": False},
    )
    return payload
