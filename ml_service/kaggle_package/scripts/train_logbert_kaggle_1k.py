import os
import re
import numpy as np
import pandas as pd
import torch
from transformers import AutoTokenizer, AutoModel
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.random_projection import GaussianRandomProjection
import joblib

# ============================================================
# Paths
# ============================================================

INPUT_PATH = "data/sequences.csv"

OUTPUT_PATH = "outputs/logbert_like_scores_v2.csv"
EMBEDDINGS_PATH = "models/logbert_embeddings_v2.npy"
MODEL_PATH = "models/logbert_like_iforest_v2.joblib"

os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

# ============================================================
# Model configuration
# ============================================================

MODEL_NAME = "distilbert-base-uncased"

# Final training sample.
# Balanced target:
# 4 applications x 3000 sequences = 12000 sequences.
MAX_TOTAL_ROWS = 1000

BATCH_SIZE = 32
MAX_LENGTH = 64
RANDOM_STATE = 42

# KNN is only a comparative baseline.
# It is NOT the operational scoring model.
KNN_REFERENCE_SIZE = 800
KNN_PROJECTION_DIM = 32
KNN_K = 6


# ============================================================
# Utility functions
# ============================================================

def minmax(x):
    x = np.asarray(x, dtype=float)
    mn = np.nanmin(x)
    mx = np.nanmax(x)

    if mx > mn:
        return (x - mn) / (mx - mn)

    return np.zeros_like(x)


def count_pattern(text, pattern):
    return len(re.findall(pattern, str(text or ""), flags=re.IGNORECASE))


def build_numeric_features(work):
    texts = work["sequence_text"].fillna("").astype(str)

    features = pd.DataFrame()

    features["event_count"] = (
        work["event_ids"]
        .fillna("")
        .astype(str)
        .apply(lambda x: len([p for p in x.split(",") if p]))
    )

    features["token_count"] = texts.apply(lambda x: len(x.split()))
    features["unique_token_count"] = texts.apply(lambda x: len(set(x.split())))

    features["error_count"] = texts.apply(
        lambda x: count_pattern(x, r"ERROR|EXCEPTION|FAILED|FAILURE|TECHNICAL_ERROR")
    )

    features["warning_count"] = texts.apply(
        lambda x: count_pattern(x, r"WARN|WARNING")
    )

    features["sla_not_found_count"] = texts.apply(
        lambda x: count_pattern(x, r"SLA_NOT_FOUND|NOT_FOUND")
    )

    features["sla_found_count"] = texts.apply(
        lambda x: count_pattern(x, r"SLA_FOUND")
    )

    features["sql_count"] = texts.apply(
        lambda x: count_pattern(x, r"SQL|SELECT|INSERT|UPDATE|DELETE")
    )

    features["lifecycle_count"] = texts.apply(
        lambda x: count_pattern(x, r"LIFECYCLE")
    )

    features["persistence_count"] = texts.apply(
        lambda x: count_pattern(x, r"PERSISTENCE")
    )

    features["generic_info_count"] = texts.apply(
        lambda x: count_pattern(x, r"GENERIC_APPLICATION_INFO")
    )

    # Operational risk signal.
    # Used as additional numerical context, not as a hard rule.
    features["risk_signal"] = (
        features["error_count"] * 2.0
        + features["warning_count"] * 0.8
        + features["sla_not_found_count"] * 2.5
        + features["persistence_count"] * 0.3
    )

    return features.to_numpy(dtype=float), features


def approximate_knn_score(X, random_state=42):
    """
    Fast approximate KNN baseline.

    KNN is used only as an offline comparative baseline.
    The final operational score remains LogBERT-like V4.
    """

    print("Computing approximate KNN baseline score...", flush=True)

    n = X.shape[0]
    ref_size = min(KNN_REFERENCE_SIZE, n)

    projector = GaussianRandomProjection(
        n_components=min(KNN_PROJECTION_DIM, X.shape[1]),
        random_state=random_state,
    )

    Xp = projector.fit_transform(X).astype(np.float32)

    rng = np.random.default_rng(random_state)
    ref_idx = rng.choice(n, size=ref_size, replace=False)
    R = Xp[ref_idx]

    kth = min(KNN_K, ref_size - 1)
    scores = np.zeros(n, dtype=np.float32)

    chunk_size = 512
    r_norm = np.sum(R * R, axis=1)

    for start in range(0, n, chunk_size):
        end = min(start + chunk_size, n)

        C = Xp[start:end]
        c_norm = np.sum(C * C, axis=1, keepdims=True)

        dist2 = c_norm + r_norm[None, :] - 2.0 * (C @ R.T)
        dist2 = np.maximum(dist2, 0.0)

        kth_dist = np.partition(dist2, kth=kth, axis=1)[:, kth]
        scores[start:end] = np.sqrt(kth_dist)

        if start % 2048 == 0:
            print(f"KNN approx processed {end}/{n}", flush=True)

    return scores


def balanced_sample(df):
    """
    Balanced sampling strategy.

    Goal:
    - include all applications
    - target approximately 3000 sequences per application
    - preserve component diversity
    - fill missing quota from the same application if some components are too small
    """

    applications = sorted(df["application_key"].dropna().unique())
    app_count = max(len(applications), 1)

    max_rows_per_application = MAX_TOTAL_ROWS // app_count

    sampled_apps = []

    print("Applications found in sequences.csv:", flush=True)
    print(df["application_key"].value_counts(), flush=True)

    for app, app_group in df.groupby("application_key"):
        app_group = app_group.reset_index(drop=True)

        target_n = min(len(app_group), max_rows_per_application)

        component_parts = []
        used_indices = set()

        components = sorted(app_group["component_name"].dropna().unique())
        component_count = max(len(components), 1)

        base_per_component = max(1, target_n // component_count)

        # Step 1:
        # Sample every component to preserve diversity.
        for component, component_group in app_group.groupby("component_name"):
            n = min(len(component_group), base_per_component)

            if n > 0:
                sample = component_group.sample(
                    n=n,
                    random_state=RANDOM_STATE,
                )

                component_parts.append(sample)
                used_indices.update(sample.index.tolist())

        if component_parts:
            app_sample = pd.concat(component_parts, ignore_index=False)
        else:
            app_sample = pd.DataFrame(columns=app_group.columns)

        # Step 2:
        # If some components were too small, fill the remaining quota
        # from the same application.
        remaining_n = target_n - len(app_sample)

        if remaining_n > 0:
            remaining_pool = app_group.drop(
                index=list(used_indices),
                errors="ignore",
            )

            if len(remaining_pool) > 0:
                fill_n = min(remaining_n, len(remaining_pool))

                fill_sample = remaining_pool.sample(
                    n=fill_n,
                    random_state=RANDOM_STATE,
                )

                app_sample = pd.concat(
                    [app_sample, fill_sample],
                    ignore_index=False,
                )

        # Step 3:
        # Final safety cap per application.
        if len(app_sample) > target_n:
            app_sample = app_sample.sample(
                n=target_n,
                random_state=RANDOM_STATE,
            )

        sampled_apps.append(app_sample.reset_index(drop=True))

    if not sampled_apps:
        raise SystemExit("No sampled data produced. Check data/sequences.csv.")

    work = pd.concat(sampled_apps, ignore_index=True)

    # Final global cap.
    if len(work) > MAX_TOTAL_ROWS:
        work = work.sample(
            n=MAX_TOTAL_ROWS,
            random_state=RANDOM_STATE,
        ).reset_index(drop=True)

    print(f"Sampled sequences for LogBERT-like V2/V4: {len(work)}", flush=True)

    print("Sampled by application:", flush=True)
    print(work["application_key"].value_counts(), flush=True)

    print("Sampled by application/component:", flush=True)
    print(
        work.groupby(["application_key", "component_name"])
        .size()
        .sort_values(ascending=False)
        .head(100),
        flush=True,
    )

    return work.reset_index(drop=True)


# ============================================================
# Main pipeline
# ============================================================

def main():
    print("Loading sequences...", flush=True)

    required_cols = [
        "sequence_uid",
        "application_key",
        "component_name",
        "start_timestamp",
        "end_timestamp",
        "event_ids",
        "sequence_text",
    ]

    df = pd.read_csv(
        INPUT_PATH,
        usecols=required_cols,
        encoding="utf-8-sig",
        low_memory=False,
    )

    missing = [c for c in required_cols if c not in df.columns]

    if missing:
        raise SystemExit(f"Missing columns in {INPUT_PATH}: {missing}")

    df["sequence_text"] = df["sequence_text"].fillna("").astype(str)
    df["application_key"] = (
        df["application_key"]
        .fillna("unknown")
        .astype(str)
        .str.lower()
    )
    df["component_name"] = (
        df["component_name"]
        .fillna("unknown")
        .astype(str)
        .str.lower()
    )

    print(f"Original sequences: {len(df)}", flush=True)

    work = balanced_sample(df)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}", flush=True)

    print("Loading tokenizer/model...", flush=True)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModel.from_pretrained(MODEL_NAME)

    model.to(device)
    model.eval()

    texts = work["sequence_text"].tolist()
    embeddings = []

    print("Encoding sequences...", flush=True)

    with torch.no_grad():
        for start in range(0, len(texts), BATCH_SIZE):
            batch_texts = texts[start:start + BATCH_SIZE]

            encoded = tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=MAX_LENGTH,
                return_tensors="pt",
            )

            encoded = {k: v.to(device) for k, v in encoded.items()}

            outputs = model(**encoded)

            last_hidden = outputs.last_hidden_state
            attention_mask = encoded["attention_mask"].unsqueeze(-1)

            masked = last_hidden * attention_mask
            summed = masked.sum(dim=1)
            counts = attention_mask.sum(dim=1).clamp(min=1)

            batch_embeddings = summed / counts

            embeddings.append(batch_embeddings.cpu().numpy())

            if start % 200 == 0:
                print(
                    f"Encoded {min(start + BATCH_SIZE, len(texts))}/{len(texts)}",
                    flush=True,
                )

    E = np.vstack(embeddings)
    np.save(EMBEDDINGS_PATH, E)

    print(f"Embeddings saved: {EMBEDDINGS_PATH}, shape={E.shape}", flush=True)

    numeric_features, feature_df = build_numeric_features(work)

    X = np.hstack([E, numeric_features])

    print(f"Final feature matrix shape: {X.shape}", flush=True)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print("Training IsolationForest on LogBERT-like V2 representation...", flush=True)

    iso = IsolationForest(
        n_estimators=120,
        contamination="auto",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    iso.fit(X_scaled)

    iforest_raw = -iso.decision_function(X_scaled)
    iforest_score = minmax(iforest_raw)

    knn_raw = approximate_knn_score(X_scaled, random_state=RANDOM_STATE)
    knn_score = minmax(knn_raw)

    # Base V2 score.
    # V3 and V4 scripts recalibrate this score.
    base_score = minmax(
        0.70 * iforest_score
        + 0.30 * knn_score
    )

    anomalous_threshold = np.quantile(base_score, 0.98)
    suspicious_threshold = np.quantile(base_score, 0.85)

    labels = np.where(
        base_score >= anomalous_threshold,
        "anomalous",
        np.where(base_score >= suspicious_threshold, "suspicious", "normal"),
    )

    joblib.dump(
        {
            "model_name": MODEL_NAME,
            "max_length": MAX_LENGTH,
            "batch_size": BATCH_SIZE,
            "sample_size": len(work),
            "iforest": iso,
            "scaler": scaler,
            "knn_reference_size": KNN_REFERENCE_SIZE,
            "knn_projection_dim": KNN_PROJECTION_DIM,
            "primary_note": (
                "LogBERT-like V4 is the primary scoring model. "
                "IForest and KNN are comparative baselines only."
            ),
        },
        MODEL_PATH,
    )

    out = work[
        [
            "sequence_uid",
            "application_key",
            "component_name",
            "start_timestamp",
            "end_timestamp",
            "event_ids",
        ]
    ].copy()

    out["logbert_like_score"] = base_score
    out["logbert_like_label"] = labels

    out["iforest_raw"] = iforest_raw
    out["knn_raw"] = knn_raw

    out.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"Saved {OUTPUT_PATH} with {len(out)} rows", flush=True)

    print("", flush=True)
    print("Label distribution:", flush=True)
    print(out["logbert_like_label"].value_counts(), flush=True)

    print("", flush=True)
    print("Output by application:", flush=True)
    print(out["application_key"].value_counts(), flush=True)

    print("", flush=True)
    print("Top scores:", flush=True)
    print(
        out.sort_values("logbert_like_score", ascending=False)
        .head(20)
        .to_string(index=False),
        flush=True,
    )


if __name__ == "__main__":
    main()
