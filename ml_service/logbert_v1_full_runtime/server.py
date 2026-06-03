from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
import psycopg2
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "model"
MODEL_CONFIG_PATH = MODEL_DIR / "model_config.json"
THRESHOLD_PATH = MODEL_DIR / "threshold.json"
MODEL_FILE = MODEL_DIR / "logbert_like_iforest_v2.joblib"


class ScoreInput(BaseModel):
    # Provide either `features` (full concatenated vector) or both `embedding` and `numeric`.
    features: Optional[List[float]] = None
    embedding: Optional[List[float]] = None
    numeric: Optional[List[float]] = None
    application_key: Optional[str] = None



class RawInput(BaseModel):
    raw: float
    is_normalized: Optional[bool] = False
    application_key: Optional[str] = None


app = FastAPI(title="LogBERT-like Runtime")


class SequenceScore(BaseModel):
    sequence_uid: str
    application_key: str
    component_name: str
    start_timestamp: Optional[str] = None
    end_timestamp: Optional[str] = None
    event_ids: str
    logbert_like_score: float
    logbert_like_label: Optional[str] = None
    final_anomaly_score: Optional[float] = None
    final_anomaly_label: Optional[str] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None


def _load_artifact():
    if not MODEL_FILE.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_FILE}")
    art = joblib.load(MODEL_FILE)
    return art


def _load_json(path: Path):
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


ARTIFACT = None
MODEL_CONFIG = _load_json(MODEL_CONFIG_PATH)
THRESHOLDS = _load_json(THRESHOLD_PATH)


@app.on_event("startup")
def startup():
    global ARTIFACT
    ARTIFACT = _load_artifact()


def _vector_from_input(payload: ScoreInput) -> np.ndarray:
    if payload.features is not None:
        vec = np.array(payload.features, dtype=float)
    else:
        if payload.embedding is None or payload.numeric is None:
            raise HTTPException(status_code=400, detail="Provide either `features` or both `embedding` and `numeric`.")
        vec = np.concatenate([np.array(payload.embedding, dtype=float), np.array(payload.numeric, dtype=float)])
    return vec.reshape(1, -1)


def _normalize_raw(raw: float, artifact: dict) -> Optional[float]:
    # Try common keys saved by training artifact to recover min/max used for minmax normalization.
    for k1, k2 in (("min_raw", "max_raw"), ("raw_min", "raw_max"), ("min_s", "max_s")):
        if k1 in artifact and k2 in artifact:
            mn = float(artifact[k1])
            mx = float(artifact[k2])
            if mx > mn:
                return float(max(0.0, min(1.0, (raw - mn) / (mx - mn))))
    # If not present, attempt to use scaler / iforest stored sample by checking artifact.get("iforest_sample_min/max")
    return None


def _compute_label(score_norm: Optional[float], app_key: Optional[str]) -> Optional[str]:
    if score_norm is None or THRESHOLDS is None:
        return None
    strat = THRESHOLDS.get("strategy") or "per_application"
    best = None
    if strat == "per_application" and app_key:
        per = THRESHOLDS.get("per_application", {})
        cfg = per.get(app_key.lower()) or per.get(app_key)
        best = cfg
    if best is None:
        best = THRESHOLDS.get("global")
    if not best:
        return None
    if score_norm >= best.get("threshold_anomalous", 1.0):
        return "anomalous"
    if score_norm >= best.get("threshold_suspicious", 1.0):
        return "suspicious"
    return "normal"


def _pg_dsn() -> str:
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "logs")
    user = os.getenv("POSTGRES_USER", "logs_user")
    pw = os.getenv("POSTGRES_PASSWORD", "logs_pass")
    return f"host={host} port={port} dbname={db} user={user} password={pw}"


def _write_sequence_to_pg(row: dict) -> None:
    sql = """
    INSERT INTO ml_sequence_score (
        sequence_uid,
        application_key,
        component_name,
        start_timestamp,
        end_timestamp,
        event_ids,
        logbert_like_score,
        logbert_like_label,
        final_anomaly_score,
        final_anomaly_label,
        model_name,
        model_version
    ) VALUES (
        %s, LOWER(%s), LOWER(%s), NULLIF(%s, '')::TIMESTAMPTZ, NULLIF(%s, '')::TIMESTAMPTZ, %s,
        %s, %s, %s, %s, %s, %s
    )
    ON CONFLICT (sequence_uid, model_name, model_version) DO UPDATE SET
        application_key = EXCLUDED.application_key,
        component_name = EXCLUDED.component_name,
        start_timestamp = EXCLUDED.start_timestamp,
        end_timestamp = EXCLUDED.end_timestamp,
        event_ids = EXCLUDED.event_ids,
        logbert_like_score = EXCLUDED.logbert_like_score,
        logbert_like_label = EXCLUDED.logbert_like_label,
        final_anomaly_score = EXCLUDED.final_anomaly_score,
        final_anomaly_label = EXCLUDED.final_anomaly_label;
    """

    params = (
        row.get("sequence_uid"),
        row.get("application_key"),
        row.get("component_name"),
        row.get("start_timestamp"),
        row.get("end_timestamp"),
        row.get("event_ids"),
        row.get("logbert_like_score") or 0,
        row.get("logbert_like_label"),
        row.get("final_anomaly_score") or row.get("logbert_like_score") or 0,
        row.get("final_anomaly_label") or row.get("logbert_like_label") or 'normal',
        row.get("model_name"),
        row.get("model_version"),
    )

    with psycopg2.connect(_pg_dsn()) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()


@app.post("/store_sequence")
def store_sequence(payload: SequenceScore):
    try:
        row = payload.dict()
        # ensure consistent casing
        row["application_key"] = row.get("application_key")
        row["component_name"] = row.get("component_name")
        # write to Postgres
        _write_sequence_to_pg(row)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/score")
def score(payload: ScoreInput):
    if ARTIFACT is None:
        raise HTTPException(status_code=500, detail="Model artifact not loaded")

    vec = _vector_from_input(payload)

    # Apply scaler.transform if available
    scaler = None
    if isinstance(ARTIFACT, dict) and "scaler" in ARTIFACT:
        scaler = ARTIFACT["scaler"]
    elif hasattr(ARTIFACT, "get") and ARTIFACT.get("scaler"):
        scaler = ARTIFACT.get("scaler")

    X = vec
    try:
        if scaler is not None:
            X = scaler.transform(X)
    except Exception:
        # If scaler fails, continue with raw vector
        pass

    # Find isolation forest object
    iforest = None
    if isinstance(ARTIFACT, dict):
        if "iforest" in ARTIFACT:
            iforest = ARTIFACT["iforest"]
        elif "model" in ARTIFACT and hasattr(ARTIFACT["model"], "score_samples"):
            iforest = ARTIFACT["model"]
    else:
        # If artifact is the model itself
        if hasattr(ARTIFACT, "score_samples"):
            iforest = ARTIFACT

    if iforest is None:
        raise HTTPException(status_code=500, detail="IsolationForest model not found in artifact")

    # Compute raw anomaly (training scripts used negative score_samples / decision_function)
    try:
        raw = -float(iforest.score_samples(X)[0])
    except Exception:
        try:
            raw = -float(iforest.decision_function(X)[0])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to compute iforest score: {e}")

    normalized = _normalize_raw(raw, ARTIFACT if isinstance(ARTIFACT, dict) else {})
    label = _compute_label(normalized, payload.application_key)

    return {
        "raw": float(raw),
        "normalized": normalized,
        "label": label,
        "model_name": MODEL_CONFIG.get("model_name") if MODEL_CONFIG else None,
    }


@app.post("/score_raw")
def score_raw(payload: RawInput):
    if ARTIFACT is None:
        raise HTTPException(status_code=500, detail="Model artifact not loaded")

    raw = float(payload.raw)
    if payload.is_normalized:
        normalized = raw
    else:
        normalized = _normalize_raw(raw, ARTIFACT if isinstance(ARTIFACT, dict) else {})

    label = _compute_label(normalized, payload.application_key)

    return {"raw": raw, "normalized": normalized, "label": label}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
