"""
RUSHES MANAGER — Backend API
Dashboard de gestion des rushs vidéo SD → R2 → Monteurs
"""
import os, uuid, json, hashlib, logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, Header, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
import boto3
import sqlite3

load_dotenv(Path(__file__).parent / ".env")

# ── Config ─────────────────────────────────────────────────────────────────
R2_ENDPOINT          = os.environ["R2_ENDPOINT"]
R2_ACCESS_KEY_ID     = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET_NAME       = os.environ["R2_BUCKET_NAME"]
R2_PUBLIC_URL        = os.environ["R2_PUBLIC_URL"]
API_KEY              = os.environ.get("DASHBOARD_API_KEY", "change_this_secret_key")
DB_PATH              = Path(__file__).parent / "rushes.db"

# ── R2 Client ───────────────────────────────────────────────────────────────
s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
)

# ── Database ────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS editors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            client TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS batches (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            client TEXT,
            project_name TEXT,
            sd_label TEXT,
            r2_folder TEXT,
            file_count INTEGER DEFAULT 0,
            total_size INTEGER DEFAULT 0,
            uploaded_at TEXT,
            status TEXT DEFAULT 'available'
        );

        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            batch_id TEXT,
            project_id TEXT,
            filename TEXT,
            r2_key TEXT,
            size INTEGER,
            type TEXT,
            md5 TEXT,
            download_url TEXT
        );

        CREATE TABLE IF NOT EXISTS assignments (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            editor_id TEXT,
            batch_ids TEXT,
            assigned_at TEXT,
            deadline TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS deliveries (
            id TEXT PRIMARY KEY,
            assignment_id TEXT,
            project_id TEXT,
            editor_id TEXT,
            filename TEXT,
            r2_key TEXT,
            size INTEGER,
            version INTEGER DEFAULT 1,
            note TEXT,
            delivered_at TEXT,
            status TEXT DEFAULT 'pending_review'
        );
    """)
    conn.commit()

    # Crée un éditeur admin par défaut
    existing = conn.execute("SELECT id FROM editors WHERE email = 'admin@studio.com'").fetchone()
    if not existing:
        conn.execute("""
            INSERT INTO editors (id, name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            f"editor_{uuid.uuid4().hex[:8]}",
            "Admin",
            "admin@studio.com",
            hashlib.sha256("admin123".encode()).hexdigest(),
            datetime.now(timezone.utc).isoformat()
        ))
        conn.commit()
    conn.close()

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Rushes Manager")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# ── Auth ────────────────────────────────────────────────────────────────────
def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key invalide")
    return x_api_key

def verify_editor(x_editor_token: str = Header(None)):
    if not x_editor_token:
        raise HTTPException(status_code=401, detail="Token manquant")
    conn = get_db()
    editor = conn.execute(
        "SELECT * FROM editors WHERE id = ?", (x_editor_token,)
    ).fetchone()
    conn.close()
    if not editor:
        raise HTTPException(status_code=401, detail="Token invalide")
    return dict(editor)

# ── Models ───────────────────────────────────────────────────────────────────
class BatchIngest(BaseModel):
    batch_id: str
    client: str
    project: str
    sd_label: str
    r2_folder: str
    date: str
    files: List[dict]
    file_count: int
    total_size: int

class ProjectCreate(BaseModel):
    name: str
    client: str
    description: Optional[str] = ""

class EditorCreate(BaseModel):
    name: str
    email: str
    password: str

class AssignmentCreate(BaseModel):
    project_id: str
    editor_id: str
    batch_ids: List[str]
    deadline: Optional[str] = ""
    notes: Optional[str] = ""

class EditorLogin(BaseModel):
    email: str
    password: str

# ── Routes : Batches (appelé par le CLI upload) ──────────────────────────────
@app.post("/api/batches")
async def ingest_batch(batch: BatchIngest, _=Depends(verify_api_key)):
    """Reçoit un nouveau batch depuis le script upload_sd.py"""
    conn = get_db()

    # Cherche ou crée le projet
    project = conn.execute(
        "SELECT id FROM projects WHERE client = ? AND name = ?",
        (batch.client, batch.project)
    ).fetchone()

    if not project:
        project_id = f"proj_{uuid.uuid4().hex[:8]}"
        conn.execute(
            "INSERT INTO projects (id, name, client, created_at) VALUES (?, ?, ?, ?)",
            (project_id, batch.project, batch.client, datetime.now(timezone.utc).isoformat())
        )
    else:
        project_id = project["id"]

    # Insère le batch
    conn.execute("""
        INSERT OR REPLACE INTO batches
        (id, project_id, client, project_name, sd_label, r2_folder, file_count, total_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        batch.batch_id, project_id, batch.client, batch.project,
        batch.sd_label, batch.r2_folder, batch.file_count,
        batch.total_size, datetime.now(timezone.utc).isoformat()
    ))

    # Insère les fichiers
    for f in batch.files:
        conn.execute("""
            INSERT OR REPLACE INTO files (id, batch_id, project_id, filename, r2_key, size, type, md5)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"file_{uuid.uuid4().hex[:8]}", batch.batch_id, project_id,
            f["filename"], f["r2_key"], f["size"], f.get("type", "video"), f.get("md5")
        ))

    conn.commit()
    conn.close()
    return {"success": True, "project_id": project_id, "batch_id": batch.batch_id}


# ── Routes : Dashboard (admin) ───────────────────────────────────────────────
@app.get("/api/dashboard")
async def get_dashboard(_=Depends(verify_api_key)):
    """Stats globales pour le dashboard admin"""
    conn = get_db()
    stats = {
        "total_projects": conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0],
        "total_batches":  conn.execute("SELECT COUNT(*) FROM batches").fetchone()[0],
        "total_files":    conn.execute("SELECT COUNT(*) FROM files").fetchone()[0],
        "total_size":     conn.execute("SELECT SUM(total_size) FROM batches").fetchone()[0] or 0,
        "total_editors":  conn.execute("SELECT COUNT(*) FROM editors").fetchone()[0],
        "pending_assignments": conn.execute(
            "SELECT COUNT(*) FROM assignments WHERE status = 'pending'"
        ).fetchone()[0],
    }
    conn.close()
    return stats


@app.get("/api/projects")
async def list_projects(_=Depends(verify_api_key)):
    conn = get_db()
    projects = conn.execute("""
        SELECT p.*,
               COUNT(DISTINCT b.id) as batch_count,
               COUNT(DISTINCT f.id) as file_count,
               SUM(b.total_size) as total_size
        FROM projects p
        LEFT JOIN batches b ON b.project_id = p.id
        LEFT JOIN files f ON f.project_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(p) for p in projects]


@app.post("/api/projects")
async def create_project(data: ProjectCreate, _=Depends(verify_api_key)):
    conn = get_db()
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    conn.execute(
        "INSERT INTO projects (id, name, client, description, created_at) VALUES (?, ?, ?, ?, ?)",
        (project_id, data.name, data.client, data.description, datetime.now(timezone.utc).isoformat())
    )
    conn.commit()
    conn.close()
    return {"id": project_id}


@app.get("/api/projects/{project_id}/batches")
async def get_project_batches(project_id: str, _=Depends(verify_api_key)):
    conn = get_db()
    batches = conn.execute(
        "SELECT * FROM batches WHERE project_id = ? ORDER BY uploaded_at DESC", (project_id,)
    ).fetchall()
    conn.close()
    return [dict(b) for b in batches]


@app.get("/api/batches/{batch_id}/files")
async def get_batch_files(batch_id: str, _=Depends(verify_api_key)):
    conn = get_db()
    files = conn.execute(
        "SELECT * FROM files WHERE batch_id = ?", (batch_id,)
    ).fetchall()
    # Génère les URLs de téléchargement signées (valides 24h)
    result = []
    for f in files:
        f = dict(f)
        try:
            f["download_url"] = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': R2_BUCKET_NAME, 'Key': f['r2_key']},
                ExpiresIn=86400  # 24h
            )
        except:
            f["download_url"] = f"{R2_PUBLIC_URL}/{f['r2_key']}"
        result.append(f)
    conn.close()
    return result


@app.get("/api/editors")
async def list_editors(_=Depends(verify_api_key)):
    conn = get_db()
    editors = conn.execute(
        "SELECT id, name, email, created_at FROM editors"
    ).fetchall()
    conn.close()
    return [dict(e) for e in editors]


@app.post("/api/editors")
async def create_editor(data: EditorCreate, _=Depends(verify_api_key)):
    conn = get_db()
    editor_id = f"editor_{uuid.uuid4().hex[:8]}"
    try:
        conn.execute(
            "INSERT INTO editors (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (editor_id, data.name, data.email,
             hashlib.sha256(data.password.encode()).hexdigest(),
             datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    finally:
        conn.close()
    return {"id": editor_id, "name": data.name, "email": data.email}


@app.post("/api/assignments")
async def create_assignment(data: AssignmentCreate, _=Depends(verify_api_key)):
    conn = get_db()
    assignment_id = f"assign_{uuid.uuid4().hex[:8]}"
    conn.execute("""
        INSERT INTO assignments (id, project_id, editor_id, batch_ids, assigned_at, deadline, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        assignment_id, data.project_id, data.editor_id,
        json.dumps(data.batch_ids),
        datetime.now(timezone.utc).isoformat(),
        data.deadline, data.notes
    ))
    # Marque les batches comme assignés
    for batch_id in data.batch_ids:
        conn.execute(
            "UPDATE batches SET status = 'assigned' WHERE id = ?", (batch_id,)
        )
    conn.commit()
    conn.close()
    return {"id": assignment_id}


@app.get("/api/assignments")
async def list_assignments(_=Depends(verify_api_key)):
    conn = get_db()
    assignments = conn.execute("""
        SELECT a.*, e.name as editor_name, e.email as editor_email,
               p.name as project_name, p.client
        FROM assignments a
        LEFT JOIN editors e ON e.id = a.editor_id
        LEFT JOIN projects p ON p.id = a.project_id
        ORDER BY a.assigned_at DESC
    """).fetchall()
    conn.close()
    return [dict(a) for a in assignments]


# ── Routes : Doublons ────────────────────────────────────────────────────────

@app.get("/api/duplicates")
async def find_duplicates(_=Depends(verify_api_key)):
    """
    Détecte les doublons par MD5 (même contenu) ET par nom de fichier.
    Retourne des groupes : pour chaque doublon, quel fichier garder / supprimer.
    """
    conn = get_db()

    # Doublons par MD5 (même contenu exact)
    md5_dupes = conn.execute("""
        SELECT f.md5, COUNT(*) as count,
               GROUP_CONCAT(f.id) as file_ids,
               GROUP_CONCAT(f.filename) as filenames,
               GROUP_CONCAT(f.r2_key) as r2_keys,
               GROUP_CONCAT(f.size) as sizes,
               GROUP_CONCAT(f.batch_id) as batch_ids,
               SUM(f.size) as total_size
        FROM files f
        WHERE f.md5 IS NOT NULL AND f.md5 != ''
        GROUP BY f.md5
        HAVING COUNT(*) > 1
    """).fetchall()

    # Doublons par nom de fichier (même nom, contenu potentiellement différent)
    name_dupes = conn.execute("""
        SELECT f.filename, COUNT(*) as count,
               GROUP_CONCAT(f.id) as file_ids,
               GROUP_CONCAT(f.r2_key) as r2_keys,
               GROUP_CONCAT(f.size) as sizes,
               GROUP_CONCAT(f.batch_id) as batch_ids
        FROM files f
        GROUP BY f.filename
        HAVING COUNT(*) > 1
    """).fetchall()

    result = {
        "by_content": [],
        "by_name": [],
        "total_wasted_space": 0,
    }

    wasted = 0
    for row in md5_dupes:
        row = dict(row)
        ids    = row["file_ids"].split(",")
        keys   = row["r2_keys"].split(",")
        names  = row["filenames"].split(",")
        sizes  = [int(s) for s in row["sizes"].split(",")]
        # Garde le premier, les autres sont à supprimer
        waste  = sum(sizes[1:])
        wasted += waste
        result["by_content"].append({
            "md5":         row["md5"],
            "count":       row["count"],
            "keep":        {"id": ids[0], "r2_key": keys[0], "filename": names[0]},
            "duplicates":  [{"id": ids[i], "r2_key": keys[i], "filename": names[i], "size": sizes[i]}
                            for i in range(1, len(ids))],
            "wasted_bytes": waste,
        })

    result["total_wasted_space"] = wasted
    result["by_name"] = [dict(r) for r in name_dupes]
    conn.close()
    return result


@app.delete("/api/files")
async def delete_files(body: dict, _=Depends(verify_api_key)):
    """
    Supprime une liste de fichiers :
    - Efface de Cloudflare R2
    - Efface de la base de données locale
    body: { "file_ids": ["file_xxx", ...] }
    """
    file_ids = body.get("file_ids", [])
    if not file_ids:
        raise HTTPException(status_code=400, detail="Aucun fichier sélectionné")

    conn = get_db()
    deleted   = []
    failed    = []
    freed_bytes = 0

    for file_id in file_ids:
        f = conn.execute("SELECT * FROM files WHERE id = ?", (file_id,)).fetchone()
        if not f:
            continue
        f = dict(f)

        # Supprime de R2
        try:
            s3.delete_object(Bucket=R2_BUCKET_NAME, Key=f["r2_key"])
            freed_bytes += f.get("size", 0)
            deleted.append(file_id)
        except Exception as e:
            logging.warning(f"R2 delete failed for {f['r2_key']}: {e}")
            failed.append({"id": file_id, "error": str(e)})
            continue

        # Supprime de la DB
        conn.execute("DELETE FROM files WHERE id = ?", (file_id,))

    # Met à jour les compteurs des batches affectés
    conn.execute("""
        UPDATE batches SET
            file_count = (SELECT COUNT(*) FROM files WHERE batch_id = batches.id),
            total_size  = (SELECT COALESCE(SUM(size), 0) FROM files WHERE batch_id = batches.id)
    """)

    conn.commit()
    conn.close()

    return {
        "deleted":      len(deleted),
        "failed":       len(failed),
        "freed_bytes":  freed_bytes,
        "errors":       failed,
    }


@app.delete("/api/batches/{batch_id}")
async def delete_batch(batch_id: str, _=Depends(verify_api_key)):
    """Supprime tout un batch (tous ses fichiers R2 + DB)"""
    conn = get_db()
    files = conn.execute("SELECT * FROM files WHERE batch_id = ?", (batch_id,)).fetchall()

    deleted = 0
    freed   = 0
    for f in files:
        f = dict(f)
        try:
            s3.delete_object(Bucket=R2_BUCKET_NAME, Key=f["r2_key"])
            freed += f.get("size", 0)
            deleted += 1
        except Exception as e:
            logging.warning(f"R2 delete failed: {e}")

    conn.execute("DELETE FROM files WHERE batch_id = ?", (batch_id,))
    conn.execute("DELETE FROM batches WHERE id = ?", (batch_id,))
    conn.commit()
    conn.close()

    return {"deleted_files": deleted, "freed_bytes": freed}


# ── Routes : Monteurs (accès limité) ─────────────────────────────────────────
@app.post("/api/editor/login")
async def editor_login(data: EditorLogin):
    conn = get_db()
    editor = conn.execute(
        "SELECT * FROM editors WHERE email = ? AND password_hash = ?",
        (data.email, hashlib.sha256(data.password.encode()).hexdigest())
    ).fetchone()
    conn.close()
    if not editor:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    editor = dict(editor)
    return {
        "token": editor["id"],  # Le token = l'ID de l'éditeur
        "name": editor["name"],
        "email": editor["email"],
    }


@app.get("/api/editor/assignments")
async def editor_assignments(editor=Depends(verify_editor)):
    """Retourne les assignments du monteur connecté"""
    conn = get_db()
    assignments = conn.execute("""
        SELECT a.*, p.name as project_name, p.client
        FROM assignments a
        LEFT JOIN projects p ON p.id = a.project_id
        WHERE a.editor_id = ?
        ORDER BY a.assigned_at DESC
    """, (editor["id"],)).fetchall()

    result = []
    for a in assignments:
        a = dict(a)
        batch_ids = json.loads(a.get("batch_ids", "[]"))
        batches = []
        for bid in batch_ids:
            batch = conn.execute("SELECT * FROM batches WHERE id = ?", (bid,)).fetchone()
            if batch:
                batches.append(dict(batch))
        a["batches"] = batches
        result.append(a)

    conn.close()
    return result


@app.get("/api/editor/files/{batch_id}")
async def editor_batch_files(batch_id: str, editor=Depends(verify_editor)):
    """Fichiers d'un batch avec URLs de téléchargement (monteur)"""
    conn = get_db()
    # Vérifie que ce batch appartient bien à une assignment du monteur
    assignment = conn.execute("""
        SELECT a.id FROM assignments a WHERE a.editor_id = ? AND a.batch_ids LIKE ?
    """, (editor["id"], f"%{batch_id}%")).fetchone()

    if not assignment:
        raise HTTPException(status_code=403, detail="Accès refusé")

    files = conn.execute("SELECT * FROM files WHERE batch_id = ?", (batch_id,)).fetchall()
    result = []
    for f in files:
        f = dict(f)
        try:
            f["download_url"] = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': R2_BUCKET_NAME, 'Key': f['r2_key']},
                ExpiresIn=86400
            )
        except:
            f["download_url"] = f"{R2_PUBLIC_URL}/{f['r2_key']}"
        result.append(f)
    conn.close()
    return result


@app.post("/api/editor/assignments/{assignment_id}/deliver")
async def deliver_video(
    assignment_id: str,
    file: UploadFile = File(...),
    note: str = Form(""),
    editor=Depends(verify_editor)
):
    """Le monteur upload sa vidéo montée finale."""
    conn = get_db()

    # Vérifie que l'assignment appartient bien à ce monteur
    assignment = conn.execute(
        "SELECT * FROM assignments WHERE id = ? AND editor_id = ?",
        (assignment_id, editor["id"])
    ).fetchone()
    if not assignment:
        raise HTTPException(status_code=403, detail="Accès refusé")

    assignment = dict(assignment)

    # Numéro de version (si re-livraison)
    version = conn.execute(
        "SELECT COUNT(*) FROM deliveries WHERE assignment_id = ?", (assignment_id,)
    ).fetchone()[0] + 1

    contents  = await file.read()
    file_size = len(contents)
    delivery_id = f"del_{uuid.uuid4().hex[:8]}"
    ext       = Path(file.filename).suffix
    r2_key    = f"deliveries/{assignment['project_id']}/{assignment_id}_v{version}{ext}"

    # Upload vers R2
    try:
        import io
        s3.upload_fileobj(
            io.BytesIO(contents),
            R2_BUCKET_NAME,
            r2_key,
            ExtraArgs={"ContentType": file.content_type or "video/mp4"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload R2 échoué: {e}")

    # Sauvegarde en DB
    conn.execute("""
        INSERT INTO deliveries (id, assignment_id, project_id, editor_id, filename, r2_key, size, version, note, delivered_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        delivery_id, assignment_id, assignment["project_id"],
        editor["id"], file.filename, r2_key, file_size,
        version, note, datetime.now(timezone.utc).isoformat()
    ))

    # Met à jour le statut de l'assignment
    conn.execute(
        "UPDATE assignments SET status = 'delivered' WHERE id = ?", (assignment_id,)
    )
    conn.commit()
    conn.close()

    return {
        "success":     True,
        "delivery_id": delivery_id,
        "version":     version,
        "filename":    file.filename,
        "size":        file_size,
    }


@app.get("/api/deliveries")
async def list_deliveries(_=Depends(verify_api_key)):
    """Admin — liste toutes les livraisons avec lien de téléchargement."""
    conn = get_db()
    deliveries = conn.execute("""
        SELECT d.*, e.name as editor_name, p.name as project_name, p.client,
               a.notes as assignment_notes
        FROM deliveries d
        LEFT JOIN editors e ON e.id = d.editor_id
        LEFT JOIN projects p ON p.id = d.project_id
        LEFT JOIN assignments a ON a.id = d.assignment_id
        ORDER BY d.delivered_at DESC
    """).fetchall()

    result = []
    for d in deliveries:
        d = dict(d)
        try:
            d["download_url"] = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': R2_BUCKET_NAME, 'Key': d['r2_key']},
                ExpiresIn=86400
            )
        except:
            d["download_url"] = f"{R2_PUBLIC_URL}/{d['r2_key']}"
        result.append(d)
    conn.close()
    return result


@app.patch("/api/deliveries/{delivery_id}/review")
async def review_delivery(delivery_id: str, body: dict, _=Depends(verify_api_key)):
    """Admin valide ou demande une correction."""
    status = body.get("status")  # 'approved' ou 'needs_revision'
    comment = body.get("comment", "")
    if status not in ("approved", "needs_revision"):
        raise HTTPException(status_code=400, detail="Status invalide")

    conn = get_db()
    conn.execute(
        "UPDATE deliveries SET status = ? WHERE id = ?", (status, delivery_id)
    )
    # Si correction demandée → repasse l'assignment en in_progress
    if status == "needs_revision":
        delivery = conn.execute(
            "SELECT assignment_id FROM deliveries WHERE id = ?", (delivery_id,)
        ).fetchone()
        if delivery:
            conn.execute(
                "UPDATE assignments SET status = 'in_progress' WHERE id = ?",
                (delivery["assignment_id"],)
            )
    conn.commit()
    conn.close()
    return {"success": True}


@app.patch("/api/editor/assignments/{assignment_id}/status")
async def update_assignment_status(
    assignment_id: str,
    body: dict,
    editor=Depends(verify_editor)
):
    status = body.get("status")
    if status not in ("in_progress", "done"):
        raise HTTPException(status_code=400, detail="Status invalide")
    conn = get_db()
    conn.execute(
        "UPDATE assignments SET status = ? WHERE id = ? AND editor_id = ?",
        (status, assignment_id, editor["id"])
    )
    conn.commit()
    conn.close()
    return {"success": True}


# ── Serve frontend ───────────────────────────────────────────────────────────
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


# ── Init ─────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_db()
    print("✅ Rushes Manager démarré")
    print(f"   Dashboard : http://localhost:8001")
    print(f"   API docs  : http://localhost:8001/docs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
