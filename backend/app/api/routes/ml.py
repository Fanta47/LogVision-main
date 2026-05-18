from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db_session

router = APIRouter(prefix="/api/ml", tags=["ml"])


def _as_float(value: Any) -> float:
    return float(value or 0)


@router.post("/score")
def run_scoring(db: Session = Depends(get_db_session)) -> dict:
    """
    The real ML scoring is executed by the ml_service scripts.
    This endpoint only confirms that scores are available in PostgreSQL.
    """
    try:
        row = db.execute(
            text(
                """
                SELECT COUNT(*) AS count
                FROM ml_event_score
                """
            )
        ).mappings().first()

        count = int(row["count"] or 0)

        return {
            "status": "ok",
            "message": f"ML scores disponibles dans PostgreSQL: {count} lignes.",
        }
    except SQLAlchemyError as exc:
        return {
            "status": "error",
            "message": f"Impossible de lire ml_event_score: {exc}",
        }


@router.get("/anomalies")
def get_anomalies(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db_session),
) -> list[dict]:
    """
    Return sequence-level anomalies from ml_event_score.

    ml_event_score stores one row per base_event_id, but the frontend needs
    one row per sequence_uid. Therefore we aggregate by sequence_uid.
    """
    try:
        rows = db.execute(
            text(
                """
                WITH sequence_scores AS (
                    SELECT
                        s.sequence_uid,
                        MAX(s.model_name) AS model_name,
                        MAX(s.model_version) AS model_version,
                        MAX(s.anomaly_score) AS anomaly_score,
                        CASE
                            WHEN MAX(s.anomaly_score) >= 0.70 THEN 'anomalous'
                            WHEN MAX(s.anomaly_score) >= 0.30 THEN 'suspicious'
                            ELSE 'normal'
                        END AS anomaly_label,
                        MIN(e.event_timestamp) AS start_timestamp,
                        MAX(e.event_timestamp) AS end_timestamp,
                        MIN(e.application_key) AS application_key,
                        MIN(e.component_name) AS component_name,
                        COUNT(*) AS event_count
                    FROM ml_event_score s
                    JOIN base_event e ON e.id = s.base_event_id
                    GROUP BY s.sequence_uid
                )
                SELECT
                    sequence_uid,
                    application_key,
                    component_name,
                    COALESCE(start_timestamp::text, '-') AS start_timestamp,
                    COALESCE(end_timestamp::text, '-') AS end_timestamp,
                    anomaly_score,
                    anomaly_label,
                    model_name,
                    model_version,
                    event_count
                FROM sequence_scores
                ORDER BY anomaly_score DESC, end_timestamp DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        ).mappings().all()
    except SQLAlchemyError:
        return []

    return [
        {
            **dict(row),
            "anomaly_score": _as_float(row["anomaly_score"]),
        }
        for row in rows
    ]


@router.get("/model-comparison")
def get_model_comparison(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db_session),
) -> list[dict]:
    """
    Return model comparison rows for the frontend.

    Current PostgreSQL table stores the final ensemble score. Individual
    model scores are mirrored for frontend compatibility.
    """
    try:
        rows = db.execute(
            text(
                """
                WITH sequence_scores AS (
                    SELECT
                        s.sequence_uid,
                        MAX(s.model_name) AS model_name,
                        MAX(s.model_version) AS model_version,
                        MAX(s.anomaly_score) AS final_anomaly_score,
                        CASE
                            WHEN MAX(s.anomaly_score) >= 0.70 THEN 'anomalous'
                            WHEN MAX(s.anomaly_score) >= 0.30 THEN 'suspicious'
                            ELSE 'normal'
                        END AS final_anomaly_label,
                        MIN(e.application_key) AS application_key,
                        MIN(e.component_name) AS component_name,
                        MIN(e.event_timestamp) AS start_timestamp,
                        MAX(e.event_timestamp) AS end_timestamp,
                        COUNT(*) AS event_count
                    FROM ml_event_score s
                    JOIN base_event e ON e.id = s.base_event_id
                    GROUP BY s.sequence_uid
                )
                SELECT
                    sequence_uid,
                    application_key,
                    component_name,
                    COALESCE(start_timestamp::text, '-') AS start_timestamp,
                    COALESCE(end_timestamp::text, '-') AS end_timestamp,
                    final_anomaly_score,
                    final_anomaly_label,
                    model_name,
                    model_version,
                    event_count
                FROM sequence_scores
                ORDER BY final_anomaly_score DESC, end_timestamp DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        ).mappings().all()
    except SQLAlchemyError:
        return []

    return [
        {
            **dict(row),
            "iforest_anomaly_score": _as_float(row["final_anomaly_score"]),
            "kmeans_anomaly_score": _as_float(row["final_anomaly_score"]),
            "logbert_like_score": _as_float(row["final_anomaly_score"]),
            "final_anomaly_score": _as_float(row["final_anomaly_score"]),
        }
        for row in rows
    ]
