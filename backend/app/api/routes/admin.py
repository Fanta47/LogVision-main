from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db_session

router = APIRouter(prefix="/api/admin", tags=["admin"])


ROLE_ALIASES = {
    "admin": "admin",
    "manager": "manager",
    "user": "user",
    "analyst": "user",
}


def _normalize_role(value: object) -> str:
    raw = str(value or "user").strip().lower()
    return ROLE_ALIASES.get(raw, "user")


def _ensure_users_table(db: Session):
    # Keep the app-compatible user schema present on fresh and existing DBs.
    db.execute(text(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            password_hash TEXT NOT NULL,
            active BOOLEAN NOT NULL DEFAULT true,
            last_active TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    ))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user'"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    db.commit()


@router.get("/users")
def list_users(db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        rows = db.execute(text(
            """
            SELECT
                id,
                COALESCE(name, '') AS name,
                email,
                COALESCE(role, 'user') AS role,
                COALESCE(active, true) AS active,
                COALESCE(last_active::text, '') AS last_active,
                COALESCE(created_at::text, '') AS created_at
            FROM users
            ORDER BY id
            """
        ))
        return [dict(r) for r in rows.mappings().all()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"db_error: {exc}")


@router.post("/users")
def create_user(payload: dict, db: Session = Depends(get_db_session)):
    email = (payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    name = (payload.get("name") or "").strip()
    role = _normalize_role(payload.get("role"))
    if not email or not name or len(password) < 8:
        raise HTTPException(status_code=400, detail="invalid_payload")
    try:
        _ensure_users_table(db)
        exists = db.execute(text("SELECT 1 FROM users WHERE lower(email) = lower(:email)"), {"email": email}).scalar()
        if exists:
            raise HTTPException(status_code=409, detail="user_exists")
        res = db.execute(
            text(
                """
                INSERT INTO users (email, name, role, password_hash, active, last_active)
                VALUES (:email, :name, :role, crypt(:password, gen_salt('bf', 10)), true, NOW())
                RETURNING id
                """
            ),
            {"email": email, "name": name, "role": role, "password": password},
        )
        new_id = res.scalar_one()
        db.commit()
        return {"ok": True, "id": int(new_id)}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.put("/users/{user_id}")
def update_user(user_id: int, payload: dict, db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        updates = {}
        if "name" in payload:
            updates["name"] = (payload.get("name") or "").strip()
        if "role" in payload:
            updates["role"] = _normalize_role(payload.get("role"))
        if not updates:
            return {"ok": True}
        result = db.execute(
            text(
                """
                UPDATE users
                SET name = COALESCE(:name, name),
                    role = COALESCE(:role, role)
                WHERE id = :id
                """
            ),
            {"id": user_id, "name": updates.get("name"), "role": updates.get("role")},
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        db.commit()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.post("/users/{user_id}/disable")
def disable_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        result = db.execute(text("UPDATE users SET active = false WHERE id = :id"), {"id": user_id})
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        db.commit()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.post("/users/{user_id}/enable")
def enable_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        result = db.execute(text("UPDATE users SET active = true WHERE id = :id"), {"id": user_id})
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        db.commit()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        result = db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        db.commit()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.get("/roles")
def get_roles(db: Session = Depends(get_db_session)):
    # simple static roles for now
    return {"roles": ["Admin", "Manager", "Analyst"], "permissions": [], "logSources": [], "features": []}


@router.get("/alert-rules")
def get_alert_rules(db: Session = Depends(get_db_session)):
    return []


EMPTY_CONFIG = {
    "parameters": {
        "log_retention_days": 30,
        "max_ingestion_rate": 0,
        "anomaly_threshold": 0,
        "alert_cooldown_minutes": 0,
        "max_concurrent_queries": 0,
        "logout_timeout_seconds": 15,
        "kibana_url": "",
    },
    "flags": {
        "ml_predictions_enabled": False,
        "keycloak_sso_enabled": False,
        "kibana_integration": False,
        "auto_incident_creation": False,
        "debug_mode": False,
    },
}


@router.get("/configuration")
def get_configuration(db: Session = Depends(get_db_session)):
    try:
        return EMPTY_CONFIG
    except Exception:
        return EMPTY_CONFIG


@router.get("/password-reset-requests")
def get_password_requests(db: Session = Depends(get_db_session)):
    return []
