import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv


load_dotenv()

PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "55432")
PG_DB = os.getenv("POSTGRES_DB", "logs")
PG_USER = os.getenv("POSTGRES_USER", "logs_user")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "logs_pass")

CSV_PATH = Path(os.getenv("LOGBERT_V4_CSV", "outputs/logbert_like_scores_v4_full.csv"))
MODEL_NAME = os.getenv("LOGBERT_MODEL_NAME", "logbert_like_primary")
MODEL_VERSION = os.getenv("LOGBERT_MODEL_VERSION", "v4")


CREATE_TABLE_SQL = """
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

CREATE TABLE IF NOT EXISTS ml_model_registry (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(120) NOT NULL,
    model_version VARCHAR(60) NOT NULL,
    model_type VARCHAR(120),
    artifact_path TEXT,
    metrics_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(model_name, model_version)
);
"""


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"Missing CSV: {CSV_PATH}")

    dsn = (
        f"host={PG_HOST} port={PG_PORT} dbname={PG_DB} "
        f"user={PG_USER} password={PG_PASSWORD}"
    )

    print(f"Importing {CSV_PATH} into ml_sequence_score as {MODEL_NAME}/{MODEL_VERSION}")

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            cur.execute(
                """
                CREATE TEMP TABLE tmp_logbert_v4_scores (
                    sequence_uid TEXT,
                    application_key TEXT,
                    component_name TEXT,
                    start_timestamp TEXT,
                    end_timestamp TEXT,
                    event_ids TEXT,
                    logbert_like_score TEXT,
                    logbert_like_label TEXT,
                    base_v2_score TEXT,
                    risk_signal TEXT,
                    sla_not_found_count TEXT,
                    error_count TEXT,
                    transition_ratio TEXT,
                    rare_ratio TEXT,
                    base_v3_score TEXT,
                    calibrated_base_score TEXT,
                    rank_score TEXT,
                    final_anomaly_label TEXT
                ) ON COMMIT DROP;
                """
            )

            with CSV_PATH.open("r", encoding="utf-8", newline="") as csv_file:
                cur.copy_expert(
                    """
                    COPY tmp_logbert_v4_scores
                    FROM STDIN
                    WITH (FORMAT CSV, HEADER TRUE)
                    """,
                    csv_file,
                )

            cur.execute(
                """
                DELETE FROM ml_sequence_score
                WHERE model_name = %s
                  AND model_version = %s;
                """,
                (MODEL_NAME, MODEL_VERSION),
            )

            cur.execute(
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
                SELECT
                    sequence_uid,
                    LOWER(application_key),
                    LOWER(component_name),
                    NULLIF(start_timestamp, '')::TIMESTAMPTZ,
                    NULLIF(end_timestamp, '')::TIMESTAMPTZ,
                    event_ids,
                    0,
                    0,
                    COALESCE(NULLIF(logbert_like_score, '')::NUMERIC, 0),
                    NULLIF(logbert_like_label, ''),
                    COALESCE(
                        NULLIF(rank_score, '')::NUMERIC,
                        NULLIF(logbert_like_score, '')::NUMERIC,
                        0
                    ),
                    COALESCE(NULLIF(final_anomaly_label, ''), NULLIF(logbert_like_label, ''), 'normal'),
                    %s,
                    %s
                FROM tmp_logbert_v4_scores
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
                (MODEL_NAME, MODEL_VERSION),
            )

            inserted = cur.rowcount
            cur.execute(
                """
                INSERT INTO ml_model_registry(model_name, model_version, model_type, artifact_path, metrics_json)
                VALUES (%s, %s, 'logbert_like_sequence_scorer', %s, NULL)
                ON CONFLICT (model_name, model_version) DO UPDATE SET
                    artifact_path = EXCLUDED.artifact_path;
                """,
                (MODEL_NAME, MODEL_VERSION, str(CSV_PATH)),
            )

        conn.commit()

    print(f"Imported sequence scores: {inserted}")


if __name__ == "__main__":
    main()
