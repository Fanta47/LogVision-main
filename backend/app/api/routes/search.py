<<<<<<< HEAD
from fastapi import APIRouter, Query

from app.services.search_service import search_logs

router = APIRouter(prefix='/search', tags=['search'])
=======
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db_session
from app.services.search_service import search_logs
from app.api.routes.upload_logs import ALLOWED_APPLICATIONS

router = APIRouter(prefix='/api/search', tags=['search'])


def _iso(value):
    return value.isoformat() if hasattr(value, "isoformat") else value
>>>>>>> 494bacd (Save workspace snapshot)


@router.get('/taxonomy')
def get_search_taxonomy() -> dict:
    """
    Renvoie la taxonomie des applications et de leurs services/composants.
    Utilisé par le frontend pour filtrer automatiquement les options de recherche.
    """
    return {app: sorted(list(comps)) for app, comps in ALLOWED_APPLICATIONS.items()}


@router.get('/logs')
def search_logs_endpoint(
    term: str | None = Query(default=None, description='Simple query string to search in logs.'),
<<<<<<< HEAD
    size: int = Query(default=20, ge=1, le=200),
) -> dict:
    return search_logs(term=term, size=size)
=======
    query: str | None = Query(default=None, description='Alias for term.'),
    sequence_uid: str | None = Query(default=None),
    application_key: str | None = Query(default=None),
    component_name: str | None = Query(default=None),
    log_level: str | None = Query(default=None),
    start_time: str | None = Query(default=None),
    end_time: str | None = Query(default=None),
    size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db_session),
) -> dict:
    if sequence_uid:
        settings = get_settings()
        sequence = db.execute(
            text(
                """
                SELECT
                    event_ids,
                    application_key,
                    component_name,
                    start_timestamp,
                    end_timestamp
                FROM ml_sequence_score
                WHERE sequence_uid = :sequence_uid
                  AND model_name = :model_name
                  AND model_version = :model_version
                LIMIT 1
                """
            ),
            {
                "sequence_uid": sequence_uid,
                "model_name": settings.ml_model_name,
                "model_version": settings.ml_model_version,
            },
        ).mappings().first()

        if not sequence:
            return {"total": 0, "size": size, "items": [], "logs": [], "source": "postgres_sequence"}

        event_ids = [
            int(value.strip())
            for value in (sequence["event_ids"] or "").split(",")
            if value.strip().isdigit()
        ][:size]

        if not event_ids:
            return {"total": 0, "size": size, "items": [], "logs": [], "source": "postgres_sequence"}

        rows = db.execute(
            text(
                """
                SELECT
                    id,
                    source_doc_id,
                    event_uid,
                    es_id,
                    event_timestamp,
                    application_name,
                    application_key,
                    component_name,
                    log_level,
                    log_origin,
                    log_family,
                    event_type,
                    context,
                    details,
                    normalized_details,
                    source_file,
                    source_path,
                    ingested_at
                FROM base_event
                WHERE id = ANY(:event_ids)
                ORDER BY event_timestamp
                """
            ),
            {"event_ids": event_ids},
        ).mappings().all()

        logs = [dict(row) for row in rows]
        if not logs:
            related = search_logs(
                term=term or query,
                size=size,
                application_key=sequence["application_key"],
                component_name=sequence["component_name"],
                log_level=log_level,
                start_time=_iso(sequence["start_timestamp"]) if sequence["start_timestamp"] else None,
                end_time=_iso(sequence["end_timestamp"]) if sequence["end_timestamp"] else None,
            )
            if not related.get("logs"):
                related = search_logs(
                    term=term or query,
                    size=size,
                    application_key=sequence["application_key"],
                    log_level=log_level,
                    start_time=_iso(sequence["start_timestamp"]) if sequence["start_timestamp"] else None,
                    end_time=_iso(sequence["end_timestamp"]) if sequence["end_timestamp"] else None,
                )
            if not related.get("logs"):
                related = search_logs(
                    term=term or query,
                    size=size,
                    application_key=sequence["application_key"],
                    log_level=log_level,
                )
            related["source"] = "elasticsearch_sequence_fallback"
            related["sequence_uid"] = sequence_uid
            related["sequence_component"] = sequence["component_name"]
            return related

        return {
            "total": len(logs),
            "size": size,
            "items": logs,
            "logs": logs,
            "source": "postgres_sequence",
            "sequence_uid": sequence_uid,
        }

    return search_logs(
        term=term or query,
        size=size,
        application_key=application_key,
        component_name=component_name,
        log_level=log_level,
        start_time=start_time,
        end_time=end_time,
    )
>>>>>>> 494bacd (Save workspace snapshot)
