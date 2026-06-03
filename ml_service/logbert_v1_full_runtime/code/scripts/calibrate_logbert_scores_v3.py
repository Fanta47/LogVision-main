import os
import math
import numpy as np
import pandas as pd

INPUT_V2 = "outputs/logbert_like_scores_v2.csv"
INPUT_SEQ = "data/sequences.csv"
OUTPUT_V3 = "outputs/logbert_like_scores_v3.csv"

if not os.path.exists(INPUT_V2):
    raise SystemExit(f"Missing file: {INPUT_V2}")

if not os.path.exists(INPUT_SEQ):
    raise SystemExit(f"Missing file: {INPUT_SEQ}")

v2 = pd.read_csv(INPUT_V2)
seq = pd.read_csv(INPUT_SEQ)

required_v2 = [
    "sequence_uid",
    "application_key",
    "component_name",
    "start_timestamp",
    "end_timestamp",
    "event_ids",
    "logbert_like_score",
]

missing = [c for c in required_v2 if c not in v2.columns]
if missing:
    raise SystemExit(f"Missing columns in V2: {missing}")

seq_small = seq[["sequence_uid", "sequence_text"]].copy()

df = v2.merge(seq_small, on="sequence_uid", how="left")
df["sequence_text"] = df["sequence_text"].fillna("").astype(str)
df["component_name"] = df["component_name"].fillna("unknown").astype(str)

# Token frequencies for rarity signal.
all_tokens = []
for text in df["sequence_text"]:
    all_tokens.extend(text.split())

token_freq = {}
for token in all_tokens:
    token_freq[token] = token_freq.get(token, 0) + 1

freq_values = np.array(list(token_freq.values())) if token_freq else np.array([1])
rare_threshold = np.percentile(freq_values, 15)

rows = []

for _, r in df.iterrows():
    tokens = str(r["sequence_text"]).split()
    seq_len = max(len(tokens), 1)

    has_sla = any(t.startswith("SLA_") for t in tokens)
    has_lifecycle = any(t.startswith("LIFECYCLE_") for t in tokens)
    has_persistence = any(t.startswith("PERSISTENCE_") for t in tokens)

    sla_not_found_count = sum(t == "SLA_SLA_NOT_FOUND" for t in tokens)

    error_count = sum(
        ("ERROR" in t) or ("EXCEPTION" in t) or ("FATAL" in t) or ("TECHNICAL_ERROR" in t)
        for t in tokens
    )

    rare_count = sum(token_freq.get(t, 0) <= rare_threshold for t in tokens)

    transitions = sum(
        1 for i in range(1, len(tokens))
        if tokens[i] != tokens[i - 1]
    )

    rare_ratio = rare_count / seq_len
    transition_ratio = transitions / max(seq_len - 1, 1)

    domain_signal = 1.0 if (has_sla or has_lifecycle or has_persistence) else 0.0
    sla_not_found_signal = 1.0 if sla_not_found_count > 0 else 0.0
    error_signal = 1.0 if error_count > 0 else 0.0

    # Operational risk signal: not a label, just a domain-informed calibration.
    risk_signal = (
        0.25 * domain_signal
        + 0.35 * sla_not_found_signal
        + 0.35 * error_signal
        + 0.10 * transition_ratio
        + 0.10 * rare_ratio
    )

    risk_signal = min(1.0, risk_signal)

    base_score = float(r["logbert_like_score"])

    # Main score remains LogBERT-like V2, but calibrated by operational signals.
    operational_score = 0.65 * base_score + 0.35 * risk_signal

    component = str(r["component_name"]).lower()

    low_risk_generic = (
        component in {"default", "loginit"}
        and not has_sla
        and not has_lifecycle
        and not has_persistence
        and error_count == 0
        and sla_not_found_count == 0
    )

    if low_risk_generic:
        operational_score *= 0.75

    operational_score = max(0.0, min(1.0, operational_score))

    if operational_score >= 0.70:
        label = "anomalous"
    elif operational_score >= 0.45:
        label = "suspicious"
    else:
        label = "normal"

    rows.append({
        "sequence_uid": r["sequence_uid"],
        "application_key": r["application_key"],
        "component_name": r["component_name"],
        "start_timestamp": r["start_timestamp"],
        "end_timestamp": r["end_timestamp"],
        "event_ids": r["event_ids"],
        "logbert_like_score": operational_score,
        "logbert_like_label": label,
        "base_v2_score": base_score,
        "risk_signal": risk_signal,
        "sla_not_found_count": sla_not_found_count,
        "error_count": error_count,
        "transition_ratio": transition_ratio,
        "rare_ratio": rare_ratio,
    })

out = pd.DataFrame(rows)
out.to_csv(OUTPUT_V3, index=False)

print(f"Saved {OUTPUT_V3} with {len(out)} rows")
print("")
print("Label distribution:")
print(out["logbert_like_label"].value_counts())
print("")
print("Top 20 operational LogBERT-like scores:")
print(
    out.sort_values("logbert_like_score", ascending=False)
    .head(20)[[
        "sequence_uid",
        "component_name",
        "logbert_like_score",
        "logbert_like_label",
        "base_v2_score",
        "risk_signal",
        "sla_not_found_count",
        "error_count",
        "start_timestamp",
        "end_timestamp",
    ]]
    .to_string(index=False)
)
