#!/usr/bin/env python3
"""
Recompress existing portfolio thumbnails.

Logique identique à server.py :
  • Lit tous les creators ayant des portfolio_videos avec thumbnail
  • Pour chaque thumbnail :
      - Local  → lit le fichier, recompresse avec Pillow, écrase sur disque
      - R2     → télécharge, recompresse, ré-upload à la même clé
  • Aucune modif en base (URL reste identique, seul le contenu change)

Usage (sur le VPS, depuis le dossier backend) :
  pip install pillow motor pymongo boto3
  python3 recompress_thumbnails.py
"""

import os, sys, io, logging, asyncio, urllib.request
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
import boto3
from PIL import Image

# ── Config (reprend les mêmes vars env que server.py) ──────────────────────
MONGO_URL   = os.environ["MONGO_URL"]
DB_NAME     = os.environ["DB_NAME"]
UPLOADS_DIR = Path(__file__).parent / "uploads"

R2_ENDPOINT        = os.environ.get("R2_ENDPOINT")
R2_ACCESS_KEY_ID   = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME     = os.environ.get("R2_BUCKET_NAME")
R2_ACCOUNT_ID      = os.environ.get("R2_ACCOUNT_ID")
R2_PUBLIC_URL      = os.environ.get("R2_PUBLIC_URL",
    f"https://pub-{R2_ACCOUNT_ID}.r2.dev" if R2_ACCOUNT_ID else None)

# Paramètres de recompression (identiques à la nouvelle config server.py)
MAX_WIDTH   = 320   # px
JPEG_QUALITY = 40   # Pillow 0-95 (40 ≈ ffmpeg q:v 8, visuellement bon, ~3-4× plus léger)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("recompress")

# ── R2 client (identique à server.py) ──────────────────────────────────────
s3 = None
if R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY:
    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )
    log.info(f"R2 connecté — bucket: {R2_BUCKET_NAME}")
else:
    log.info("Pas de R2 → mode stockage local")


def recompress_jpeg(data: bytes) -> bytes:
    """Ouvre une image, redimensionne à MAX_WIDTH max, ré-encode en JPEG compressé."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = img.size
    if w > MAX_WIDTH:
        new_h = int(h * MAX_WIDTH / w)
        img = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue()


def r2_key_from_url(url: str) -> str | None:
    """Extrait la clé R2 depuis l'URL publique."""
    if R2_PUBLIC_URL and url.startswith(R2_PUBLIC_URL):
        return url[len(R2_PUBLIC_URL):].lstrip("/")
    return None


def local_path_from_url(url: str) -> Path | None:
    """Convertit /api/uploads/portfolio/xxx.jpg → chemin absolu."""
    prefix = "/api/uploads/"
    if url.startswith(prefix):
        relative = url[len(prefix):]
        return UPLOADS_DIR / relative
    return None


def process_thumbnail(url: str) -> bool:
    """Recompresse un thumbnail (local ou R2). Retourne True si succès."""
    try:
        # ── Cas R2 ──
        r2_key = r2_key_from_url(url) if R2_PUBLIC_URL else None
        if s3 and r2_key:
            resp = s3.get_object(Bucket=R2_BUCKET_NAME, Key=r2_key)
            original = resp["Body"].read()
            original_size = len(original)
            recompressed = recompress_jpeg(original)
            if len(recompressed) >= original_size:
                log.info(f"  Déjà optimal, skip: {r2_key}")
                return True
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=r2_key,
                Body=recompressed,
                ContentType="image/jpeg",
            )
            log.info(f"  R2 ✅ {r2_key}  {original_size//1024}KB → {len(recompressed)//1024}KB")
            return True

        # ── Cas local ──
        local = local_path_from_url(url)
        if local and local.exists():
            original = local.read_bytes()
            original_size = len(original)
            recompressed = recompress_jpeg(original)
            if len(recompressed) >= original_size:
                log.info(f"  Déjà optimal, skip: {local.name}")
                return True
            local.write_bytes(recompressed)
            log.info(f"  Local ✅ {local.name}  {original_size//1024}KB → {len(recompressed)//1024}KB")
            return True

        log.warning(f"  Thumbnail introuvable: {url}")
        return False

    except Exception as e:
        log.error(f"  Erreur sur {url}: {e}")
        return False


async def main():
    mongo = AsyncIOMotorClient(MONGO_URL)
    db = mongo[DB_NAME]

    # Récupère tous les créateurs avec des vidéos portfolio
    cursor = db.creator_profiles.find(
        {"portfolio_videos": {"$exists": True, "$not": {"$size": 0}}},
        {"_id": 0, "user_id": 1, "name": 1, "portfolio_videos": 1}
    )

    total_thumbs = 0
    total_ok     = 0
    total_skip   = 0

    async for creator in cursor:
        videos = creator.get("portfolio_videos", [])
        thumbs = [v["thumbnail"] for v in videos if v.get("thumbnail")]
        if not thumbs:
            continue

        log.info(f"\nCréateur: {creator.get('name', creator.get('user_id'))} — {len(thumbs)} thumbnail(s)")
        for url in thumbs:
            total_thumbs += 1
            ok = process_thumbnail(url)
            if ok:
                total_ok += 1
            else:
                total_skip += 1

    log.info(f"\n{'='*50}")
    log.info(f"✅ Terminé : {total_ok}/{total_thumbs} recompressés, {total_skip} skippés/erreurs")
    mongo.close()


if __name__ == "__main__":
    asyncio.run(main())
