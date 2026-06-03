from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api.routes.errors import router as errors_router
from app.api.routes.events import router as events_router
from app.api.routes.health import router as health_router
from app.api.routes.manager import router as manager_router
from app.api.routes.ml import router as ml_router
from app.api.routes.search import router as search_router
from app.api.routes.upload_logs import router as upload_logs_router
from app.api.routes.admin_system import router as admin_system_router


app = FastAPI(title="LogVision Backend")

dev_allow_all = os.environ.get("DEV_ALLOW_ALL_ORIGINS", "0") == "1"
if dev_allow_all:
    cors_kwargs = {
        "allow_origins": ["*"],
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
else:
    cors_kwargs = {
        "allow_origins": [],
        "allow_origin_regex": r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$",
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }

app.add_middleware(CORSMiddleware, **cors_kwargs)

app.include_router(health_router)
app.include_router(events_router)
app.include_router(errors_router)
app.include_router(search_router)
app.include_router(ml_router)
app.include_router(manager_router)
app.include_router(upload_logs_router)
app.include_router(admin_system_router)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "backend"}
