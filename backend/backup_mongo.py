#!/usr/bin/env python3
"""
MongoDB backup script — runs daily via cron
- mongodump → tar.gz → upload R2/backups/ → keep last 7 days
Usage: python3 backup_mongo.py
"""
import os, sys, subprocess, tarfile, tempfile, logging, boto3
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("backup")

MONGO_URL       = os.environ.get("MONGO_URL")
R2_ENDPOINT     = os.environ.get("R2_ENDPOINT")
R2_ACCESS_KEY   = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_KEY   = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET       = os.environ.get("R2_BUCKET_NAME")
KEEP_DAYS       = 7

def r2_client():
    if not all([R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET]):
        raise RuntimeError("R2 credentials manquantes dans l'environnement")
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name="auto",
    )

def run_backup():
    date_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    archive_name = f"backup_{date_str}.tar.gz"

    with tempfile.TemporaryDirectory() as tmpdir:
        dump_dir = os.path.join(tmpdir, "dump")
        archive_path = os.path.join(tmpdir, archive_name)

        # 1. mongodump
        log.info("Démarrage mongodump...")
        result = subprocess.run(
            ["mongodump", f"--uri={MONGO_URL}", f"--out={dump_dir}"],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode != 0:
            log.error(f"mongodump échoué: {result.stderr}")
            sys.exit(1)
        log.info("mongodump terminé")

        # 2. Compresser
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(dump_dir, arcname="dump")
        size_mb = Path(archive_path).stat().st_size / 1024 / 1024
        log.info(f"Archive créée: {archive_name} ({size_mb:.1f} MB)")

        # 3. Upload vers R2
        s3 = r2_client()
        r2_key = f"backups/{archive_name}"
        with open(archive_path, "rb") as f:
            s3.put_object(Bucket=R2_BUCKET, Key=r2_key, Body=f.read(), ContentType="application/gzip")
        log.info(f"Uploadé sur R2: {r2_key}")

        # 4. Supprimer les anciens backups (garder KEEP_DAYS)
        resp = s3.list_objects_v2(Bucket=R2_BUCKET, Prefix="backups/")
        objects = sorted(resp.get("Contents", []), key=lambda x: x["LastModified"])
        to_delete = objects[:-KEEP_DAYS] if len(objects) > KEEP_DAYS else []
        for obj in to_delete:
            s3.delete_object(Bucket=R2_BUCKET, Key=obj["Key"])
            log.info(f"Ancien backup supprimé: {obj['Key']}")

    log.info(f"✅ Backup terminé: {archive_name}")

if __name__ == "__main__":
    if not MONGO_URL:
        log.error("MONGO_URL non définie")
        sys.exit(1)
    run_backup()
