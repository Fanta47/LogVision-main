import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("POSTGRES_HOST", "localhost")
PORT = os.getenv("POSTGRES_PORT", "55432")
DB = os.getenv("POSTGRES_DB", "logs")
USER = os.getenv("POSTGRES_USER", "logs_user")
PASSWORD = os.getenv("POSTGRES_PASSWORD", "logs_pass")

CSV_PATH = "outputs/model_comparison.csv"

MODEL_NAME = "ensemble_logbert_like"
MODEL_VERSION = "v1"

dsn = f"host={HOST} port={PORT} dbname={DB} user={USER} password={PASSWORD}"

if not os.path.exists(CSV_PATH):
    raise SystemExit(f"Missing file: {CSV_PATH}")

df = pd.read_csv(CSV_PATH)

required = [
    "sequence_uid",
    "event_ids",
    "final_anomaly_score",
    "final_anomaly_label",
]

missing = [c for c in required if c not in df.columns]
if missing:
    raise SystemExit(f"Missing columns in {CSV_PATH}: {missing}")

rows = []

for _, r in df.iterrows():
    sequence_uid = str(r["sequence_uid"])
    anomaly_score = float(r["final_anomaly_score"])
    anomaly_label = str(r["final_anomaly_label"])

    event_ids_raw = str(r["event_ids"])

    for eid in event_ids_raw.split(","):
        eid = eid.strip()

        if not eid:
            continue

        try:
            base_event_id = int(eid)
        except ValueError:
            print(f"Skipping invalid event id: {eid}")
            continue

        rows.append(
            (
                base_event_id,
                sequence_uid,
                MODEL_NAME,
                MODEL_VERSION,
                anomaly_score,
                anomaly_label,
            )
        )

print(f"Prepared rows for PostgreSQL: {len(rows)}")

with psycopg2.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ml_event_score (
                id BIGSERIAL PRIMARY KEY,
                base_event_id BIGINT NOT NULL,
                sequence_uid TEXT NOT NULL,
                model_name TEXT NOT NULL,
                model_version TEXT NOT NULL,
                anomaly_score DOUBLE PRECISION NOT NULL,
                anomaly_label TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ml_event_score_base_event_id
            ON ml_event_score(base_event_id);
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ml_event_score_sequence_uid
            ON ml_event_score(sequence_uid);
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ml_event_score_model
            ON ml_event_score(model_name, model_version);
            """
        )

        # Nettoyer l'ancien run du même modèle pour éviter les doublons.
        cur.execute(
            """
            DELETE FROM ml_event_score
            WHERE model_name = %s
              AND model_version = %s;
            """,
            (MODEL_NAME, MODEL_VERSION),
        )

        execute_batch(
            cur,
            """
            INSERT INTO ml_event_score(
                base_event_id,
                sequence_uid,
                model_name,
                model_version,
                anomaly_score,
                anomaly_label
            )
            VALUES (%s, %s, %s, %s, %s, %s);
            """,
            rows,
            page_size=1000,
        )

    conn.commit()

print("Scores written to PostgreSQL")
print(f"Inserted rows: {len(rows)}")
