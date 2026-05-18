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

INDEX_NAME = os.getenv("ES_ML_INDEX", "logvision-ml-anomalies-v1")
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
                "anomaly_label": {"type": "keyword"},
                "anomaly_score": {"type": "float"},
                "event_count": {"type": "integer"},
                "start_timestamp": {"type": "date"},
                "end_timestamp": {"type": "date"},
                "log_families": {"type": "keyword"},
                "event_types": {"type": "keyword"},
                "sla_found_count": {"type": "integer"},
                "sla_not_found_count": {"type": "integer"},
                "technical_error_count": {"type": "integer"},
                "persistence_event_count": {"type": "integer"},
                "event_ids": {"type": "keyword"},
                "details_preview": {"type": "text"},
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
            s.sequence_uid,
            MIN(e.application_key) AS application_key,
            MIN(e.component_name) AS component_name,
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
            COUNT(*) AS event_count,
            ARRAY_AGG(e.id ORDER BY e.event_timestamp, e.id) AS event_ids,
            ARRAY_AGG(DISTINCT e.log_family) AS log_families,
            ARRAY_AGG(DISTINCT e.event_type) AS event_types,
            SUM(CASE WHEN e.event_type = 'sla_found' THEN 1 ELSE 0 END) AS sla_found_count,
            SUM(CASE WHEN e.event_type = 'sla_not_found' THEN 1 ELSE 0 END) AS sla_not_found_count,
            SUM(CASE WHEN e.event_type = 'technical_error' THEN 1 ELSE 0 END) AS technical_error_count,
            SUM(CASE WHEN e.log_family = 'persistence' THEN 1 ELSE 0 END) AS persistence_event_count,
            LEFT(STRING_AGG(COALESCE(e.details, ''), ' || ' ORDER BY e.event_timestamp, e.id), 1000) AS details_preview
        FROM ml_event_score s
        JOIN base_event e ON e.id = s.base_event_id
        GROUP BY s.sequence_uid
        ORDER BY MAX(s.anomaly_score) DESC;
    """

    with psycopg2.connect(dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query)
            while True:
                rows = cur.fetchmany(BATCH_SIZE)
                if not rows:
                    break
                yield rows


def to_es_action(row: dict) -> dict:
    sequence_uid = row["sequence_uid"]

    doc = {
        "sequence_uid": sequence_uid,
        "application_key": row["application_key"],
        "component_name": row["component_name"],
        "model_name": row["model_name"],
        "model_version": row["model_version"],
        "anomaly_score": float(row["anomaly_score"] or 0),
        "anomaly_label": row["anomaly_label"],
        "start_timestamp": row["start_timestamp"].isoformat() if row["start_timestamp"] else None,
        "end_timestamp": row["end_timestamp"].isoformat() if row["end_timestamp"] else None,
        "event_count": int(row["event_count"] or 0),
        "event_ids": [str(x) for x in row["event_ids"]] if row["event_ids"] else [],
        "log_families": row["log_families"] or [],
        "event_types": row["event_types"] or [],
        "sla_found_count": int(row["sla_found_count"] or 0),
        "sla_not_found_count": int(row["sla_not_found_count"] or 0),
        "technical_error_count": int(row["technical_error_count"] or 0),
        "persistence_event_count": int(row["persistence_event_count"] or 0),
        "details_preview": row["details_preview"] or "",
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
