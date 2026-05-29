import os
import numpy as np
import pandas as pd

INPUT_V3 = "outputs/logbert_like_scores_v3.csv"
OUTPUT_V4 = "outputs/logbert_like_scores_v4.csv"

if not os.path.exists(INPUT_V3):
    raise SystemExit(f"Missing file: {INPUT_V3}")

df = pd.read_csv(INPUT_V3)

required = [
    "sequence_uid",
    "application_key",
    "component_name",
    "start_timestamp",
    "end_timestamp",
    "event_ids",
    "logbert_like_score",
    "risk_signal",
    "sla_not_found_count",
    "error_count",
]

missing = [c for c in required if c not in df.columns]
if missing:
    raise SystemExit(f"Missing columns: {missing}")

df["component_name"] = df["component_name"].fillna("unknown").astype(str)
df["risk_signal"] = pd.to_numeric(df["risk_signal"], errors="coerce").fillna(0.0)
df["sla_not_found_count"] = pd.to_numeric(df["sla_not_found_count"], errors="coerce").fillna(0)
df["error_count"] = pd.to_numeric(df["error_count"], errors="coerce").fillna(0)
df["base_v3_score"] = pd.to_numeric(df["logbert_like_score"], errors="coerce").fillna(0.0)

# 1. Base score from V3
df["calibrated_base_score"] = df["base_v3_score"].copy()

# 2. Reduce generic low-risk default/loginit sequences.
generic_components = {"default", "loginit"}

generic_low_risk = (
    df["component_name"].str.lower().isin(generic_components)
    & (df["sla_not_found_count"] == 0)
    & (df["error_count"] == 0)
    & (df["risk_signal"] < 0.50)
)

df.loc[generic_low_risk, "calibrated_base_score"] = np.minimum(
    df.loc[generic_low_risk, "calibrated_base_score"],
    0.58,
)

# 3. Rank-based calibration.
rank = df["calibrated_base_score"].rank(method="average", pct=True)
df["rank_score"] = rank

ANOMALOUS_Q = 0.98
SUSPICIOUS_Q = 0.85

scores = []
for_rank = df["rank_score"].to_numpy()

for r in for_rank:
    if r >= ANOMALOUS_Q:
        # Top 2% -> 0.70 to 0.95
        s = 0.70 + ((r - ANOMALOUS_Q) / (1.0 - ANOMALOUS_Q)) * 0.25
    elif r >= SUSPICIOUS_Q:
        # 85% to 98% -> 0.45 to 0.69
        s = 0.45 + ((r - SUSPICIOUS_Q) / (ANOMALOUS_Q - SUSPICIOUS_Q)) * 0.24
    else:
        # Rest -> 0.05 to 0.44
        s = 0.05 + (r / SUSPICIOUS_Q) * 0.39

    scores.append(max(0.0, min(1.0, s)))

df["logbert_like_score"] = scores

# 4. Hard cap: generic low-risk sequences should not become anomalous.
df.loc[generic_low_risk, "logbert_like_score"] = np.minimum(
    df.loc[generic_low_risk, "logbert_like_score"],
    0.69,
)

def label(score: float) -> str:
    if score >= 0.70:
        return "anomalous"
    if score >= 0.45:
        return "suspicious"
    return "normal"

df["logbert_like_label"] = df["logbert_like_score"].apply(label)

df.to_csv(OUTPUT_V4, index=False)

print(f"Saved {OUTPUT_V4} with {len(df)} rows")
print("")
print("Label distribution:")
print(df["logbert_like_label"].value_counts())
print("")
print("Anomalous by component:")
print(
    df[df["logbert_like_label"] == "anomalous"]
    .groupby("component_name")
    .size()
    .sort_values(ascending=False)
)
print("")
print("Top 20 V4 scores:")
print(
    df.sort_values("logbert_like_score", ascending=False)
    .head(20)[[
        "sequence_uid",
        "component_name",
        "logbert_like_score",
        "logbert_like_label",
        "base_v3_score",
        "risk_signal",
        "sla_not_found_count",
        "error_count",
    ]]
    .to_string(index=False)
)
