#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════╗
║  RUSHES UPLOADER — Carte SD → Cloudflare R2  ║
║  Usage: python3 upload_sd.py                 ║
╚══════════════════════════════════════════════╝

Install: pip install boto3 python-dotenv tqdm
Config:  copie .env.example → .env et remplis les variables
"""

import os, sys, json, hashlib, mimetypes, threading
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

try:
    import boto3
    from tqdm import tqdm
except ImportError:
    print("❌ Dépendances manquantes. Lance: pip install boto3 python-dotenv tqdm")
    sys.exit(1)

load_dotenv(Path(__file__).parent / ".env")

# ── Config R2 ──────────────────────────────────────────────────────────────
R2_ENDPOINT        = os.environ["R2_ENDPOINT"]
R2_ACCESS_KEY_ID   = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET_NAME     = os.environ["R2_BUCKET_NAME"]
DASHBOARD_URL      = os.environ.get("DASHBOARD_URL", "http://localhost:8001")
DASHBOARD_API_KEY  = os.environ.get("DASHBOARD_API_KEY", "")

# Extensions vidéo et photo acceptées
VIDEO_EXTS = {'.mp4', '.mov', '.mxf', '.avi', '.mkv', '.r3d', '.braw', '.arw', '.cr3', '.m4v', '.mts', '.m2ts'}
PHOTO_EXTS = {'.jpg', '.jpeg', '.png', '.raw', '.cr2', '.nef', '.dng', '.tiff', '.heic'}
ALL_EXTS   = VIDEO_EXTS | PHOTO_EXTS

s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
)


def format_size(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def scan_sd(sd_path: Path) -> list[Path]:
    """Scanne la carte SD et retourne tous les fichiers médias."""
    files = []
    for f in sd_path.rglob("*"):
        if f.is_file() and f.suffix.lower() in ALL_EXTS:
            files.append(f)
    return sorted(files)


def file_md5(path: Path, chunk_size=8192) -> str:
    """Calcule le MD5 d'un fichier pour détecter les doublons."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        while chunk := f.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()


def already_uploaded(r2_key: str) -> bool:
    """Vérifie si le fichier existe déjà sur R2."""
    try:
        s3.head_object(Bucket=R2_BUCKET_NAME, Key=r2_key)
        return True
    except:
        return False


def upload_file(local_path: Path, r2_key: str) -> bool:
    """Upload un fichier vers R2 avec barre de progression."""
    file_size = local_path.stat().st_size
    content_type = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"

    with tqdm(
        total=file_size,
        unit='B', unit_scale=True,
        desc=f"  📤 {local_path.name[:40]}",
        leave=False
    ) as pbar:
        def callback(bytes_transferred):
            pbar.update(bytes_transferred)

        try:
            s3.upload_file(
                str(local_path),
                R2_BUCKET_NAME,
                r2_key,
                ExtraArgs={"ContentType": content_type},
                Callback=callback,
            )
            return True
        except Exception as e:
            print(f"\n  ❌ Erreur upload {local_path.name}: {e}")
            return False


def notify_dashboard(batch_info: dict):
    """Notifie le dashboard web qu'un nouveau batch est disponible."""
    try:
        import urllib.request
        data = json.dumps(batch_info).encode()
        req = urllib.request.Request(
            f"{DASHBOARD_URL}/api/batches",
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": DASHBOARD_API_KEY,
            }
        )
        urllib.request.urlopen(req, timeout=5)
        print(f"  ✅ Dashboard notifié : {DASHBOARD_URL}")
    except Exception as e:
        print(f"  ⚠️  Dashboard non joignable (les fichiers sont quand même uploadés)")


def main():
    print("\n" + "═" * 55)
    print("  🎬  RUSHES UPLOADER — Carte SD → Cloudflare R2")
    print("═" * 55 + "\n")

    # ── 1. Sélection de la carte SD ──
    print("📁 Chemin de la carte SD (ex: /Volumes/SD_CARD) :")
    sd_input = input("  > ").strip()
    sd_path = Path(sd_input)
    if not sd_path.exists():
        print(f"❌ Chemin introuvable : {sd_path}")
        sys.exit(1)

    # ── 2. Infos du projet ──
    print("\n🎯 Nom du client :")
    client = input("  > ").strip().replace(" ", "_").lower()

    print("\n📋 Nom du projet :")
    project = input("  > ").strip().replace(" ", "_").lower()

    print("\n🏷️  Label de la carte SD (ex: CAM_A, CAM_B, DRONE) :")
    sd_label = input("  > ").strip().replace(" ", "_").upper() or "SD_1"

    # ── 3. Scan de la carte ──
    print(f"\n🔍 Scan de {sd_path}...")
    files = scan_sd(sd_path)

    if not files:
        print("❌ Aucun fichier média trouvé sur la carte SD.")
        sys.exit(1)

    total_size = sum(f.stat().st_size for f in files)
    videos = [f for f in files if f.suffix.lower() in VIDEO_EXTS]
    photos = [f for f in files if f.suffix.lower() in PHOTO_EXTS]

    print(f"\n📊 Trouvé :")
    print(f"  🎬 {len(videos)} vidéos")
    print(f"  📸 {len(photos)} photos")
    print(f"  💾 Total : {format_size(total_size)}")

    # ── 4. Confirmation ──
    date_str  = datetime.now().strftime("%Y-%m-%d")
    r2_folder = f"rushes/{client}/{project}/{date_str}_{sd_label}"
    print(f"\n📦 Dossier R2 : {r2_folder}/")
    print("\n▶️  Démarrer l'upload ? (o/n) :", end=" ")
    if input().strip().lower() not in ('o', 'oui', 'y', 'yes'):
        print("Annulé.")
        sys.exit(0)

    # ── 5. Upload ──
    print(f"\n🚀 Upload en cours...\n")
    uploaded   = []
    skipped    = []
    failed     = []
    batch_id   = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{sd_label}"

    for i, local_file in enumerate(files, 1):
        r2_key = f"{r2_folder}/{local_file.name}"
        print(f"[{i}/{len(files)}] {local_file.name} ({format_size(local_file.stat().st_size)})")

        if already_uploaded(r2_key):
            print(f"  ⏭️  Déjà uploadé, skip")
            skipped.append(local_file.name)
            continue

        # Calcule MD5 pour détection doublons côté dashboard
        print(f"  🔍 Calcul MD5...", end="\r")
        md5 = file_md5(local_file)

        success = upload_file(local_file, r2_key)
        if success:
            uploaded.append({
                "filename": local_file.name,
                "r2_key":   r2_key,
                "size":     local_file.stat().st_size,
                "type":     "video" if local_file.suffix.lower() in VIDEO_EXTS else "photo",
                "md5":      md5,
            })
        else:
            failed.append(local_file.name)

    # ── 6. Rapport ──
    print("\n" + "═" * 55)
    print("  ✅ UPLOAD TERMINÉ")
    print("═" * 55)
    print(f"  Uploadés  : {len(uploaded)} fichiers")
    print(f"  Skippés   : {len(skipped)} (déjà présents)")
    print(f"  Échecs    : {len(failed)}")
    print(f"  Dossier   : {r2_folder}/")

    # ── 7. Notification dashboard ──
    if uploaded:
        batch_info = {
            "batch_id":   batch_id,
            "client":     client,
            "project":    project,
            "sd_label":   sd_label,
            "r2_folder":  r2_folder,
            "date":       date_str,
            "files":      uploaded,
            "file_count": len(uploaded),
            "total_size": sum(f["size"] for f in uploaded),
        }
        print("\n📡 Notification du dashboard...")
        notify_dashboard(batch_info)

    if failed:
        print(f"\n⚠️  Fichiers en échec :")
        for f in failed:
            print(f"  - {f}")

    print("\n✅ Terminé ! Les rushs sont disponibles sur le dashboard.\n")


if __name__ == "__main__":
    main()
