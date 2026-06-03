import argparse
import gc
import json
import os
import re
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from transformers import AutoModel, AutoTokenizer


def parse_args():
    parser = argparse.ArgumentParser()

    parser.add_argument("--input-path", default="data/sequences.csv")
    parser.add_argument("--base-model-path", required=True)
    parser.add_argument("--output-dir", default="outputs")
    parser.add_argument("--model-dir", default="models")
    parser.add_argument("--work-cache-dir", default="cache")

    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--max-length", type=int, default=64)

    parser.add_argument(
        "--max-rows",
        type=int,
        default=None,
        help="Limit rows for testing. Omit for all rows."
    )

    parser.add_argument(
        "--iforest-train-rows",
        type=int,
        default=200000,
        help=(
            "Rows used to fit IsolationForest. "
            "Use 0 to train on all rows, but this can be slow/heavy."
        )
    )

    parser.add_argument("--contamination", type=float, default=0.03)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--suspicious-quantile", type=float, default=0.95)
    parser.add_argument("--anomalous-quantile", type=float, default=0.99)

    return parser.parse_args()


def count_pattern(text, pattern):
    return len(re.findall(pattern, str(text or ""), flags=re.IGNORECASE))


def minmax(x):
    x = np.asarray(x, dtype=float)
    mn = np.nanmin(x)
    mx = np.nanmax(x)

    if mx > mn:
        return (x - mn) / (mx - mn)

    return np.zeros_like(x)


def ensure_sequence_text(df):
    if "sequence_text" in df.columns:
        df["sequence_text"] = df["sequence_text"].fillna("").astype(str)
        return df

    fallback_cols = []

    for col in [
        "application_key",
        "component_name",
        "event_type",
        "severity",
        "message",
        "event_ids",
    ]:
        if col in df.columns:
            fallback_cols.append(col)

    if not fallback_cols:
        raise ValueError(
            "sequences.csv must contain sequence_text or fallback columns."
        )

    df["sequence_text"] = (
        df[fallback_cols]
        .fillna("")
        .astype(str)
        .agg(" ".join, axis=1)
    )

    return df


def build_numeric_features(df):
    texts = df["sequence_text"].fillna("").astype(str)

    features = pd.DataFrame(index=df.index)

    if "event_ids" in df.columns:
        features["event_count"] = (
            df["event_ids"]
            .fillna("")
            .astype(str)
            .apply(lambda x: len([p for p in x.split(",") if p.strip()]))
        )
    else:
        features["event_count"] = texts.apply(lambda x: len(x.split()))

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

    features["risk_signal"] = (
        features["error_count"] * 2.0
        + features["warning_count"] * 0.8
        + features["sla_not_found_count"] * 2.5
        + features["persistence_count"] * 0.3
    )

    return features.astype(np.float32)


@torch.no_grad()
def embed_batch(texts, tokenizer, model, device, max_length):
    encoded = tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=max_length,
        return_tensors="pt",
    )

    encoded = {k: v.to(device) for k, v in encoded.items()}

    outputs = model(**encoded)

    hidden = outputs.last_hidden_state
    mask = encoded["attention_mask"].unsqueeze(-1)

    pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)

    return pooled.detach().cpu().numpy().astype(np.float32)


def create_thresholds(df, score_col, suspicious_q, anomalous_q):
    global_suspicious = float(df[score_col].quantile(suspicious_q))
    global_anomalous = float(df[score_col].quantile(anomalous_q))

    threshold_config = {
        "strategy": "per_application",
        "score_column": score_col,
        "score_direction": "higher_is_more_anomalous",
        "global": {
            "threshold_suspicious": global_suspicious,
            "threshold_anomalous": global_anomalous,
        },
        "per_application": {},
    }

    if "application_key" in df.columns:
        per_app = (
            df.groupby("application_key")[score_col]
            .quantile([suspicious_q, anomalous_q])
            .unstack()
            .rename(
                columns={
                    suspicious_q: "threshold_suspicious",
                    anomalous_q: "threshold_anomalous",
                }
            )
            .reset_index()
        )

        for _, row in per_app.iterrows():
            app = row["application_key"]
            threshold_config["per_application"][app] = {
                "threshold_suspicious": float(row["threshold_suspicious"]),
                "threshold_anomalous": float(row["threshold_anomalous"]),
            }

    return threshold_config


def assign_label(row, threshold_config):
    score_col = threshold_config["score_column"]
    score = row[score_col]
    app = row.get("application_key")

    thresholds = threshold_config["per_application"].get(
        app,
        threshold_config["global"],
    )

    if score >= thresholds["threshold_anomalous"]:
        return "anomalous"

    if score >= thresholds["threshold_suspicious"]:
        return "suspicious"

    return "normal"


def main():
    args = parse_args()

    input_path = Path(args.input_path)
    base_model_path = Path(args.base_model_path)
    output_dir = Path(args.output_dir)
    model_dir = Path(args.model_dir)
    cache_dir = Path(args.work_cache_dir)

    output_dir.mkdir(parents=True, exist_ok=True)
    model_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)

    if not input_path.exists():
        raise FileNotFoundError(f"Missing input file: {input_path}")

    if not base_model_path.exists():
        raise FileNotFoundError(f"Missing base model folder: {base_model_path}")

    start_time = time.time()

    print("Loading sequences...")
    df = pd.read_csv(input_path)

    print("Original rows:", len(df))

    if args.max_rows is not None:
        df = df.sample(
            n=min(args.max_rows, len(df)),
            random_state=args.random_state,
        ).reset_index(drop=True)
        print("Limited rows:", len(df))

    df = ensure_sequence_text(df)

    if "sequence_uid" not in df.columns:
        df["sequence_uid"] = df.index.astype(str)

    if "application_key" in df.columns:
        print("\nApplications:")
        print(df["application_key"].value_counts())

    if {"application_key", "component_name"}.issubset(df.columns):
        print("\nTop application/component groups:")
        print(
            df.groupby(["application_key", "component_name"])
            .size()
            .sort_values(ascending=False)
            .head(30)
        )

    print("\nBuilding numeric features...")
    numeric_features = build_numeric_features(df)
    numeric_feature_columns = numeric_features.columns.tolist()
    numeric_dim = numeric_features.shape[1]

    print("Numeric feature columns:", numeric_feature_columns)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("\nUsing device:", device)

    if device == "cuda":
        print("GPU:", torch.cuda.get_device_name(0))

    print("Loading tokenizer/model...")
    tokenizer = AutoTokenizer.from_pretrained(
        str(base_model_path),
        local_files_only=True,
    )

    bert_model = AutoModel.from_pretrained(
        str(base_model_path),
        local_files_only=True,
    ).to(device)

    bert_model.eval()

    n_rows = len(df)

    # DistilBERT base hidden size is normally 768.
    embedding_dim = int(bert_model.config.hidden_size)
    total_dim = embedding_dim + numeric_dim

    print("Embedding dim:", embedding_dim)
    print("Total feature dim:", total_dim)

    feature_matrix_path = cache_dir / "logvision_full_features.dat"

    X_memmap = np.memmap(
        feature_matrix_path,
        dtype="float32",
        mode="w+",
        shape=(n_rows, total_dim),
    )

    print("\nCreating embeddings and feature matrix...")

    texts = df["sequence_text"].tolist()
    numeric_array = numeric_features.values.astype(np.float32)

    for start in range(0, n_rows, args.batch_size):
        end = min(start + args.batch_size, n_rows)

        batch_embeddings = embed_batch(
            texts[start:end],
            tokenizer,
            bert_model,
            device,
            args.max_length,
        )

        X_memmap[start:end, :embedding_dim] = batch_embeddings
        X_memmap[start:end, embedding_dim:] = numeric_array[start:end]

        if start % (args.batch_size * 50) == 0:
            print(f"Processed {start:,}/{n_rows:,}")

    X_memmap.flush()

    del bert_model
    del tokenizer
    gc.collect()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    print("\nFeature matrix saved:", feature_matrix_path)

    X = np.memmap(
        feature_matrix_path,
        dtype="float32",
        mode="r",
        shape=(n_rows, total_dim),
    )

    if args.iforest_train_rows == 0 or args.iforest_train_rows >= n_rows:
        train_idx = np.arange(n_rows)
        print("Training IsolationForest on all rows:", len(train_idx))
    else:
        rng = np.random.default_rng(args.random_state)

        if "application_key" in df.columns:
            train_parts = []
            apps = sorted(df["application_key"].dropna().unique())
            per_app = max(args.iforest_train_rows // max(len(apps), 1), 1)

            for app in apps:
                app_idx = df.index[df["application_key"] == app].to_numpy()
                take = min(len(app_idx), per_app)
                train_parts.append(rng.choice(app_idx, size=take, replace=False))

            train_idx = np.concatenate(train_parts)

            if len(train_idx) < args.iforest_train_rows:
                remaining = args.iforest_train_rows - len(train_idx)
                all_idx = np.arange(n_rows)
                extra = rng.choice(
                    all_idx,
                    size=min(remaining, n_rows),
                    replace=False,
                )
                train_idx = np.unique(np.concatenate([train_idx, extra]))

        else:
            train_idx = rng.choice(
                np.arange(n_rows),
                size=min(args.iforest_train_rows, n_rows),
                replace=False,
            )

        print("Training IsolationForest on sampled rows:", len(train_idx))

    X_train = np.asarray(X[train_idx], dtype=np.float32)

    print("\nFitting scaler...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train).astype(np.float32)

    print("Training IsolationForest...")
    iforest = IsolationForest(
        n_estimators=300,
        contamination=args.contamination,
        random_state=args.random_state,
        n_jobs=-1,
    )

    iforest.fit(X_train_scaled)

    del X_train
    del X_train_scaled
    gc.collect()

    print("\nScoring all rows...")

    raw_scores = np.zeros(n_rows, dtype=np.float32)

    score_batch_size = 20000

    for start in range(0, n_rows, score_batch_size):
        end = min(start + score_batch_size, n_rows)

        X_batch = np.asarray(X[start:end], dtype=np.float32)
        X_batch_scaled = scaler.transform(X_batch).astype(np.float32)

        # score_samples: higher means more normal. Negate so higher = more anomalous.
        raw_scores[start:end] = -iforest.score_samples(X_batch_scaled).astype(np.float32)

        if start % (score_batch_size * 5) == 0:
            print(f"Scored {start:,}/{n_rows:,}")

    df["iforest_raw"] = raw_scores
    df["logbert_like_score"] = minmax(raw_scores)

    threshold_config = create_thresholds(
        df=df,
        score_col="logbert_like_score",
        suspicious_q=args.suspicious_quantile,
        anomalous_q=args.anomalous_quantile,
    )

    df["logbert_like_label"] = df.apply(
        lambda row: assign_label(row, threshold_config),
        axis=1,
    )

    threshold_path = model_dir / "threshold_per_application.json"

    with open(threshold_path, "w") as f:
        json.dump(threshold_config, f, indent=2)

    print("Saved thresholds:", threshold_path)

    output_columns = [
        "sequence_uid",
        "application_key",
        "component_name",
        "start_timestamp",
        "end_timestamp",
        "event_ids",
        "logbert_like_score",
        "logbert_like_label",
        "iforest_raw",
    ]

    output_columns = [col for col in output_columns if col in df.columns]

    scores_path = output_dir / "logbert_like_scores_v2.csv"
    df[output_columns].to_csv(scores_path, index=False)

    print("Saved scores:", scores_path)

    artifact = {
        "model_name": str(base_model_path),
        "model_type": "distilbert_embeddings_plus_numeric_features_plus_isolation_forest",
        "max_length": args.max_length,
        "batch_size": args.batch_size,
        "sample_size": int(n_rows),
        "iforest_train_rows": int(len(train_idx)),
        "embedding_dim": int(embedding_dim),
        "numeric_feature_columns": numeric_feature_columns,
        "feature_count": int(total_dim),
        "iforest": iforest,
        "scaler": scaler,
        "threshold_config": threshold_config,
        "score_direction": "higher_is_more_anomalous",
        "primary_note": (
            "Production inference must reproduce sequence_text construction, "
            "DistilBERT embeddings, numeric feature order, scaler.transform, "
            "and IsolationForest score conversion."
        ),
    }

    model_path = model_dir / "logbert_like_iforest_v2.joblib"
    joblib.dump(artifact, model_path)

    print("Saved model:", model_path)

    print("\nLabel counts:")
    print(df["logbert_like_label"].value_counts())

    if "application_key" in df.columns:
        print("\nLabels by application:")
        print(pd.crosstab(df["application_key"], df["logbert_like_label"]))

    print("\nScore distribution:")
    print(
        df["logbert_like_score"].describe(
            percentiles=[0.5, 0.75, 0.9, 0.95, 0.99, 0.995]
        )
    )

    print("\nThreshold config:")
    print(json.dumps(threshold_config, indent=2))

    elapsed = time.time() - start_time
    print(f"\nTraining/scoring complete in {elapsed / 60:.2f} minutes.")


if __name__ == "__main__":
    main()
