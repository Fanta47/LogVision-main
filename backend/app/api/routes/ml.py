from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

<<<<<<< HEAD
=======
from app.core.config import get_settings
>>>>>>> 494bacd (Save workspace snapshot)
from app.db.session import get_db_session

router = APIRouter(prefix="/api/ml", tags=["ml"])


def _as_float(value: Any) -> float:
    return float(value or 0)


<<<<<<< HEAD
=======
def _active_model() -> tuple[str, str]:
    settings = get_settings()
    return settings.ml_model_name, settings.ml_model_version


>>>>>>> 494bacd (Save workspace snapshot)
@router.get("/anomalies")
def get_anomalies(
    limit: int = Query(default=100, ge=1, le=5000),
    db: Session = Depends(get_db_session),
) -> list[dict]:
<<<<<<< HEAD
=======
    model_name, model_version = _active_model()
>>>>>>> 494bacd (Save workspace snapshot)
    rows = db.execute(
        text(
            """
            SELECT
                sequence_uid,
                application_key,
                component_name,
                start_timestamp,
                end_timestamp,
                logbert_like_score,
                final_anomaly_score,
                final_anomaly_label,
                model_name,
                model_version,
                array_length(string_to_array(event_ids, ','), 1) AS event_count
            FROM ml_sequence_score
<<<<<<< HEAD
            WHERE model_name = 'logbert_like_primary'
              AND model_version = 'v4'
=======
            WHERE model_name = :model_name
              AND model_version = :model_version
>>>>>>> 494bacd (Save workspace snapshot)
              AND final_anomaly_label IN ('anomalous', 'suspicious')
            ORDER BY final_anomaly_score DESC, end_timestamp DESC
            LIMIT :limit
            """
        ),
<<<<<<< HEAD
        {"limit": limit},
=======
        {"limit": limit, "model_name": model_name, "model_version": model_version},
>>>>>>> 494bacd (Save workspace snapshot)
    ).mappings().all()

    return [
        {
            "sequence_uid": row["sequence_uid"],
            "application_key": row["application_key"],
            "component_name": row["component_name"],
            "start_timestamp": row["start_timestamp"],
            "end_timestamp": row["end_timestamp"],
            "anomaly_score": _as_float(row["final_anomaly_score"]),
            "anomaly_label": row["final_anomaly_label"],
            "model_name": row["model_name"],
            "model_version": row["model_version"],
            "event_count": row["event_count"],
        }
        for row in rows
    ]


@router.get("/model-comparison")
def get_model_comparison(
    limit: int = Query(default=12000, ge=1, le=12000),
    application_key: str | None = Query(default=None),
    component_name: str | None = Query(default=None),
    final_anomaly_label: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> list[dict]:
<<<<<<< HEAD
    where_clauses = [
        "model_name = 'logbert_like_primary'",
        "model_version = 'v4'",
    ]

    params: dict[str, Any] = {"limit": limit}
=======
    model_name, model_version = _active_model()
    where_clauses = [
        "model_name = :model_name",
        "model_version = :model_version",
    ]

    params: dict[str, Any] = {
        "limit": limit,
        "model_name": model_name,
        "model_version": model_version,
    }
>>>>>>> 494bacd (Save workspace snapshot)

    if application_key and application_key != "all":
        where_clauses.append("application_key = :application_key")
        params["application_key"] = application_key

    if component_name and component_name != "all":
        where_clauses.append("component_name = :component_name")
        params["component_name"] = component_name

    if final_anomaly_label and final_anomaly_label != "all":
        where_clauses.append("final_anomaly_label = :final_anomaly_label")
        params["final_anomaly_label"] = final_anomaly_label

    where_sql = " AND ".join(where_clauses)

    rows = db.execute(
        text(
            f"""
            SELECT
                sequence_uid,
                application_key,
                component_name,
                start_timestamp,
                end_timestamp,
                iforest_baseline_score,
                knn_baseline_score,
                logbert_like_score,
                final_anomaly_score,
                final_anomaly_label,
                model_name,
                model_version,
                array_length(string_to_array(event_ids, ','), 1) AS event_count
            FROM ml_sequence_score
            WHERE {where_sql}
            ORDER BY final_anomaly_score DESC, end_timestamp DESC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()

    return [
        {
            **dict(row),
            "iforest_anomaly_score": row["iforest_baseline_score"] or 0,
            "kmeans_anomaly_score": 0,
            "knn_anomaly_score": row["knn_baseline_score"] or 0,
        }
        for row in rows
    ]


@router.get("/model-summary")
def get_model_summary(
    db: Session = Depends(get_db_session),
) -> dict:
<<<<<<< HEAD
    base_where = """
        WHERE model_name = 'logbert_like_primary'
          AND model_version = 'v4'
    """
=======
    model_name, model_version = _active_model()
    base_where = """
        WHERE model_name = :model_name
          AND model_version = :model_version
    """
    params = {"model_name": model_name, "model_version": model_version}
>>>>>>> 494bacd (Save workspace snapshot)

    total_row = db.execute(
        text(
            f"""
            SELECT
                COUNT(*) AS count,
                COALESCE(AVG(final_anomaly_score), 0) AS avg_score
            FROM ml_sequence_score
            {base_where}
            """
<<<<<<< HEAD
        )
=======
        ),
        params,
>>>>>>> 494bacd (Save workspace snapshot)
    ).mappings().one()

    by_label = db.execute(
        text(
            f"""
            SELECT
                final_anomaly_label,
                COUNT(*) AS count,
                COALESCE(AVG(final_anomaly_score), 0) AS avg_score
            FROM ml_sequence_score
            {base_where}
            GROUP BY final_anomaly_label
            ORDER BY COUNT(*) DESC
            """
<<<<<<< HEAD
        )
=======
        ),
        params,
>>>>>>> 494bacd (Save workspace snapshot)
    ).mappings().all()

    by_application = db.execute(
        text(
            f"""
            SELECT
                application_key,
                COUNT(*) AS count,
                COALESCE(AVG(final_anomaly_score), 0) AS avg_score
            FROM ml_sequence_score
            {base_where}
            GROUP BY application_key
            ORDER BY application_key
            """
<<<<<<< HEAD
        )
=======
        ),
        params,
>>>>>>> 494bacd (Save workspace snapshot)
    ).mappings().all()

    by_component = db.execute(
        text(
            f"""
            SELECT
                application_key,
                component_name,
                COUNT(*) AS count,
                COALESCE(AVG(final_anomaly_score), 0) AS avg_score
            FROM ml_sequence_score
            {base_where}
            GROUP BY application_key, component_name
            ORDER BY COUNT(*) DESC
            """
<<<<<<< HEAD
        )
=======
        ),
        params,
>>>>>>> 494bacd (Save workspace snapshot)
    ).mappings().all()

    by_application_label = db.execute(
        text(
            f"""
            SELECT
                application_key,
                final_anomaly_label,
                COUNT(*) AS count,
                COALESCE(AVG(final_anomaly_score), 0) AS avg_score
            FROM ml_sequence_score
            {base_where}
            GROUP BY application_key, final_anomaly_label
            ORDER BY application_key, final_anomaly_label
            """
<<<<<<< HEAD
        )
=======
        ),
        params,
>>>>>>> 494bacd (Save workspace snapshot)
    ).mappings().all()

    by_component_label = db.execute(
        text(
            f"""
            SELECT
                application_key,
                component_name,
                final_anomaly_label,
                COUNT(*) AS count,
                COALESCE(AVG(final_anomaly_score), 0) AS avg_score
            FROM ml_sequence_score
            {base_where}
            GROUP BY application_key, component_name, final_anomaly_label
            ORDER BY application_key, component_name, final_anomaly_label
            """
<<<<<<< HEAD
        )
    ).mappings().all()

    return {
=======
        ),
        params,
    ).mappings().all()

    return {
        "model_name": model_name,
        "model_version": model_version,
>>>>>>> 494bacd (Save workspace snapshot)
        "total": total_row["count"],
        "avg_score": float(total_row["avg_score"]),
        "by_label": [dict(row) for row in by_label],
        "by_application": [dict(row) for row in by_application],
        "by_component": [dict(row) for row in by_component],
        "by_application_label": [dict(row) for row in by_application_label],
        "by_component_label": [dict(row) for row in by_component_label],
    }


<<<<<<< HEAD
=======
@router.get("/risk/applications")
def get_application_risk(
    db: Session = Depends(get_db_session),
) -> list[dict]:
    model_name, model_version = _active_model()
    rows = db.execute(
        text(
            """
            SELECT
                application_key,
                COUNT(*) AS scored_sequences,
                COUNT(*) FILTER (WHERE final_anomaly_label IN ('anomalous', 'suspicious')) AS anomalies,
                MAX(final_anomaly_score) AS max_score
            FROM ml_sequence_score
            WHERE model_name = :model_name
              AND model_version = :model_version
            GROUP BY application_key
            ORDER BY anomalies DESC, max_score DESC
            """
        ),
        {"model_name": model_name, "model_version": model_version},
    ).mappings().all()

    def status(score: float) -> str:
        if score >= 0.7:
            return "critical"
        if score >= 0.3:
            return "warning"
        return "stable"

    return [
        {
            "name": row["application_key"],
            "application_key": row["application_key"],
            "risk": round(float(row["max_score"] or 0) * 100),
            "status": status(float(row["max_score"] or 0)),
            "anomalies": int(row["anomalies"] or 0),
            "scored_sequences": int(row["scored_sequences"] or 0),
        }
        for row in rows
    ]


>>>>>>> 494bacd (Save workspace snapshot)
@router.get("/status")
def get_ml_status(
    db: Session = Depends(get_db_session),
) -> dict:
<<<<<<< HEAD
=======
    settings = get_settings()
    model_name, model_version = settings.ml_model_name, settings.ml_model_version
>>>>>>> 494bacd (Save workspace snapshot)
    try:
        row = db.execute(
            text(
                """
                SELECT COUNT(*) AS count
                FROM ml_sequence_score
<<<<<<< HEAD
                WHERE model_name = 'logbert_like_primary'
                  AND model_version = 'v4'
                """
            )
        ).mappings().one()

        return {
            "status": "ok",
            "model_name": "logbert_like_primary",
            "model_version": "v4",
            "sequence_scores": row["count"],
=======
                WHERE model_name = :model_name
                  AND model_version = :model_version
                """
            ),
            {"model_name": model_name, "model_version": model_version},
        ).mappings().one()

        registry = db.execute(
            text(
                """
                SELECT model_type, artifact_path, metrics_json, created_at
                FROM ml_model_registry
                WHERE model_name = :model_name
                  AND model_version = :model_version
                """
            ),
            {"model_name": model_name, "model_version": model_version},
        ).mappings().first()

        return {
            "status": "ok",
            "model_name": model_name,
            "model_version": model_version,
            "artifact_path": registry["artifact_path"] if registry else settings.ml_model_artifact_path,
            "score_status": "loaded" if row["count"] else "waiting_for_postgres_scores",
            "sequence_scores": row["count"],
            "registry": dict(registry) if registry else None,
>>>>>>> 494bacd (Save workspace snapshot)
        }

    except SQLAlchemyError as exc:
        return {
            "status": "error",
<<<<<<< HEAD
=======
            "model_name": model_name,
            "model_version": model_version,
>>>>>>> 494bacd (Save workspace snapshot)
            "message": f"Unable to read ml_sequence_score: {exc}",
        }


@router.post("/run-scoring")
def run_ml_scoring() -> dict:
<<<<<<< HEAD
    return {
        "status": "disabled",
        "message": "Scoring is executed offline. The full Kaggle V4 result has already been imported into PostgreSQL.",
    }
=======
    settings = get_settings()
    return {
        "status": "disabled",
        "model_name": settings.ml_model_name,
        "model_version": settings.ml_model_version,
        "message": "Runtime scoring must be run by the ML scoring worker/service so real sequence scores are written to PostgreSQL.",
    }
>>>>>>> 494bacd (Save workspace snapshot)
