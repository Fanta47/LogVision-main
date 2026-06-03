\set ON_ERROR_STOP on

\echo Creating ML sequence score tables

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

\echo Loading CSV into staging table

DROP TABLE IF EXISTS tmp_logbert_v4_scores;

CREATE TEMP TABLE tmp_logbert_v4_scores (
    sequence_uid TEXT,
    application_key TEXT,
    component_name TEXT,
    start_timestamp TEXT,
    end_timestamp TEXT,
    event_ids TEXT,
    logbert_like_score TEXT,
    logbert_like_label TEXT,
    base_v2_score TEXT,
    risk_signal TEXT,
    sla_not_found_count TEXT,
    error_count TEXT,
    transition_ratio TEXT,
    rare_ratio TEXT,
    base_v3_score TEXT,
    calibrated_base_score TEXT,
    rank_score TEXT,
    final_anomaly_label TEXT
);

COPY tmp_logbert_v4_scores
FROM '/tmp/logbert_like_scores_v4_full.csv'
WITH (FORMAT CSV, HEADER TRUE);

\echo Replacing existing logbert_like_primary/v4 scores

DELETE FROM ml_sequence_score
WHERE model_name = 'logbert_like_primary'
  AND model_version = 'v4';

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
    0,
    0,
    COALESCE(NULLIF(logbert_like_score, '')::NUMERIC, 0),
    NULLIF(logbert_like_label, ''),
    COALESCE(
        NULLIF(rank_score, '')::NUMERIC,
        NULLIF(logbert_like_score, '')::NUMERIC,
        0
    ),
    COALESCE(NULLIF(final_anomaly_label, ''), NULLIF(logbert_like_label, ''), 'normal'),
    'logbert_like_primary',
    'v4'
FROM tmp_logbert_v4_scores
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

INSERT INTO ml_model_registry(model_name, model_version, model_type, artifact_path, metrics_json)
VALUES (
    'logbert_like_primary',
    'v4',
    'logbert_like_sequence_scorer',
    'ml_service/outputs/logbert_like_scores_v4_full.csv',
    NULL
)
ON CONFLICT (model_name, model_version) DO UPDATE SET
    artifact_path = EXCLUDED.artifact_path;

\echo Import summary

SELECT COUNT(*) AS sequence_scores
FROM ml_sequence_score
WHERE model_name = 'logbert_like_primary'
  AND model_version = 'v4';

SELECT final_anomaly_label, COUNT(*) AS count
FROM ml_sequence_score
WHERE model_name = 'logbert_like_primary'
  AND model_version = 'v4'
GROUP BY final_anomaly_label
ORDER BY final_anomaly_label;
