import os
import time
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
from psycopg2.extras import execute_batch
from elasticsearch import Elasticsearch
from elasticsearch import BadRequestError


# ============================================================
# Environment / configuration
# ============================================================

ES_INDEX = os.getenv("ES_INDEX", "lvlogs-*")

ES_URLS_RAW = os.getenv("ES_URLS", os.getenv("ES_URL", "https://es01:9200"))
ES_URLS = [u.strip() for u in ES_URLS_RAW.split(",") if u.strip()]

ES_USERNAME = os.getenv("ES_USERNAME", os.getenv("ELASTIC_USERNAME", "elastic"))
ES_PASSWORD = os.getenv("ES_PASSWORD", os.getenv("ELASTIC_PASSWORD", "changeme123"))

# In your local Docker setup, Elasticsearch uses self-signed certs.
# If ES_CA_CERT is not provided, cert verification is disabled.
ES_CA_CERT = os.getenv("ES_CA_CERT", "").strip()
ES_VERIFY_CERTS = os.getenv("ES_VERIFY_CERTS", "false").lower() in ("1", "true", "yes")

PG_DSN = os.getenv(
    "PG_DSN",
    os.getenv("DATABASE_URL", "postgresql://logs_user:logs_pass@postgres:5432/logs"),
)

PIPELINE_NAME = os.getenv("PIPELINE_NAME", "es_to_pg")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "1000"))
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "10"))
FULL_SYNC_ON_START = os.getenv("FULL_SYNC_ON_START", "true").lower() in ("1", "true", "yes")


# ============================================================
# Utility functions
# ============================================================

def parse_ts(value: Any) -> datetime:
    """
    Parse Elasticsearch @timestamp into timezone-aware datetime.
    Handles:
    - 2026-05-16T16:01:09.845784156Z
    - 2026-05-16T16:01:09Z
    - Python datetime
    """
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if not value:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)

    s = str(value).strip()

    # Python datetime supports max 6 fractional digits.
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"

    # Trim nanoseconds to microseconds if necessary.
    if "." in s:
        prefix, suffix = s.split(".", 1)

        if "+" in suffix:
            frac, tz = suffix.split("+", 1)
            frac = frac[:6]
            s = f"{prefix}.{frac}+{tz}"
        elif "-" in suffix[1:]:
            # Rare timezone form in suffix, keep robust.
            frac = suffix[:6]
            rest = suffix[6:]
            s = f"{prefix}.{frac}{rest}"
        else:
            frac = suffix[:6]
            s = f"{prefix}.{frac}"

    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


def normalize_details(text: Optional[str]) -> str:
    """
    Simple normalization for ML/event-template preparation.
    Keep it conservative: do not destroy useful log structure.
    """
    if not text:
        return ""

    return " ".join(str(text).replace("\r", "\n").split())


def stable_hash(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def build_event_uid(src: Dict[str, Any], es_id: str = "") -> str:
    """
    Stable deterministic event id.

    Priority:
    1. Existing event_uid from Logstash, if present.
    2. Hash over useful event fields.
    3. ES _id as fallback component.

    This is used as:
    - base_event.event_uid
    - base_event.source_doc_id
    - sql_event.source_doc_id
    - sla_event linkage through base_event_id
    """
    existing = src.get("event_uid")
    if existing:
        return str(existing)

    parts = [
        str(src.get("@timestamp", "")),
        str(src.get("application_key", "")),
        str(src.get("log_family", "")),
        str(src.get("event_type", "")),
        str(src.get("source_path", "")),
        str(src.get("stored_file_name", "")),
        str(src.get("details", "") or src.get("message", "") or src.get("event", {}).get("original", "")),
        str(es_id or ""),
    ]

    raw = "|".join(parts)
    return stable_hash(raw)


def int_or_none(value: Any) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except Exception:
        return None


def numeric_or_none(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except Exception:
        return None


# ============================================================
# PostgreSQL schema helpers
# ============================================================

def ensure_schema(conn) -> None:
    """
    Keep this minimal and compatible with your existing schema.

    Important:
    - base_event already has source_doc_id primary key in your DB.
    - sql_event has source_doc_id NOT NULL and primary key.
    - The ETL needs unique constraints for ON CONFLICT.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS etl_watermark (
                pipeline_name TEXT PRIMARY KEY,
                last_event_timestamp TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01 00:00:00+00',
                last_source_doc_id TEXT NOT NULL DEFAULT '',
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_etl_watermark_pipeline_name
            ON etl_watermark(pipeline_name);
            """
        )

        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_base_event_event_uid
            ON base_event(event_uid);
            """
        )

        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sql_event_source_doc_id
            ON sql_event(source_doc_id);
            """
        )

        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sql_event_base_event_id
            ON sql_event(base_event_id);
            """
        )

        # sla_event exists in your current ETL flow.
        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sla_event_base_event_id
            ON sla_event(base_event_id);
            """
        )

    conn.commit()


def get_watermark(conn) -> Tuple[datetime, str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT last_event_timestamp, last_source_doc_id
            FROM etl_watermark
            WHERE pipeline_name = %s
            """,
            (PIPELINE_NAME,),
        )
        row = cur.fetchone()

    if not row:
        return datetime(1970, 1, 1, tzinfo=timezone.utc), ""

    ts, doc_id = row
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    return ts.astimezone(timezone.utc), doc_id or ""


def reset_watermark(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM etl_watermark
            WHERE pipeline_name = %s
            """,
            (PIPELINE_NAME,),
        )
    conn.commit()


def set_watermark(conn, ts: datetime, doc_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO etl_watermark(
                pipeline_name,
                last_event_timestamp,
                last_source_doc_id,
                updated_at
            )
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (pipeline_name) DO UPDATE
            SET last_event_timestamp = EXCLUDED.last_event_timestamp,
                last_source_doc_id = EXCLUDED.last_source_doc_id,
                updated_at = NOW()
            """,
            (PIPELINE_NAME, ts, doc_id or ""),
        )


# ============================================================
# Elasticsearch fetch
# ============================================================

def make_es_client() -> Elasticsearch:
    kwargs = {
        "basic_auth": (ES_USERNAME, ES_PASSWORD),
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


def fetch_batch(es: Elasticsearch, after: Optional[List[Any]], last_ts: datetime):
    query = {
        "size": BATCH_SIZE,
        "sort": [
            {
                "@timestamp": {
                    "order": "asc",
                    "format": "strict_date_optional_time_nanos",
                    "unmapped_type": "date",
                }
            },
            {"_doc": {"order": "asc"}},
        ],
        "query": {
            "range": {
                "@timestamp": {
                    "gte": last_ts.isoformat()
                }
            }
        },
    }

    if after:
        query["search_after"] = after

    try:
        return es.search(
            index=ES_INDEX,
            body=query,
            ignore_unavailable=True,
            allow_no_indices=True,
        )
    except BadRequestError as exc:
        print(
            f"ES search failed. index={ES_INDEX} sort={query['sort']} after={after} error={exc}",
            flush=True,
        )
        raise


# ============================================================
# Transformation + PostgreSQL upsert
# ============================================================

def extract_details(src: Dict[str, Any]) -> str:
    """
    Prefer parsed details, then message, then event.original.
    This avoids the old placeholder problem.
    """
    details = src.get("details")
    if details:
        return str(details)

    message = src.get("message")
    if message:
        return str(message)

    event_obj = src.get("event") or {}
    original = event_obj.get("original")
    if original:
        return str(original)

    return ""


def upsert_rows(conn, rows: List[Dict[str, Any]]) -> Tuple[datetime, str, int]:
    inserted = 0
    sql_rows = []
    sla_rows = []

    last_ts = datetime(1970, 1, 1, tzinfo=timezone.utc)
    last_id = ""

    with conn.cursor() as cur:
        for hit in rows:
            es_id = hit.get("_id", "")
            src = hit.get("_source", {}) or {}

            ts_raw = src.get("@timestamp")
            if not ts_raw:
                continue

            ts = parse_ts(ts_raw)

            app_key = src.get("application_key") or src.get("application_name") or "unknown_app"
            component = src.get("component_name") or src.get("application_group") or "unknown_component"
            log_family = src.get("log_family") or "unknown"
            event_type = src.get("event_type") or "unknown"
            parse_status = src.get("parse_status") or "ok"
            parse_confidence = str(src.get("parse_confidence") or "1.0")

            event_uid = build_event_uid(src, es_id=es_id)

            # Important:
            # Your PostgreSQL schema uses base_event.source_doc_id as primary key.
            # Use the same stable id everywhere.
            source_doc_id = event_uid

            details = extract_details(src)
            normalized = normalize_details(details)
            details_hash = stable_hash(details)

            source_path = src.get("source_path") or ((src.get("log") or {}).get("file") or {}).get("path")
            stored_file_name = src.get("stored_file_name")
            original_file_name = src.get("original_file_name") or stored_file_name

            cur.execute(
                """
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
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, NOW()
                )
                ON CONFLICT (event_uid) DO UPDATE
                SET es_id = EXCLUDED.es_id,
                    source_doc_id = EXCLUDED.source_doc_id,
                    upload_uid = COALESCE(base_event.upload_uid, EXCLUDED.upload_uid),
                    event_timestamp = EXCLUDED.event_timestamp,
                    application_key = EXCLUDED.application_key,
                    component_name = EXCLUDED.component_name,
                    application_name = COALESCE(base_event.application_name, EXCLUDED.application_name),
                    application_group = COALESCE(base_event.application_group, EXCLUDED.application_group),
                    parse_status = EXCLUDED.parse_status,
                    parse_confidence = EXCLUDED.parse_confidence,
                    platform = COALESCE(base_event.platform, EXCLUDED.platform),
                    environment = COALESCE(base_event.environment, EXCLUDED.environment),
                    scope = COALESCE(base_event.scope, EXCLUDED.scope),
                    log_level = COALESCE(base_event.log_level, EXCLUDED.log_level),
                    log_family = EXCLUDED.log_family,
                    event_type = EXCLUDED.event_type,
                    thread_name = COALESCE(base_event.thread_name, EXCLUDED.thread_name),
                    details = EXCLUDED.details,
                    normalized_details = EXCLUDED.normalized_details,
                    details_hash = EXCLUDED.details_hash,
                    source_path = COALESCE(base_event.source_path, EXCLUDED.source_path),
                    stored_file_name = COALESCE(base_event.stored_file_name, EXCLUDED.stored_file_name),
                    original_file_name = COALESCE(base_event.original_file_name, EXCLUDED.original_file_name)
                RETURNING id
                """,
                (
                    event_uid,
                    es_id,
                    source_doc_id,
                    src.get("upload_uid"),
                    ts,
                    app_key,
                    component,
                    app_key,
                    component,
                    parse_status,
                    parse_confidence,
                    src.get("platform"),
                    src.get("environment"),
                    src.get("scope"),
                    src.get("log_level"),
                    log_family,
                    event_type,
                    src.get("thread_name"),
                    details,
                    normalized,
                    details_hash,
                    source_path,
                    stored_file_name,
                    original_file_name,
                ),
            )

            row = cur.fetchone()
            if not row:
                continue

            base_event_id = row[0]
            inserted += 1

            if log_family == "persistence":
                sql_query = src.get("sql_query") or src.get("query_text") or ""
                normalized_sql_query = normalize_details(sql_query)
                qlen = len(sql_query) if sql_query else 0

                sql_rows.append(
                    (
                        source_doc_id,
                        base_event_id,
                        event_type,
                        sql_query,
                        normalized_sql_query,
                        src.get("table_name") or src.get("sql_table"),
                        int_or_none(src.get("result_size")),
                        src.get("data_source"),
                        qlen,
                        min(1.0, qlen / 2000.0),
                    )
                )

            elif log_family == "sla" or log_family == "megacustodyslalogger":
                sla_rows.append(
                    (
                        base_event_id,
                        src.get("caller_class"),
                        src.get("caller_method"),
                        int_or_none(src.get("caller_line")),
                        src.get("sla_class_name"),
                        src.get("context_raw"),
                        src.get("sla_status"),
                        src.get("sla_result_pk"),
                    )
                )

            if src.get("upload_uid"):
                cur.execute(
                    """
                    UPDATE log_upload
                    SET status = 'processed'
                    WHERE upload_uid = %s
                    """,
                    (src.get("upload_uid"),),
                )

            last_ts = ts
            last_id = es_id

        if sql_rows:
            execute_batch(
                cur,
                """
                INSERT INTO sql_event(
                    source_doc_id,
                    base_event_id,
                    sql_operation,
                    sql_query,
                    normalized_sql_query,
                    table_name,
                    result_size,
                    data_source,
                    query_length,
                    estimated_complexity_score
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (source_doc_id) DO UPDATE
                SET base_event_id = EXCLUDED.base_event_id,
                    sql_operation = EXCLUDED.sql_operation,
                    sql_query = EXCLUDED.sql_query,
                    normalized_sql_query = EXCLUDED.normalized_sql_query,
                    table_name = EXCLUDED.table_name,
                    result_size = EXCLUDED.result_size,
                    data_source = EXCLUDED.data_source,
                    query_length = EXCLUDED.query_length,
                    estimated_complexity_score = EXCLUDED.estimated_complexity_score
                """,
                sql_rows,
                page_size=200,
            )

        if sla_rows:
            execute_batch(
                cur,
                """
                INSERT INTO sla_event(
                    base_event_id,
                    caller_class,
                    caller_method,
                    caller_line,
                    sla_class_name,
                    context_raw,
                    sla_status,
                    sla_result_pk
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (base_event_id) DO UPDATE
                SET caller_class = EXCLUDED.caller_class,
                    caller_method = EXCLUDED.caller_method,
                    caller_line = EXCLUDED.caller_line,
                    sla_class_name = EXCLUDED.sla_class_name,
                    context_raw = EXCLUDED.context_raw,
                    sla_status = EXCLUDED.sla_status,
                    sla_result_pk = EXCLUDED.sla_result_pk
                """,
                sla_rows,
                page_size=200,
            )

    return last_ts, last_id, inserted


# ============================================================
# Main loop
# ============================================================

def main() -> None:
    print(
        f"Starting ETL with ES_INDEX={ES_INDEX}, ES_URLS={ES_URLS}, PG_DSN={PG_DSN}, "
        f"PIPELINE_NAME={PIPELINE_NAME}, BATCH_SIZE={BATCH_SIZE}",
        flush=True,
    )

    es = make_es_client()
    full_sync_done = False

    while True:
        try:
            with psycopg2.connect(PG_DSN) as conn:
                conn.autocommit = False
                ensure_schema(conn)

                if FULL_SYNC_ON_START and not full_sync_done:
                    reset_watermark(conn)
                    full_sync_done = True
                    print("FULL_SYNC_ON_START=true -> watermark reset to epoch", flush=True)

                last_ts, last_id = get_watermark(conn)

                after = None
                moved = 0

                while True:
                    res = fetch_batch(es, after, last_ts)
                    hits = res.get("hits", {}).get("hits", [])

                    if not hits:
                        break

                    ts, doc_id, inserted = upsert_rows(conn, hits)

                    if inserted > 0:
                        set_watermark(conn, ts, doc_id or last_id)

                    conn.commit()

                    moved += inserted
                    after = hits[-1].get("sort")

                    if not after:
                        break

                print(f"ETL cycle complete. moved={moved}", flush=True)

        except Exception as exc:
            print(f"ETL error: {type(exc).__name__}: {exc}", flush=True)

        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()