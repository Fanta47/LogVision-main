-- Migration for existing databases to add the ML/ETL columns expected by etl_service.py
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS event_uid VARCHAR(128);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS es_id VARCHAR(256);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS upload_uid VARCHAR(128);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS upload_id BIGINT;
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS application_key VARCHAR(100);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS component_name VARCHAR(150);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS platform VARCHAR(120);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS environment VARCHAR(120);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS scope VARCHAR(120);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS thread_name VARCHAR(255);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS normalized_details TEXT;
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS template_id VARCHAR(128);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS details_hash VARCHAR(128);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS source_path TEXT;
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS stored_file_name VARCHAR(255);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255);
ALTER TABLE base_event ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS ux_base_event_event_uid ON base_event(event_uid);
CREATE INDEX IF NOT EXISTS idx_base_event_sequence ON base_event(application_key, component_name, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_base_event_family_time ON base_event(log_family, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_base_event_type_time ON base_event(event_type, event_timestamp);

ALTER TABLE sql_event ADD COLUMN IF NOT EXISTS base_event_id BIGINT;
ALTER TABLE sql_event ADD COLUMN IF NOT EXISTS sql_query TEXT;
ALTER TABLE sql_event ADD COLUMN IF NOT EXISTS normalized_sql_query TEXT;
ALTER TABLE sql_event ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE sql_event ADD COLUMN IF NOT EXISTS query_length INT;
ALTER TABLE sql_event ADD COLUMN IF NOT EXISTS estimated_complexity_score NUMERIC(10,4);

CREATE TABLE IF NOT EXISTS sla_event (
  base_event_id BIGINT PRIMARY KEY,
  caller_class TEXT,
  caller_method TEXT,
  caller_line INT,
  sla_class_name TEXT,
  context_raw TEXT,
  sla_status VARCHAR(32),
  sla_result_pk TEXT
);

CREATE TABLE IF NOT EXISTS etl_watermark (
  pipeline_name VARCHAR(128) PRIMARY KEY,
  last_event_timestamp TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01 00:00:00+00',
  last_source_doc_id TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
<<<<<<< HEAD
=======

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

CREATE TABLE IF NOT EXISTS ml_inference_score (
  id BIGSERIAL PRIMARY KEY,
  run_uid VARCHAR(128) NOT NULL,
  sequence_index INTEGER NOT NULL,
  anomaly_score NUMERIC(10,6) NOT NULL,
  anomaly_label VARCHAR(32) NOT NULL,
  model_name VARCHAR(120) NOT NULL,
  model_version VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_uid, sequence_index, model_name, model_version)
);

CREATE INDEX IF NOT EXISTS idx_ml_inference_score_model
ON ml_inference_score(model_name, model_version);
>>>>>>> 494bacd (Save workspace snapshot)
