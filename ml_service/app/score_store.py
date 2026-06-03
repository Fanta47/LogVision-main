from __future__ import annotations

from typing import Iterable, Sequence

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

from .config import settings


CREATE_SCORE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS ml_sequence_score (
    id BIGSERIAL PRIMARY KEY,
    sequence_uid VARCHAR(128) NOT NULL,
    application_key VARCHAR(100) NOT NULL,
    component_name VARCHAR(150) NOT NULL,
    start_timestamp TIMESTAMPTZ,
    end_timestamp TIMESTAMPTZ,
    event_ids TEXT NOT NULL,
    iforest_baseline_score NUMERIC(10,6) DEFAULT 0,
    knn_baseline_score NUMERIC(10,6) DEFAULT 0,
    logbert_like_score NUMERIC(10,6) NOT NULL,
    logbert_like_label VARCHAR(32),
    final_anomaly_score NUMERIC(10,6) NOT NULL,
    final_anomaly_label VARCHAR(32) NOT NULL,
    model_name VARCHAR(120) NOT NULL,
    model_version VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sequence_uid, model_name, model_version)
);

CREATE INDEX IF NOT EXISTS idx_ml_sequence_score_model
ON ml_sequence_score(model_name, model_version);

CREATE INDEX IF NOT EXISTS idx_ml_sequence_score_label
ON ml_sequence_score(model_name, model_version, final_anomaly_label);

CREATE INDEX IF NOT EXISTS idx_ml_sequence_score_app_component
ON ml_sequence_score(application_key, component_name);

CREATE TABLE IF NOT EXISTS ml_inference_score (
    id BIGSERIAL PRIMARY KEY,
    run_uid VARCHAR(128) NOT NULL,
    sequence_index INTEGER NOT NULL,
    anomaly_score NUMERIC(10,6) NOT NULL,
    anomaly_label VARCHAR(32) NOT NULL,
    model_name VARCHAR(120) NOT NULL,
    model_version VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(run_uid, sequence_index, model_name, model_version)
);

CREATE INDEX IF NOT EXISTS idx_ml_inference_score_model
ON ml_inference_score(model_name, model_version);
"""


def _dsn() -> str:
    return (
        f"host={settings.PG_HOST} port={settings.PG_PORT} dbname={settings.PG_DB} "
        f"user={settings.PG_USER} password={settings.PG_PASSWORD}"
    )


def label_score(score: float, suspicious_threshold: float = 0.75, anomalous_threshold: float = 0.9) -> str:
    if score >= anomalous_threshold:
        return "anomalous"
    if score >= suspicious_threshold:
        return "suspicious"
    return "normal"


def ensure_score_tables() -> None:
    with psycopg2.connect(_dsn()) as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_SCORE_TABLES_SQL)
        conn.commit()


def write_raw_inference_scores(
    scores: Sequence[float],
    *,
    run_uid: str,
    model_name: str,
    model_version: str,
) -> int:
    rows = [
        (run_uid, idx, float(score), label_score(float(score)), model_name, model_version)
        for idx, score in enumerate(scores)
    ]
    if not rows:
        return 0

    with psycopg2.connect(_dsn()) as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_SCORE_TABLES_SQL)
            execute_batch(
                cur,
                """
                INSERT INTO ml_inference_score(
                    run_uid,
                    sequence_index,
                    anomaly_score,
                    anomaly_label,
                    model_name,
                    model_version
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (run_uid, sequence_index, model_name, model_version)
                DO UPDATE SET
                    anomaly_score = EXCLUDED.anomaly_score,
                    anomaly_label = EXCLUDED.anomaly_label,
                    created_at = NOW();
                """,
                rows,
                page_size=1000,
            )
        conn.commit()
    return len(rows)


def write_sequence_scores(
    rows: Iterable[dict],
    *,
    model_name: str,
    model_version: str,
    replace_existing: bool = False,
) -> int:
    prepared = []
    for row in rows:
        score = float(row.get("final_anomaly_score", row.get("logbert_like_score", 0)) or 0)
        label = str(row.get("final_anomaly_label") or row.get("logbert_like_label") or label_score(score))
        prepared.append(
            (
                str(row["sequence_uid"]),
                str(row.get("application_key") or "unknown_app").lower(),
                str(row.get("component_name") or "unknown_component").lower(),
                row.get("start_timestamp"),
                row.get("end_timestamp"),
                str(row.get("event_ids") or ""),
                float(row.get("iforest_baseline_score") or 0),
                float(row.get("knn_baseline_score") or 0),
                float(row.get("logbert_like_score") or score),
                row.get("logbert_like_label"),
                score,
                label,
                model_name,
                model_version,
            )
        )

    if not prepared:
        return 0

    with psycopg2.connect(_dsn()) as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_SCORE_TABLES_SQL)
            if replace_existing:
                cur.execute(
                    """
                    DELETE FROM ml_sequence_score
                    WHERE model_name = %s
                      AND model_version = %s;
                    """,
                    (model_name, model_version),
                )
            execute_batch(
                cur,
                """
                INSERT INTO ml_sequence_score (
                    sequence_uid,
                    application_key,
                    component_name,
                    start_timestamp,
                    end_timestamp,
                    event_ids,
                    iforest_baseline_score,
                    knn_baseline_score,
                    logbert_like_score,
                    logbert_like_label,
                    final_anomaly_score,
                    final_anomaly_label,
                    model_name,
                    model_version
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (sequence_uid, model_name, model_version) DO UPDATE SET
                    application_key = EXCLUDED.application_key,
                    component_name = EXCLUDED.component_name,
                    start_timestamp = EXCLUDED.start_timestamp,
                    end_timestamp = EXCLUDED.end_timestamp,
                    event_ids = EXCLUDED.event_ids,
                    iforest_baseline_score = EXCLUDED.iforest_baseline_score,
                    knn_baseline_score = EXCLUDED.knn_baseline_score,
                    logbert_like_score = EXCLUDED.logbert_like_score,
                    logbert_like_label = EXCLUDED.logbert_like_label,
                    final_anomaly_score = EXCLUDED.final_anomaly_score,
                    final_anomaly_label = EXCLUDED.final_anomaly_label;
                """,
                prepared,
                page_size=1000,
            )
        conn.commit()
    return len(prepared)


def write_scores_with_metadata(
    scores: Sequence[float],
    metadata_path: str,
    *,
    model_name: str,
    model_version: str,
    replace_existing: bool = False,
) -> int:
    metadata = pd.read_csv(metadata_path)
    if len(metadata) != len(scores):
        raise ValueError(f"Metadata rows ({len(metadata)}) do not match score count ({len(scores)})")

    metadata = metadata.copy()
    metadata["logbert_like_score"] = [float(score) for score in scores]
    metadata["final_anomaly_score"] = metadata["logbert_like_score"]
    metadata["final_anomaly_label"] = metadata["final_anomaly_score"].apply(label_score)
    if "logbert_like_label" not in metadata.columns:
        metadata["logbert_like_label"] = metadata["final_anomaly_label"]

    required = {"sequence_uid", "application_key", "component_name", "start_timestamp", "end_timestamp", "event_ids"}
    missing = sorted(required - set(metadata.columns))
    if missing:
        raise ValueError(f"Metadata file is missing columns required for ml_sequence_score: {missing}")

    return write_sequence_scores(
        metadata.to_dict("records"),
        model_name=model_name,
        model_version=model_version,
        replace_existing=replace_existing,
    )
