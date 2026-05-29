import os
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor
from elasticsearch import Elasticsearch, helpers


PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "55432")
PG_DB = os.getenv("POSTGRES_DB", "logs")
PG_USER = os.getenv("POSTGRES_USER", "logs_user")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "logs_pass")

ES_URL = os.getenv("ES_URL", "https://localhost:9211")
ES_USER = os.getenv("ES_USER", "elastic")
ES_PASSWORD = os.getenv("ES_PASSWORD", "changeme123")
ES_VERIFY_CERTS = os.getenv("ES_VERIFY_CERTS", "false").lower() == "true"

INDEX_NAME = os.getenv("ES_ML_INDEX", "logvision-ml-scores-v4")
BATCH_SIZE = int(os.getenv("EXPORT_BATCH_SIZE", "1000"))


def create_index_if_missing(es: Elasticsearch) -> None:
    if es.indices.exists(index=INDEX_NAME):
        print(f"Index already exists: {INDEX_NAME}")
        return

    mapping = {
        "mappings": {
            "properties": {
                "sequence_uid": {"type": "keyword"},
                "application_key": {"type": "keyword"},
                "component_name": {"type": "keyword"},

                "model_name": {"type": "keyword"},
                "model_version": {"type": "keyword"},
                "primary_model": {"type": "keyword"},

                "anomaly_label": {"type": "keyword"},
                "anomaly_score": {"type": "float"},

                "final_anomaly_label": {"type": "keyword"},
                "final_anomaly_score": {"type": "float"},

                "logbert_like_score": {"type": "float"},
                "iforest_baseline_score": {"type": "float"},
                "knn_baseline_score": {"type": "float"},

                "event_count": {"type": "integer"},
                "event_ids": {"type": "keyword"},

                "start_timestamp": {"type": "date"},
                "end_timestamp": {"type": "date"},
                "exported_at": {"type": "date"},
            }
        }
    }

    es.indices.create(index=INDEX_NAME, body=mapping)
    print(f"Created index: {INDEX_NAME}")


def fetch_sequence_scores():
    dsn = (
        f"host={PG_HOST} port={PG_PORT} dbname={PG_DB} "
        f"user={PG_USER} password={PG_PASSWORD}"
    )

    query = """
        SELECT
            sequence_uid,
            application_key,
            component_name,
            start_timestamp,
            end_timestamp,
            event_ids,
            iforest_baseline_score,
            knn_baseline_score,
            logbert_like_score,
            final_anomaly_score,
            final_anomaly_label,
            model_name,
            model_version,
            array_length(string_to_array(event_ids, ','), 1) AS event_count
        FROM ml_sequence_score
        WHERE model_name = 'logbert_like_primary'
          AND model_version = 'v4'
        ORDER BY final_anomaly_score DESC, end_timestamp DESC;
    """

    with psycopg2.connect(dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query)
            while True:
                rows = cur.fetchmany(BATCH_SIZE)
                if not rows:
                    break
                yield rows


def to_iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def to_float(value):
    return float(value or 0)


def to_es_action(row: dict) -> dict:
    sequence_uid = row["sequence_uid"]

    event_ids_raw = str(row.get("event_ids") or "")
    event_ids = [x.strip() for x in event_ids_raw.split(",") if x.strip()]

    final_score = to_float(row["final_anomaly_score"])
    final_label = row["final_anomaly_label"]

    doc = {
        "sequence_uid": sequence_uid,
        "application_key": row["application_key"],
        "component_name": row["component_name"],

        "model_name": row["model_name"],
        "model_version": row["model_version"],
        "primary_model": "logbert_like_v4",

        "anomaly_score": final_score,
        "anomaly_label": final_label,

        "final_anomaly_score": final_score,
        "final_anomaly_label": final_label,

        "logbert_like_score": to_float(row["logbert_like_score"]),
        "iforest_baseline_score": to_float(row["iforest_baseline_score"]),
        "knn_baseline_score": to_float(row["knn_baseline_score"]),

        "event_count": int(row["event_count"] or len(event_ids)),
        "event_ids": event_ids,

        "start_timestamp": to_iso(row["start_timestamp"]),
        "end_timestamp": to_iso(row["end_timestamp"]),
        "exported_at": datetime.utcnow().isoformat(),
    }

    return {
        "_op_type": "index",
        "_index": INDEX_NAME,
        "_id": sequence_uid,
        "_source": doc,
    }


def main():
    es = Elasticsearch(
        ES_URL,
        basic_auth=(ES_USER, ES_PASSWORD),
        verify_certs=ES_VERIFY_CERTS,
        request_timeout=120,
    )

    print(es.info())
    create_index_if_missing(es)

    total = 0

    for rows in fetch_sequence_scores():
        actions = [to_es_action(row) for row in rows]
        ok, errors = helpers.bulk(es, actions, raise_on_error=False)
        total += ok
        print(f"Exported batch: {ok} docs, total={total}")

        if errors:
            print(f"Errors in batch: {len(errors)}")
            print(errors[:3])

    es.indices.refresh(index=INDEX_NAME)
    print(f"Done. Exported {total} sequence documents to {INDEX_NAME}")


if __name__ == "__main__":
    main()
