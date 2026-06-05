from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import shutil
import os
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import get_db_session

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _format_uptime(started_at: str) -> str:
    try:
        dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        delta = datetime.now(timezone.utc) - dt
        days = delta.days
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        if days > 0:
            return f"{days}d {hours}h"
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    except Exception:
        return "N/A"


def _get_container_stats(container):
    """
    Calculates real-time CPU and Memory usage for a specific Docker container.
    """
    try:
        stats = container.stats(stream=False)
        
        cpu_stats = stats.get('cpu_stats', {})
        precpu_stats = stats.get('precpu_stats', {})
        
        # CPU calc: (delta_total_usage / delta_system_usage) * online_cpus * 100
        cpu_delta = cpu_stats.get('cpu_usage', {}).get('total_usage', 0) - \
                    precpu_stats.get('cpu_usage', {}).get('total_usage', 0)
        system_delta = cpu_stats.get('system_cpu_usage', 0) - \
                       precpu_stats.get('system_cpu_usage', 0)
        
        online_cpus = cpu_stats.get('online_cpus', 1)
        
        cpu_percent = 0.0
        if system_delta > 0.0 and cpu_delta > 0.0:
            cpu_percent = (cpu_delta / system_delta) * online_cpus * 100.0
            
        mem_usage = stats.get('memory_stats', {}).get('usage', 0)
        mem_mb = mem_usage / (1024 * 1024)
        
        return f"{cpu_percent:.1f}%", f"{mem_mb:.1f}MB"
    except Exception:
        return "0.0%", "0MB"


@router.get("/system/health")
def admin_system_health(db: Session = Depends(get_db_session)):
    try:
        import docker
        client = docker.from_env()
        # Fetch all containers (running, stopped, failed)
        containers = client.containers.list(all=True)
        
        services = []
        up_count = 0
        total_cpu_val = 0.0

        for c in containers:
            status = c.status or "unknown"
            started_at = c.attrs.get("State", {}).get("StartedAt") or ""
            uptime = _format_uptime(started_at) if started_at else "N/A"
            name = c.name
            
            cpu_str, mem_str = "0.0%", "0MB"
            if status == "running":
                up_count += 1
                cpu_str, mem_str = _get_container_stats(c)
                try:
                    total_cpu_val += float(cpu_str.replace('%', ''))
                except ValueError:
                    pass

            services.append({
                "id": c.id[:12], 
                "name": name, 
                "status": status, 
                "uptime": uptime,
                "cpu": cpu_str, 
                "memory": mem_str
            })

        # Real storage calculation
        usage = shutil.disk_usage("/")
        storage_str = f"{usage.used // (1024**3)}GB / {usage.total // (1024**3)}GB"
        
        # Use aggregate container CPU as a proxy for total system load
        avg_cpu_str = f"{min(total_cpu_val, 100.0):.1f}%"

        # Real ingestion rate: logs in the last 60 seconds / 60
        count_res = db.execute(text("SELECT COUNT(*) FROM base_event WHERE ingested_at >= NOW() - INTERVAL '1 minute'"))
        logs_last_minute = count_res.scalar() or 0
        rate = logs_last_minute / 60.0

        return {
            "servicesUp": f"{up_count}/{len(services)}",
            "ingestionRate": f"{rate:.1f}/s",
            "storageUsed": storage_str,
            "avgCpu": avg_cpu_str,
            "services": services,
        }
    except Exception as e:
        return {
            "servicesUp": "0/0",
            "ingestionRate": "0/s",
            "storageUsed": "N/A",
            "avgCpu": "0%",
            "services": [],
            "error": str(e)
        }


@router.post("/system/restart/{service_id}")
def admin_system_restart(service_id: str):
    try:
        import docker
        client = docker.from_env()
        container = client.containers.get(service_id)
        container.restart()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
