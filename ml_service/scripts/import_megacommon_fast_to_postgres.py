import os
import hashlib
from datetime import datetime, timezone
from typing import Any, Optional

import psycopg2
from psycopg2.extras import execute_batch
from elasticsearch import Elasticsearch, helpers


ES_URL = os.getenv("ES_URL", "https://localhost:9211")
ES_USER = os.getenv("ES_USER", "elastic")
ES_PASSWORD = os.getenv("ES_PASSWORD", "changeme123")
ES_VERIFY_CERTS = os.getenv("ES_VERIFY_CERTS", "false").lower() == "true"
ES_INDEX = os.getenv("ES_INDEX", "lvlogs-megacommon-*")

PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "55432")
PG_DB = os.getenv("POSTGRES_DB", "logs")
PG_USER = os.getenv("POSTGRES_USER", "logs_user")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "logs_pass")

BATCH_SIZE = int(os.getenv("IMPORT_BATCH_SIZE", "1000"))


def stable_hash(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def parse_ts(value: Any) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if not value:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)

    s = str(value).strip()

    if s.endswith("Z"):
        s = s[:-1] + "+00:00"

    if "." in s:
        prefix, suffix = s.split(".", 1)
        if "+" in suffix:
            frac, tz = suffix.split("+", 1)
            s = f"{prefix}.{frac[:6]}+{tz}"
        else:
            s = f"{prefix}.{suffix[:6]}"

    try:
        dt = datetime.fromisoformat(s)
    except Exception:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


def normalize_details(text: Optional[str]) -> str:
    if not text:
        return ""
    return " ".join(str(text).replace("\r", "\n").split())


def build_event_uid(src: dict, es_id: str) -> str:
    parts = [
        str(src.get("@timestamp", "")),
        str(src.get("application_key", "")),
        str(src.get("component_name", "")),
        str(src.get("log_family", "")),
        str(src.get("event_type", "")),
        str(src.get("source_path", "")),
        str(src.get("stored_file_name", "")),
        str(src.get("details", "") or src.get("message", "") or src.get("event", {}).get("original", "")),
        str(es_id),
    ]
    return stable_hash("|".join(parts))


def to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except Exception:
        return None


def make_row(hit: dict) -> tuple:
    es_id = hit["_id"]
    src = hit["_source"]

    app = str(src.get("application_key") or "megacommon").lower()
    component = str(src.get("component_name") or "unknown").lower()

    details = (
        src.get("details")
        or src.get("message")
        or src.get("event", {}).get("original")
        or ""
    )

    normalized = normalize_details(details)
    event_uid = build_event_uid(src, es_id)
    details_hash = stable_hash(normalized)

    ts = parse_ts(src.get("@timestamp"))

    source_doc_id = event_uid

    return (
        event_uid,
        es_id,
        source_doc_id,
        src.get("upload_uid"),
        ts,
        app,
        component,
        app,
        component,
        src.get("parse_status") or "parsed",
        to_float(src.get("parse_confidence")),
        src.get("platform"),
        src.get("environment"),
        src.get("scope"),
        src.get("log_level"),
        src.get("log_family") or "generic_application",
        src.get("event_type") or "info",
        src.get("thread_name"),
        details,
        normalized,
        details_hash,
        src.get("source_path") or src.get("log", {}).get("file", {}).get("path"),
        src.get("stored_file_name"),
        src.get("original_file_name"),
    )


def main():
    es = Elasticsearch(
        ES_URL,
        basic_auth=(ES_USER, ES_PASSWORD),
        verify_certs=ES_VERIFY_CERTS,
        request_timeout=120,
    )

    dsn = (
        f"host={PG_HOST} port={PG_PORT} dbname={PG_DB} "
        f"user={PG_USER} password={PG_PASSWORD}"
    )

    query = {
        "query": {
            "term": {
                "application_key": "megacommon"
            }
        },
        
    }

    print(f"Importing MegaCommon from {ES_INDEX} to PostgreSQL base_event...")

    total_seen = 0
    total_insert_attempts = 0

    insert_sql = """
        INSERT INTO base_event(
            event_uid,
            es_id,
            source_doc_id,
            upload_uid,
            event_timestamp,
            application_key,
            component_name,
            application_name,
            application_group,
            parse_status,
            parse_confidence,
            platform,
            environment,
            scope,
            log_level,
            log_family,
            event_type,
            thread_name,
            details,
            normalized_details,
            details_hash,
            source_path,
            stored_file_name,
            original_file_name,
            created_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (event_uid) DO NOTHING;
    """

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_base_event_event_uid
                ON base_event(event_uid);
                """
            )
            conn.commit()

            batch = []

            for hit in helpers.scan(
                es,
                index=ES_INDEX,
                query=query,
                size=BATCH_SIZE,
                preserve_order=False,
                scroll="10m",
            ):
                total_seen += 1
                batch.append(make_row(hit))

                if len(batch) >= BATCH_SIZE:
                    execute_batch(cur, insert_sql, batch, page_size=500)
                    conn.commit()
                    total_insert_attempts += len(batch)
                    print(f"Processed {total_seen} ES docs...")
                    batch = []

            if batch:
                execute_batch(cur, insert_sql, batch, page_size=500)
                conn.commit()
                total_insert_attempts += len(batch)

    print("Done.")
    print(f"ES docs seen: {total_seen}")
    print(f"Insert attempts: {total_insert_attempts}")


if __name__ == "__main__":
    main()

