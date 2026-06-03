from fastapi import APIRouter

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/system/health")
def admin_system_health():
    # Minimal health response to satisfy the frontend dashboard.
    return {
        "servicesUp": "1/1",
        "ingestionRate": "0/s",
        "storageUsed": "0 B",
        "avgCpu": "0%",
        "services": [
            {"id": "backend", "name": "backend", "status": "running", "uptime": "N/A"}
        ],
    }


@router.post("/system/restart/{service_id}")
def admin_system_restart(service_id: str):
    # Mock restart: return ok (frontend uses this to show success)
    return {"ok": True}
