from __future__ import annotations

import os
from typing import Optional

import pandas as pd
from sqlalchemy import create_engine

from .config import settings


def _make_engine() -> Optional:
    user = settings.PG_USER
    pwd = settings.PG_PASSWORD
    host = settings.PG_HOST
    port = settings.PG_PORT
    db = settings.PG_DB
    if not all([user, pwd, host, port, db]):
        return None
<<<<<<< HEAD
    url = f"postgresql+psycopg://{user}:{pwd}@{host}:{port}/{db}"
=======
    url = f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{db}"
>>>>>>> 494bacd (Save workspace snapshot)
    return create_engine(url)


ENGINE = None
try:
    ENGINE = _make_engine()
except Exception:
    ENGINE = None


def query_to_df(sql: str) -> pd.DataFrame:
    """Execute SQL and return a pandas DataFrame.

    Raises:
        RuntimeError: if no DB engine is configured.
    """
    if ENGINE is None:
        raise RuntimeError("No database engine configured. Check environment variables.")
    return pd.read_sql(sql, ENGINE)


def get_events_sample() -> pd.DataFrame:
    """Return a sample combined events DataFrame (try DB, caller may fallback)."""
    sql = """
<<<<<<< HEAD
    SELECT created_at as timestamp, application_key, level, host, username as "user", message
    FROM base_event
    UNION ALL
    SELECT created_at, application_key, level, host, username, message FROM error_event
    UNION ALL
    SELECT created_at, application_key, level, host, username, message FROM sql_event
    UNION ALL
    SELECT created_at, application_key, level, host, username, message FROM scheduler_controller_event
=======
    SELECT
        COALESCE(event_uid, source_doc_id, id::TEXT) AS event_id,
        COALESCE(event_timestamp, created_at, ingested_at) AS timestamp,
        COALESCE(application_key, 'unknown_app') AS application_key,
        COALESCE(component_name, application_group, 'unknown_component') AS component_name,
        COALESCE(log_level, '') AS level,
        COALESCE(log_origin, '') AS host,
        COALESCE(thread_name, thread, '') AS "user",
        COALESCE(normalized_details, details, context, event_type, '') AS message
    FROM base_event
    WHERE COALESCE(event_timestamp, created_at, ingested_at) IS NOT NULL
>>>>>>> 494bacd (Save workspace snapshot)
    ORDER BY timestamp
    LIMIT 10000
    """
    return query_to_df(sql)
