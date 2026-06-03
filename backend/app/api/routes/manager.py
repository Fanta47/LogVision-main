from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db_session

router = APIRouter(prefix="/api/manager", tags=["manager"])


def _range_interval(value: str) -> str:
    return {
        "1h": "1 hour",
        "24h": "24 hours",
        "7d": "7 days",
        "30d": "30 days",
    }.get(value, "24 hours")


def _model_params() -> dict[str, str]:
    settings = get_settings()
    return {
        "model_name": settings.ml_model_name,
        "model_version": settings.ml_model_version,
    }


def _severity(score: float, label: str | None) -> str:
    if label == "anomalous" or score >= 0.7:
        return "critical"
    if label == "suspicious" or score >= 0.3:
        return "warning"
    return "info"


def _row_to_anomaly(row: Any) -> dict:
    score = float(row["final_anomaly_score"] or 0)
    label = row["final_anomaly_label"] or "normal"
    return {
        "sequence_uid": row["sequence_uid"],
        "application_key": row["application_key"],
        "component_name": row["component_name"],
        "start_timestamp": row["start_timestamp"],
        "end_timestamp": row["end_timestamp"],
        "event_ids": row["event_ids"],
        "event_count": row["event_count"] or 0,
        "logbert_like_score": float(row["logbert_like_score"] or 0),
        "logbert_like_label": row["logbert_like_label"],
        "iforest_baseline_score": float(row["iforest_baseline_score"] or 0),
        "knn_baseline_score": float(row["knn_baseline_score"] or 0),
        "anomaly_score": score,
        "final_anomaly_score": score,
        "anomaly_label": label,
        "final_anomaly_label": label,
        "severity": _severity(score, label),
        "model_name": row["model_name"],
        "model_version": row["model_version"],
    }


@router.get("/overview")
def overview(
    range: str = Query(default="24h"),
    application_key: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> dict:
    params = {**_model_params(), "interval": _range_interval(range), "app": application_key}
    app_sql = " AND application_key = :app" if application_key and application_key != "all" else ""

    log_row = db.execute(
        text(
            f"""
            SELECT
                COUNT(*) AS total_logs,
                COUNT(DISTINCT application_key) AS applications,
                COUNT(DISTINCT component_name) AS components,
                MAX(event_timestamp) AS last_event_timestamp,
                MAX(ingested_at) AS last_ingestion_timestamp
            FROM base_event
            WHERE event_timestamp >= NOW() - CAST(:interval AS INTERVAL)
            {app_sql}
            """
        ),
        params,
    ).mappings().one()

    all_log_row = db.execute(
        text(
            f"""
            SELECT
                COUNT(*) AS total_logs,
                COUNT(DISTINCT application_key) AS applications,
                COUNT(DISTINCT component_name) AS components,
                MAX(event_timestamp) AS last_event_timestamp,
                MAX(ingested_at) AS last_ingestion_timestamp
            FROM base_event
            {"WHERE application_key = :app" if application_key and application_key != 'all' else ""}
            """
        ),
        params
    ).mappings().one()

    score_row = db.execute(
        text(
            f"""
            SELECT
                COUNT(*) AS total_scores,
                COUNT(*) FILTER (WHERE final_anomaly_label IN ('anomalous', 'suspicious')) AS anomalies,
                COUNT(*) FILTER (WHERE final_anomaly_label = 'anomalous') AS critical
            FROM ml_sequence_score
            WHERE model_name = :model_name
              AND model_version = :model_version
              AND COALESCE(end_timestamp, start_timestamp, created_at) >= NOW() - CAST(:interval AS INTERVAL)
              {app_sql}
            """
        ),
        params,
    ).mappings().one()

    all_score_row = db.execute(
        text(
            f"""
            SELECT
                COUNT(*) AS total_scores,
                COUNT(*) FILTER (WHERE final_anomaly_label IN ('anomalous', 'suspicious')) AS anomalies,
                COUNT(*) FILTER (WHERE final_anomaly_label = 'anomalous') AS critical
            FROM ml_sequence_score
            WHERE model_name = :model_name
              AND model_version = :model_version
              {"AND application_key = :app" if application_key and application_key != 'all' else ""}
            """
        ),
        params,
    ).mappings().one()

    active_logs = int(log_row["total_logs"] or 0)
    logs = log_row if active_logs else all_log_row
    scores = score_row if int(score_row["total_scores"] or 0) else all_score_row
    anomalies = int(scores["anomalies"] or 0)
    critical = int(scores["critical"] or 0)
    total_scores = int(scores["total_scores"] or 0)
    stability = round(max(0, 100 - (anomalies / max(total_scores, 1) * 100)), 1)

    return {
        "range": range,
        "totalLogs": int(logs["total_logs"] or 0),
        "total_logs": int(logs["total_logs"] or 0),
        "totalAnomalies": anomalies,
        "total_anomalies": anomalies,
        "criticalAlerts": critical,
        "critical_alerts": critical,
        "openIncidents": critical,
        "open_incidents": critical,
        "monitoredApps": int(logs["applications"] or 0),
        "applications_monitored": int(logs["applications"] or 0),
        "componentsMonitored": int(logs["components"] or 0),
        "components_monitored": int(logs["components"] or 0),
        "lastIngestionTimestamp": logs["last_ingestion_timestamp"] or logs["last_event_timestamp"],
        "systemHealth": "Degraded" if critical else "Healthy",
        "system_health": "degraded" if critical else "healthy",
        "stabilityScore": stability,
        "crashRisk": min(100, round((critical / max(total_scores, 1)) * 1000, 1)),
        "mttr": "N/A",
        "activeEngineers": "0/0",
        "ml_model": _model_params(),
    }


@router.get("/anomalies")
def anomalies(
    limit: int = Query(default=500, ge=1, le=5000),
    application_key: str | None = Query(default=None),
    component_name: str | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    label: str | None = Query(default=None),
    final_anomaly_label: str | None = Query(default=None),
    min_score: float | None = Query(default=None),
    max_score: float | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> dict:
    where = ["model_name = :model_name", "model_version = :model_version"]
    params: dict[str, Any] = {**_model_params(), "limit": limit}

    if application_key and application_key != "all":
        where.append("application_key = :application_key")
        params["application_key"] = application_key
    if component_name and component_name != "all":
        where.append("component_name = :component_name")
        params["component_name"] = component_name
    if start_date:
        where.append("COALESCE(end_timestamp, start_timestamp, created_at) >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where.append("COALESCE(end_timestamp, start_timestamp, created_at) <= :end_date")
        params["end_date"] = end_date
    selected_label = final_anomaly_label or label
    if selected_label and selected_label != "all":
        where.append("final_anomaly_label = :label")
        params["label"] = selected_label
    if min_score is not None:
        where.append("final_anomaly_score >= :min_score")
        params["min_score"] = min_score
    if max_score is not None:
        where.append("final_anomaly_score <= :max_score")
        params["max_score"] = max_score

    where_sql = " AND ".join(where)
    total = db.execute(
        text(f"SELECT COUNT(*) FROM ml_sequence_score WHERE {where_sql}"),
        params,
    ).scalar_one()
    rows = db.execute(
        text(
            f"""
            SELECT *,
                array_length(string_to_array(event_ids, ','), 1) AS event_count
            FROM ml_sequence_score
            WHERE {where_sql}
            ORDER BY final_anomaly_score DESC, COALESCE(end_timestamp, start_timestamp, created_at) DESC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()
    items = [_row_to_anomaly(row) for row in rows]
    return {
        "items": items,
        "total": total,
        "score_status": "loaded" if total else "waiting_for_postgres_scores",
        **_model_params(),
    }


@router.get("/alerts")
def alerts(
    limit: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db_session),
) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT *,
                array_length(string_to_array(event_ids, ','), 1) AS event_count
            FROM ml_sequence_score
            WHERE model_name = :model_name
              AND model_version = :model_version
              AND final_anomaly_label IN ('anomalous', 'suspicious')
            ORDER BY final_anomaly_score DESC, COALESCE(end_timestamp, start_timestamp, created_at) DESC
            LIMIT :limit
            """
        ),
        {**_model_params(), "limit": limit},
    ).mappings().all()
    data = [_row_to_anomaly(row) for row in rows]
    return [
        {
            "id": item["sequence_uid"],
            "title": f"{item['severity'].title()} anomaly in {item['component_name']}",
            "severity": item["severity"],
            "status": "open",
            "source": "ml_sequence_score",
            "application_key": item["application_key"],
            "component_name": item["component_name"],
            "created_at": item["end_timestamp"] or item["start_timestamp"],
            "linked_anomaly_sequence_uid": item["sequence_uid"],
            "anomaly_score": item["anomaly_score"],
        }
        for item in data
        if item["anomaly_label"] in ("anomalous", "suspicious")
    ]


@router.get("/incidents")
def incidents(
    limit: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db_session),
) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                application_key,
                component_name,
                COUNT(*) AS anomaly_count,
                MAX(final_anomaly_score) AS max_score,
                MIN(start_timestamp) AS first_seen,
                MAX(end_timestamp) AS last_seen,
                array_agg(sequence_uid ORDER BY final_anomaly_score DESC) AS sequences
            FROM ml_sequence_score
            WHERE model_name = :model_name
              AND model_version = :model_version
              AND final_anomaly_label IN ('anomalous', 'suspicious')
            GROUP BY application_key, component_name
            ORDER BY MAX(final_anomaly_score) DESC, COUNT(*) DESC
            LIMIT :limit
            """
        ),
        {**_model_params(), "limit": limit},
    ).mappings().all()
    return [
        {
            "id": f"{row['application_key']}:{row['component_name']}",
            "title": f"Anomaly cluster in {row['application_key']} / {row['component_name']}",
            "severity": _severity(float(row["max_score"] or 0), None),
            "status": "open",
            "owner": None,
            "application_key": row["application_key"],
            "component_name": row["component_name"],
            "related_alerts": (row["sequences"] or [])[:10],
            "related_anomaly_sequence": row["sequences"][0] if row["sequences"] else None,
            "anomaly_count": row["anomaly_count"],
            "max_score": float(row["max_score"] or 0),
            "created_at": row["first_seen"],
            "updated_at": row["last_seen"],
        }
        for row in rows
    ]


@router.get("/health/applications")
def application_health(db: Session = Depends(get_db_session)) -> list[dict]:
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
        _model_params(),
    ).mappings().all()
    return [
        {
            "name": row["application_key"],
            "application_key": row["application_key"],
            "risk": round((float(row["max_score"] or 0)) * 100),
            "status": _severity(float(row["max_score"] or 0), None),
            "anomalies": int(row["anomalies"] or 0),
            "scored_sequences": int(row["scored_sequences"] or 0),
        }
        for row in rows
    ]


@router.get("/predictions")
def predictions(
    limit: int = Query(default=100, ge=1, le=1000),
    application_key: str | None = Query(default=None),
    component_name: str | None = Query(default=None),
    label: str | None = Query(default=None),
    min_score: float | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> dict:
    where = ["model_name = :model_name", "model_version = :model_version"]
    params: dict[str, Any] = {**_model_params(), "limit": limit}

    if application_key and application_key != "all":
        where.append("application_key = :application_key")
        params["application_key"] = application_key
    if component_name and component_name != "all":
        where.append("component_name = :component_name")
        params["component_name"] = component_name
    if label and label != "all":
        where.append("final_anomaly_label = :label")
        params["label"] = label
    if min_score is not None:
        where.append("final_anomaly_score >= :min_score")
        params["min_score"] = min_score

    where_sql = " AND ".join(where)

    summary = db.execute(
        text(
            f"""
            SELECT
                COUNT(*) AS total_scores,
                COUNT(*) FILTER (WHERE final_anomaly_label = 'anomalous') AS anomalous,
                COUNT(*) FILTER (WHERE final_anomaly_label = 'suspicious') AS suspicious,
                COUNT(*) FILTER (WHERE final_anomaly_label = 'normal') AS normal,
                COALESCE(MAX(final_anomaly_score), 0) AS max_score,
                COALESCE(AVG(final_anomaly_score), 0) AS avg_score,
                COUNT(DISTINCT application_key) AS applications,
                COUNT(DISTINCT component_name) AS components
            FROM ml_sequence_score
            WHERE {where_sql}
            """
        ),
        params,
    ).mappings().one()

    rows = db.execute(
        text(
            f"""
            SELECT *,
                array_length(string_to_array(event_ids, ','), 1) AS event_count
            FROM ml_sequence_score
            WHERE {where_sql}
            ORDER BY final_anomaly_score DESC, COALESCE(end_timestamp, start_timestamp, created_at) DESC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()
    items = [_row_to_anomaly(row) for row in rows]
    return {
        "items": [
            {
                **item,
                "prediction": "incident_risk",
                "risk_probability": round(item["final_anomaly_score"] * 100, 1),
                "risk_window": "current_sequence",
                "drivers": [
                    f"label={item['final_anomaly_label']}",
                    f"logbert_score={item['logbert_like_score']:.4f}",
                    f"events={item['event_count']}",
                ],
            }
            for item in items
        ],
        "total": int(summary["total_scores"] or 0),
        "returned": len(items),
        "summary": {
            "total_scores": int(summary["total_scores"] or 0),
            "anomalous": int(summary["anomalous"] or 0),
            "suspicious": int(summary["suspicious"] or 0),
            "normal": int(summary["normal"] or 0),
            "max_score": float(summary["max_score"] or 0),
            "avg_score": float(summary["avg_score"] or 0),
            "applications": int(summary["applications"] or 0),
            "components": int(summary["components"] or 0),
        },
        "score_status": "loaded" if items else "waiting_for_postgres_scores",
        **_model_params(),
    }


@router.get("/team")
def team() -> list[dict]:
    return []


def _xlsx_response(filename: str, rows: list[dict], filters: dict[str, Any]) -> StreamingResponse:
    from openpyxl import Workbook

    def cell_value(value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, (list, tuple, dict)):
            return str(value)
        if not isinstance(value, (str, int, float, bool, type(None))):
            return str(value)
        return value

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Report"
    sheet.append(["Generated at", datetime.now(timezone.utc).isoformat()])
    sheet.append(["Filters", str(filters)])
    sheet.append([])

    if rows:
        headers = list(rows[0].keys())
        sheet.append(headers)
        for row in rows:
            sheet.append([cell_value(row.get(header)) for header in headers])
    else:
        sheet.append(["No data"])

    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reports/anomalies.xlsx")
def anomalies_report(db: Session = Depends(get_db_session)) -> StreamingResponse:
    rows = anomalies(
        limit=5000,
        application_key=None,
        component_name=None,
        label=None,
        final_anomaly_label=None,
        min_score=None,
        max_score=None,
        db=db,
    )["items"]
    return _xlsx_response("anomalies.xlsx", rows, _model_params())


@router.get("/reports/alerts.xlsx")
def alerts_report(db: Session = Depends(get_db_session)) -> StreamingResponse:
    return _xlsx_response("alerts.xlsx", alerts(limit=5000, db=db), _model_params())


@router.get("/reports/incidents.xlsx")
def incidents_report(db: Session = Depends(get_db_session)) -> StreamingResponse:
    return _xlsx_response("incidents.xlsx", incidents(limit=5000, db=db), _model_params())


@router.get("/reports/application-health.xlsx")
def health_report(db: Session = Depends(get_db_session)) -> StreamingResponse:
    return _xlsx_response("application-health.xlsx", application_health(db=db), _model_params())


@router.get("/reports/executive-summary.xlsx")
def executive_report(db: Session = Depends(get_db_session)) -> StreamingResponse:
    return _xlsx_response("executive-summary.xlsx", [overview(range="24h", db=db)], _model_params())


@router.patch("/alerts/{alert_id}")
def update_alert(alert_id: str) -> dict:
    return {"ok": True, "id": alert_id}


@router.post("/alerts/{alert_id}/incident")
def create_incident(alert_id: str) -> dict:
    return {"ok": True, "id": f"incident:{alert_id}", "alert_id": alert_id}


@router.patch("/incidents/{incident_id}")
def update_incident(incident_id: str) -> dict:
    return {"ok": True, "id": incident_id}


@router.patch("/incidents/{incident_id}/assign")
def assign_incident(incident_id: str) -> dict:
    return {"ok": True, "id": incident_id}


@router.get("/incidents/{incident_id}/notes")
def incident_notes(incident_id: str) -> list[dict]:
    return []


@router.post("/incidents/{incident_id}/notes")
def add_incident_note(incident_id: str) -> dict:
    return {"ok": True, "id": incident_id}
