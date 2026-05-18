from sqlalchemy import text
from sqlalchemy.orm import Session


BASE_EVENT_SELECT = """
    SELECT
        be.id,
        be.id AS event_id,
        be.event_uid,
        be.event_timestamp AS event_ts,
        be.event_timestamp,
        be.application_name,
        be.application_key,
        be.application_group,
        be.component_name,
        be.log_level AS severity,
        be.log_level,
        be.log_origin,
        be.log_family,
        be.event_type,
        be.parse_status,
        be.parse_confidence,
        be.analysis_status,
        be.source_file,
        be.source_path,
        be.stored_file_name,
        be.original_file_name,
        be.platform,
        be.environment,
        be.scope,
        be.thread_name,
        be.upload_uid,
        be.es_id,
        be.template_id,
        be.details_hash,
        be.context,
        be.details,
        be.normalized_details,
        COALESCE(
            be.normalized_details,
            be.details,
            be.context,
            be.event_type,
            be.log_family,
            ''
        ) AS raw_message,
        be.ingested_at,
        be.created_at
    FROM base_event be
"""


def _rows_to_dicts(rows):
    return [dict(row) for row in rows]


def _limit_value(limit: int | None) -> int:
    if limit is None:
        return 100

    try:
        value = int(limit)
    except (TypeError, ValueError):
        return 100

    return max(1, min(value, 500))


def fetch_recent_events(db: Session, limit: int = 100, **filters):
    where_clauses = []
    params = {"limit": _limit_value(limit)}

    application_key = filters.get("application_key")
    component_name = filters.get("component_name")
    log_family = filters.get("log_family")
    event_type = filters.get("event_type")
    severity = filters.get("severity") or filters.get("log_level")

    if application_key:
        where_clauses.append("be.application_key = :application_key")
        params["application_key"] = application_key

    if component_name:
        where_clauses.append("be.component_name = :component_name")
        params["component_name"] = component_name

    if log_family:
        where_clauses.append("be.log_family = :log_family")
        params["log_family"] = log_family

    if event_type:
        where_clauses.append("be.event_type = :event_type")
        params["event_type"] = event_type

    if severity:
        where_clauses.append("be.log_level = :severity")
        params["severity"] = severity

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    query = text(
        f"""
        {BASE_EVENT_SELECT}
        {where_sql}
        ORDER BY COALESCE(be.event_timestamp, be.ingested_at, be.created_at) DESC NULLS LAST
        LIMIT :limit
        """
    )

    rows = db.execute(query, params).mappings().all()
    return _rows_to_dicts(rows)


def fetch_recent_errors(db: Session, limit: int = 100, **filters):
    params = {"limit": _limit_value(limit)}

    query = text(
        f"""
        {BASE_EVENT_SELECT}
        WHERE
            COALESCE(be.log_level, '') ILIKE '%error%'
            OR COALESCE(be.log_level, '') ILIKE '%fatal%'
            OR COALESCE(be.log_level, '') ILIKE '%critical%'
            OR COALESCE(be.event_type, '') ILIKE '%error%'
            OR COALESCE(be.event_type, '') ILIKE '%exception%'
            OR COALESCE(be.details, '') ILIKE '%error%'
            OR COALESCE(be.normalized_details, '') ILIKE '%error%'
            OR COALESCE(be.context, '') ILIKE '%error%'
        ORDER BY COALESCE(be.event_timestamp, be.ingested_at, be.created_at) DESC NULLS LAST
        LIMIT :limit
        """
    )

    rows = db.execute(query, params).mappings().all()
    return _rows_to_dicts(rows)


def search_logs(
    db: Session,
    q: str | None = None,
    query: str | None = None,
    search: str | None = None,
    term: str | None = None,
    limit: int = 100,
    **filters,
):
    search_term = q or query or search or term or ""
    search_term = search_term.strip()

    if not search_term:
        return fetch_recent_events(db=db, limit=limit, **filters)

    params = {
        "limit": _limit_value(limit),
        "pattern": f"%{search_term}%",
    }

    sql = text(
        f"""
        {BASE_EVENT_SELECT}
        WHERE
            COALESCE(be.application_key, '') ILIKE :pattern
            OR COALESCE(be.application_name, '') ILIKE :pattern
            OR COALESCE(be.component_name, '') ILIKE :pattern
            OR COALESCE(be.log_level, '') ILIKE :pattern
            OR COALESCE(be.log_family, '') ILIKE :pattern
            OR COALESCE(be.event_type, '') ILIKE :pattern
            OR COALESCE(be.context, '') ILIKE :pattern
            OR COALESCE(be.details, '') ILIKE :pattern
            OR COALESCE(be.normalized_details, '') ILIKE :pattern
            OR COALESCE(be.source_file, '') ILIKE :pattern
            OR COALESCE(be.original_file_name, '') ILIKE :pattern
        ORDER BY COALESCE(be.event_timestamp, be.ingested_at, be.created_at) DESC NULLS LAST
        LIMIT :limit
        """
    )

    rows = db.execute(sql, params).mappings().all()
    return _rows_to_dicts(rows)


# Compatibility aliases in case older route files use these names.
fetch_events = fetch_recent_events
fetch_errors = fetch_recent_errors
fetch_error_events = fetch_recent_errors
