import csv
import json
import os
import re
from pathlib import Path

import psycopg2
from dotenv import load_dotenv


load_dotenv()

PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "55432")
PG_DB = os.getenv("POSTGRES_DB", "logs")
PG_USER = os.getenv("POSTGRES_USER", "logs_user")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "logs_pass")

ML_SERVICE_DIR = Path(__file__).resolve().parents[1]
RUNTIME_DIR = Path(os.getenv("LOGBERT_RUNTIME_DIR", ML_SERVICE_DIR / "logbert_v1_full_runtime"))
CSV_PATH = Path(
    os.getenv(
        "LOGBERT_V1_FULL_CSV",
        RUNTIME_DIR / "outputs" / "logbert_v1_full_scores.csv",
    )
)
MODEL_CONFIG_PATH = RUNTIME_DIR / "model" / "model_config.json"
METADATA_PATH = RUNTIME_DIR / "metadata.json"

DEFAULT_MODEL_NAME = "logbert_like_distilbert_iforest"
DEFAULT_MODEL_VERSION = "logbert_v1_full"
FALLBACK_SCORE_FILENAMES = (
    "logbert_like_scores_v2_full.csv",
    "logbert_v1_full_scores.csv",
    "logbert_like_scores_v2.csv",
    "logbert_like_scores.csv",
)


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


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def load_model_identity() -> tuple[str, str, str, str]:
    model_config = load_json(MODEL_CONFIG_PATH)
    metadata = load_json(METADATA_PATH)
    model_name = os.getenv("LOGBERT_MODEL_NAME", model_config.get("model_name", DEFAULT_MODEL_NAME))
    model_version = os.getenv(
        "LOGBERT_MODEL_VERSION",
        model_config.get("model_version", DEFAULT_MODEL_VERSION),
    )
    model_type = model_config.get("model_type", metadata.get("artifact_type", "logbert_like_sequence_scorer"))
    metrics_json = json.dumps(
        {
            "metadata": metadata,
            "model_config": model_config,
        },
        ensure_ascii=True,
    )
    return model_name, model_version, model_type, metrics_json


def csv_columns(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.reader(csv_file)
        return next(reader)


def sql_identifier(name: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise SystemExit(f"Unsupported CSV column name: {name}")
    return name


def optional_numeric(columns: set[str], *names: str, default: str = "0") -> str:
    parts = [f"NULLIF({sql_identifier(name)}, '')::NUMERIC" for name in names if name in columns]
    return f"COALESCE({', '.join(parts)}, {default})" if parts else default


def optional_text(columns: set[str], *names: str, default: str = "'normal'") -> str:
    parts = [f"NULLIF({sql_identifier(name)}, '')" for name in names if name in columns]
    return f"COALESCE({', '.join(parts)}, {default})" if parts else default


def resolve_csv_path() -> Path:
    if CSV_PATH.exists():
        return CSV_PATH

    output_dir = RUNTIME_DIR / "outputs"
    for filename in FALLBACK_SCORE_FILENAMES:
        candidate = output_dir / filename
        if candidate.exists():
            return candidate

    candidates = sorted(
        output_dir.glob("*.csv"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if candidates:
        return candidates[0]

    return CSV_PATH


def main() -> None:
    model_name, model_version, model_type, metrics_json = load_model_identity()
    csv_path = resolve_csv_path()
    dsn = (
        f"host={PG_HOST} port={PG_PORT} dbname={PG_DB} "
        f"user={PG_USER} password={PG_PASSWORD}"
    )

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            cur.execute(
                """
                INSERT INTO ml_model_registry(model_name, model_version, model_type, artifact_path, metrics_json)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (model_name, model_version) DO UPDATE SET
                    model_type = EXCLUDED.model_type,
                    artifact_path = EXCLUDED.artifact_path,
                    metrics_json = EXCLUDED.metrics_json;
                """,
                (model_name, model_version, model_type, str(RUNTIME_DIR), metrics_json),
            )

            if not csv_path.exists():
                conn.commit()
                print(f"Registered {model_name}/{model_version}")
                print(f"Waiting for score CSV: {csv_path}")
                return

            columns = csv_columns(csv_path)
            column_set = set(columns)
            required_columns = {
                "sequence_uid",
                "application_key",
                "component_name",
                "start_timestamp",
                "end_timestamp",
                "event_ids",
                "logbert_like_score",
            }
            missing = sorted(required_columns - column_set)
            if missing:
                raise SystemExit(f"Missing required CSV columns in {csv_path}: {missing}")

            staging_columns_sql = ",\n                    ".join(f"{sql_identifier(column)} TEXT" for column in columns)
            copy_columns_sql = ", ".join(sql_identifier(column) for column in columns)
            cur.execute(f"CREATE TEMP TABLE tmp_logbert_v1_full_scores ({staging_columns_sql}) ON COMMIT DROP;")

            with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
                cur.copy_expert(
                    f"""
                    COPY tmp_logbert_v1_full_scores ({copy_columns_sql})
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
                (model_name, model_version),
            )

            cur.execute(
                f"""
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
                    {optional_numeric(column_set, "iforest_baseline_score", "iforest_raw", default="0")},
                    {optional_numeric(column_set, "knn_baseline_score", default="0")},
                    COALESCE(NULLIF(logbert_like_score, '')::NUMERIC, 0),
                    {optional_text(column_set, "logbert_like_label", default="NULL")},
                    {optional_numeric(column_set, "final_anomaly_score", "rank_score", "logbert_like_score", default="0")},
                    {optional_text(column_set, "final_anomaly_label", "logbert_like_label", default="'normal'")},
                    %s,
                    %s
                FROM tmp_logbert_v1_full_scores
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
                (model_name, model_version),
            )
            inserted = cur.rowcount

        conn.commit()

    print(f"Imported {inserted} sequence scores for {model_name}/{model_version}")


if __name__ == "__main__":
    main()
