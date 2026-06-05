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


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS ml_log_sequence (
    id BIGSERIAL PRIMARY KEY,
    sequence_uid VARCHAR(128) UNIQUE NOT NULL,
    application_key VARCHAR(100) NOT NULL,
    component_name VARCHAR(150) NOT NULL,
    start_timestamp TIMESTAMPTZ,
    end_timestamp TIMESTAMPTZ,
    event_ids TEXT NOT NULL,
    error_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    sla_not_found_count INT DEFAULT 0,
    sql_query_count INT DEFAULT 0,
    unique_event_type_count INT DEFAULT 0,
    duration_ms BIGINT DEFAULT 0,
    final_anomaly_score NUMERIC(10,6),
    final_anomaly_label VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_event_score (
    id BIGSERIAL PRIMARY KEY,
    base_event_id BIGINT,
    event_uid VARCHAR(128),
    sequence_uid VARCHAR(128),
    model_name VARCHAR(120) NOT NULL,
    model_version VARCHAR(60) NOT NULL,
    anomaly_score NUMERIC(10,6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


TEMP_TABLE_SQL = """
CREATE TEMP TABLE tmp_logbert_v4_full (
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


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"Missing CSV: {CSV_PATH}")

    dsn = (
        f"host={PG_HOST} port={PG_PORT} dbname={PG_DB} "
        f"user={PG_USER} password={PG_PASSWORD}"
    )

    print(f"Importing {CSV_PATH} into ml_log_sequence and ml_event_score")
    print(f"Model: {MODEL_NAME}/{MODEL_VERSION}")

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
            cur.execute(TEMP_TABLE_SQL)

            with CSV_PATH.open("r", encoding="utf-8", newline="") as csv_file:
                cur.copy_expert(
                    """
                    COPY tmp_logbert_v4_full
                    FROM STDIN
                    WITH (FORMAT CSV, HEADER TRUE)
                    """,
                    csv_file,
                )

            cur.execute("SELECT COUNT(*) FROM tmp_logbert_v4_full;")
            sequence_count = cur.fetchone()[0]
            print(f"Loaded temp sequences: {sequence_count}")

            cur.execute(
                """
                INSERT INTO ml_log_sequence (
                    sequence_uid,
                    application_key,
                    component_name,
                    start_timestamp,
                    end_timestamp,
                    event_ids,
                    error_count,
                    warning_count,
                    sla_not_found_count,
                    sql_query_count,
                    unique_event_type_count,
                    duration_ms,
                    final_anomaly_score,
                    final_anomaly_label,
                    updated_at
                )
                SELECT
                    sequence_uid,
                    LOWER(COALESCE(NULLIF(application_key, ''), 'unknown_app')),
                    LOWER(COALESCE(NULLIF(component_name, ''), 'unknown_component')),
                    NULLIF(start_timestamp, '')::TIMESTAMPTZ,
                    NULLIF(end_timestamp, '')::TIMESTAMPTZ,
                    COALESCE(event_ids, ''),
                    COALESCE(NULLIF(error_count, '')::INT, 0),
                    0,
                    COALESCE(NULLIF(sla_not_found_count, '')::INT, 0),
                    0,
                    0,
                    COALESCE(
                        (
                            EXTRACT(
                                EPOCH FROM (
                                    NULLIF(end_timestamp, '')::TIMESTAMPTZ
                                    - NULLIF(start_timestamp, '')::TIMESTAMPTZ
                                )
                            ) * 1000
                        )::BIGINT,
                        0
                    ),
                    COALESCE(NULLIF(rank_score, '')::NUMERIC, NULLIF(logbert_like_score, '')::NUMERIC, 0),
                    COALESCE(NULLIF(final_anomaly_label, ''), NULLIF(logbert_like_label, ''), 'normal'),
                    NOW()
                FROM tmp_logbert_v4_full
                ON CONFLICT (sequence_uid) DO UPDATE SET
                    application_key = EXCLUDED.application_key,
                    component_name = EXCLUDED.component_name,
                    start_timestamp = EXCLUDED.start_timestamp,
                    end_timestamp = EXCLUDED.end_timestamp,
                    event_ids = EXCLUDED.event_ids,
                    error_count = EXCLUDED.error_count,
                    warning_count = EXCLUDED.warning_count,
                    sla_not_found_count = EXCLUDED.sla_not_found_count,
                    sql_query_count = EXCLUDED.sql_query_count,
                    unique_event_type_count = EXCLUDED.unique_event_type_count,
                    duration_ms = EXCLUDED.duration_ms,
                    final_anomaly_score = EXCLUDED.final_anomaly_score,
                    final_anomaly_label = EXCLUDED.final_anomaly_label,
                    updated_at = NOW();
                """
            )
            print(f"Upserted ml_log_sequence rows: {cur.rowcount}")

            cur.execute(
                """
                DELETE FROM ml_event_score
                WHERE model_name = %s
                  AND model_version = %s;
                """,
                (MODEL_NAME, MODEL_VERSION),
            )
            deleted_event_scores = cur.rowcount
            print(f"Deleted existing ml_event_score rows: {deleted_event_scores}")

            cur.execute(
                """
                INSERT INTO ml_event_score (
                    base_event_id,
                    event_uid,
                    sequence_uid,
                    model_name,
                    model_version,
                    anomaly_score
                )
                SELECT
                    ids.base_event_id,
                    be.event_uid,
                    t.sequence_uid,
                    %s,
                    %s,
                    COALESCE(NULLIF(t.rank_score, '')::NUMERIC, NULLIF(t.logbert_like_score, '')::NUMERIC, 0)
                FROM tmp_logbert_v4_full t
                CROSS JOIN LATERAL (
                    SELECT trim(event_id_text)::BIGINT AS base_event_id
                    FROM unnest(string_to_array(COALESCE(t.event_ids, ''), ',')) AS event_id_text
                    WHERE trim(event_id_text) ~ '^[0-9]+$'
                ) ids
                LEFT JOIN base_event be
                    ON be.id = ids.base_event_id;
                """,
                (MODEL_NAME, MODEL_VERSION),
            )
            print(f"Inserted ml_event_score rows: {cur.rowcount}")

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_ml_log_sequence_app_component
                ON ml_log_sequence(application_key, component_name);

                CREATE INDEX IF NOT EXISTS idx_ml_log_sequence_label
                ON ml_log_sequence(final_anomaly_label);

                CREATE INDEX IF NOT EXISTS idx_ml_event_score_base_event_id
                ON ml_event_score(base_event_id);

                CREATE INDEX IF NOT EXISTS idx_ml_event_score_sequence_uid
                ON ml_event_score(sequence_uid);

                CREATE INDEX IF NOT EXISTS idx_ml_event_score_model
                ON ml_event_score(model_name, model_version);
                """
            )

            cur.execute(
                """
                INSERT INTO ml_model_registry(model_name, model_version, model_type, artifact_path, metrics_json)
                VALUES (%s, %s, 'logbert_like_event_and_sequence_scorer', %s, NULL)
                ON CONFLICT (model_name, model_version) DO UPDATE SET
                    model_type = EXCLUDED.model_type,
                    artifact_path = EXCLUDED.artifact_path;
                """,
                (MODEL_NAME, MODEL_VERSION, str(CSV_PATH)),
            )

        conn.commit()

    print("Import complete")


if __name__ == "__main__":
    main()
