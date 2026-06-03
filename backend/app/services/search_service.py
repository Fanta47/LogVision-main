<<<<<<< HEAD
=======
from pathlib import Path

>>>>>>> 494bacd (Save workspace snapshot)
from elasticsearch import Elasticsearch

from app.core.config import get_settings

settings = get_settings()


# Shared Elasticsearch client for lightweight query endpoints.
<<<<<<< HEAD
es_client = Elasticsearch(settings.es_url)


def search_logs(term: str | None = None, size: int = 20) -> dict:
=======
client_kwargs = {}
if settings.es_username and settings.es_password:
    client_kwargs["basic_auth"] = (settings.es_username, settings.es_password)

if settings.es_ca_cert and Path(settings.es_ca_cert).exists():
    client_kwargs["ca_certs"] = settings.es_ca_cert
elif settings.es_url.startswith("https://"):
    client_kwargs["verify_certs"] = False

es_client = Elasticsearch(settings.es_url, **client_kwargs)


def search_logs(
    term: str | None = None,
    size: int = 20,
    application_key: str | None = None,
    component_name: str | None = None,
    log_level: str | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
) -> dict:
    filters = []
    if application_key:
        filters.append({"term": {"application_key.keyword": application_key}})
    if component_name:
        filters.append({"term": {"component_name.keyword": component_name}})
    if log_level:
        filters.append({"term": {"log_level.keyword": log_level}})
    if start_time or end_time:
        range_filter = {}
        if start_time:
            range_filter["gte"] = start_time
        if end_time:
            range_filter["lte"] = end_time
        filters.append({"range": {"@timestamp": range_filter}})

>>>>>>> 494bacd (Save workspace snapshot)
    if term:
        query = {
            'bool': {
                'must': [
                    {
                        'simple_query_string': {
                            'query': term,
                            'default_operator': 'and',
                        }
                    }
<<<<<<< HEAD
                ]
            }
        }
    else:
        query = {'match_all': {}}
=======
                ],
                'filter': filters,
            }
        }
    else:
        query = {'bool': {'must': [{'match_all': {}}], 'filter': filters}}
>>>>>>> 494bacd (Save workspace snapshot)

    result = es_client.search(
        index=settings.es_index,
        size=size,
        query=query,
    )

    hits = result.get('hits', {}).get('hits', [])
<<<<<<< HEAD
    return {
        'total': result.get('hits', {}).get('total', {}),
        'size': size,
        'items': hits,
=======
    total = result.get('hits', {}).get('total', {})
    return {
        'total': total.get("value", total) if isinstance(total, dict) else total,
        'size': size,
        'items': hits,
        'logs': [
            {
                "id": hit.get("_id"),
                "index": hit.get("_index"),
                **(hit.get("_source") or {}),
            }
            for hit in hits
        ],
>>>>>>> 494bacd (Save workspace snapshot)
    }
