from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db_session

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _ensure_users_table(db: Session):
    # Create a simple users table if it doesn't exist so endpoints work on fresh DBs
    db.execute(text(
        """
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            role TEXT,
            password_hash TEXT,
            active BOOLEAN DEFAULT true,
            last_active TIMESTAMPTZ
        )
        """
    ))
    db.commit()


@router.get("/users")
def list_users(db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        rows = db.execute(text("SELECT id, COALESCE(name, '') AS user, email, COALESCE(role, 'Analyst') AS role, CASE WHEN active THEN 'active' ELSE 'inactive' END AS status, COALESCE(last_active::text, '') AS lastActive FROM users ORDER BY id"))
        return [dict(r) for r in rows.mappings().all()]
    except Exception:
        # fallback to empty list if DB unavailable
        return []


@router.post("/users")
def create_user(payload: dict, db: Session = Depends(get_db_session)):
    email = (payload.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="invalid_payload")
    try:
        _ensure_users_table(db)
        exists = db.execute(text("SELECT 1 FROM users WHERE lower(email) = lower(:email)"), {"email": email}).scalar()
        if exists:
            raise HTTPException(status_code=409, detail="user_exists")
        # store provided password as password_hash (no hashing here)
        res = db.execute(text("INSERT INTO users (email, name, role, password_hash, active) VALUES (:email, :name, :role, :password, true) RETURNING id"), {"email": email, "name": payload.get("name"), "role": payload.get("role", "Analyst"), "password": payload.get("password")})
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
        if "role" in payload:
            db.execute(text("UPDATE users SET role = :role WHERE id = :id"), {"role": payload["role"], "id": user_id})
            db.commit()
            return {"ok": True}
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.post("/users/{user_id}/disable")
def disable_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        db.execute(text("UPDATE users SET active = false WHERE id = :id"), {"id": user_id})
        db.commit()
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.post("/users/{user_id}/enable")
def enable_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        db.execute(text("UPDATE users SET active = true WHERE id = :id"), {"id": user_id})
        db.commit()
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=500, detail="db_error")


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        _ensure_users_table(db)
        db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        db.commit()
        return {"ok": True}
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
