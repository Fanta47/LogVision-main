<<<<<<< HEAD
﻿import os
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor
from elasticsearch import Elasticsearch, helpers
=======
import os
import time
from datetime import datetime

import psycopg2
from elasticsearch import Elasticsearch, helpers
from psycopg2.extras import RealDictCursor
>>>>>>> 494bacd (Save workspace snapshot)


PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "55432")
PG_DB = os.getenv("POSTGRES_DB", "logs")
PG_USER = os.getenv("POSTGRES_USER", "logs_user")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "logs_pass")

<<<<<<< HEAD
ES_URL = os.getenv("ES_URL", "https://localhost:9211")
ES_USER = os.getenv("ES_USER", "elastic")
ES_PASSWORD = os.getenv("ES_PASSWORD", "changeme123")
ES_VERIFY_CERTS = os.getenv("ES_VERIFY_CERTS", "false").lower() == "true"

INDEX_NAME = os.getenv("ES_ML_INDEX", "logvision-ml-scores-v4")
BATCH_SIZE = int(os.getenv("EXPORT_BATCH_SIZE", "1000"))
=======
ES_URLS_RAW = os.getenv("ES_URLS", os.getenv("ES_URL", "https://localhost:9211"))
ES_URLS = [url.strip() for url in ES_URLS_RAW.split(",") if url.strip()]
ES_USER = os.getenv("ES_USERNAME", os.getenv("ES_USER", "elastic"))
ES_PASSWORD = os.getenv("ES_PASSWORD", os.getenv("ELASTIC_PASSWORD", "changeme123"))
ES_CA_CERT = os.getenv("ES_CA_CERT", "").strip()
ES_VERIFY_CERTS = os.getenv("ES_VERIFY_CERTS", "false").lower() in ("1", "true", "yes")

INDEX_NAME = os.getenv("ES_ML_INDEX", "logvision-ml-scores")
BATCH_SIZE = int(os.getenv("EXPORT_BATCH_SIZE", "1000"))
MODEL_NAME = os.getenv("LOGBERT_MODEL_NAME", "logbert_like_distilbert_iforest")
MODEL_VERSION = os.getenv("LOGBERT_MODEL_VERSION", "logbert_v1_full")
POLL_SECONDS = int(os.getenv("EXPORT_POLL_SECONDS", "60"))
EXPORT_ONCE = os.getenv("EXPORT_ONCE", "false").lower() in ("1", "true", "yes")
>>>>>>> 494bacd (Save workspace snapshot)


def create_index_if_missing(es: Elasticsearch) -> None:
    if es.indices.exists(index=INDEX_NAME):
<<<<<<< HEAD
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
=======
        print(f"Index already exists: {INDEX_NAME}", flush=True)
        return

    mapping = {
        "settings": {
            "number_of_replicas": 0,
        },
        "mappings": {
            "properties": {
                "@timestamp": {"type": "date"},
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
                "score_created_at": {"type": "date"},
>>>>>>> 494bacd (Save workspace snapshot)
                "exported_at": {"type": "date"},
            }
        }
    }

    es.indices.create(index=INDEX_NAME, body=mapping)
<<<<<<< HEAD
    print(f"Created index: {INDEX_NAME}")
=======
    print(f"Created index: {INDEX_NAME}", flush=True)
>>>>>>> 494bacd (Save workspace snapshot)


def fetch_sequence_scores():
    dsn = (
        f"host={PG_HOST} port={PG_PORT} dbname={PG_DB} "
        f"user={PG_USER} password={PG_PASSWORD}"
    )

    query = """
        SELECT
<<<<<<< HEAD
=======
            id,
>>>>>>> 494bacd (Save workspace snapshot)
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
<<<<<<< HEAD
            array_length(string_to_array(event_ids, ','), 1) AS event_count
        FROM ml_sequence_score
        WHERE model_name = 'logbert_like_primary'
          AND model_version = 'v4'
        ORDER BY final_anomaly_score DESC, end_timestamp DESC;
    """

    with psycopg2.connect(dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query)
=======
            created_at,
            array_length(string_to_array(event_ids, ','), 1) AS event_count
        FROM ml_sequence_score
        WHERE model_name = %s
          AND model_version = %s
        ORDER BY id ASC;
    """

    with psycopg2.connect(dsn) as conn:
        with conn.cursor(
            name="ml_score_export_cursor",
            cursor_factory=RealDictCursor,
        ) as cur:
            cur.itersize = BATCH_SIZE
            cur.execute(query, (MODEL_NAME, MODEL_VERSION))
>>>>>>> 494bacd (Save workspace snapshot)
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
<<<<<<< HEAD

    event_ids_raw = str(row.get("event_ids") or "")
    event_ids = [x.strip() for x in event_ids_raw.split(",") if x.strip()]

    final_score = to_float(row["final_anomaly_score"])
    final_label = row["final_anomaly_label"]
=======
    model_name = row["model_name"]
    model_version = row["model_version"]

    event_ids_raw = str(row.get("event_ids") or "")
    event_ids = [item.strip() for item in event_ids_raw.split(",") if item.strip()]

    final_score = to_float(row["final_anomaly_score"])
    final_label = row["final_anomaly_label"]
    start_timestamp = to_iso(row["start_timestamp"])
    end_timestamp = to_iso(row["end_timestamp"])
>>>>>>> 494bacd (Save workspace snapshot)

    doc = {
        "sequence_uid": sequence_uid,
        "application_key": row["application_key"],
        "component_name": row["component_name"],
<<<<<<< HEAD

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
=======
        "model_name": model_name,
        "model_version": model_version,
        "primary_model": f"{model_name}/{model_version}",
        "anomaly_score": final_score,
        "anomaly_label": final_label,
        "final_anomaly_score": final_score,
        "final_anomaly_label": final_label,
        "logbert_like_score": to_float(row["logbert_like_score"]),
        "iforest_baseline_score": to_float(row["iforest_baseline_score"]),
        "knn_baseline_score": to_float(row["knn_baseline_score"]),
        "event_count": int(row["event_count"] or len(event_ids)),
        "event_ids": event_ids,
        "start_timestamp": start_timestamp,
        "end_timestamp": end_timestamp,
        "score_created_at": to_iso(row["created_at"]),
        "@timestamp": end_timestamp or start_timestamp or datetime.utcnow().isoformat(),
>>>>>>> 494bacd (Save workspace snapshot)
        "exported_at": datetime.utcnow().isoformat(),
    }

    return {
        "_op_type": "index",
        "_index": INDEX_NAME,
<<<<<<< HEAD
        "_id": sequence_uid,
=======
        "_id": f"{sequence_uid}:{model_name}:{model_version}",
>>>>>>> 494bacd (Save workspace snapshot)
        "_source": doc,
    }


<<<<<<< HEAD
def main():
    es = Elasticsearch(
        ES_URL,
        basic_auth=(ES_USER, ES_PASSWORD),
        verify_certs=ES_VERIFY_CERTS,
        request_timeout=120,
    )

    print(es.info())
    create_index_if_missing(es)

=======
def make_es_client() -> Elasticsearch:
    kwargs = {
        "basic_auth": (ES_USER, ES_PASSWORD),
        "request_timeout": 120,
        "retry_on_timeout": True,
        "max_retries": 3,
    }

    if ES_CA_CERT:
        kwargs["ca_certs"] = ES_CA_CERT
        kwargs["verify_certs"] = True
    else:
        kwargs["verify_certs"] = ES_VERIFY_CERTS

    return Elasticsearch(ES_URLS, **kwargs)


def export_once(es: Elasticsearch) -> int:
    create_index_if_missing(es)
>>>>>>> 494bacd (Save workspace snapshot)
    total = 0

    for rows in fetch_sequence_scores():
        actions = [to_es_action(row) for row in rows]
        ok, errors = helpers.bulk(es, actions, raise_on_error=False)
        total += ok
<<<<<<< HEAD
        print(f"Exported batch: {ok} docs, total={total}")

        if errors:
            print(f"Errors in batch: {len(errors)}")
            print(errors[:3])

    es.indices.refresh(index=INDEX_NAME)
    print(f"Done. Exported {total} sequence documents to {INDEX_NAME}")
=======
        print(f"Exported batch: {ok} docs, total={total}", flush=True)

        if errors:
            print(f"Errors in batch: {len(errors)}", flush=True)
            print(errors[:3], flush=True)

    es.indices.refresh(index=INDEX_NAME)
    print(f"Done. Exported {total} sequence documents to {INDEX_NAME}", flush=True)
    return total


def main():
    es = make_es_client()
    print(es.info(), flush=True)

    while True:
        try:
            export_once(es)
        except Exception as exc:
            print(f"ML score export failed: {type(exc).__name__}: {exc}", flush=True)

        if EXPORT_ONCE:
            break

        time.sleep(POLL_SECONDS)
>>>>>>> 494bacd (Save workspace snapshot)


if __name__ == "__main__":
    main()
