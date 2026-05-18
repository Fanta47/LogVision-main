import os
import numpy as np
import pandas as pd
import torch
from transformers import AutoTokenizer, AutoModel
from sklearn.ensemble import IsolationForest
import joblib

INPUT_PATH = "data/sequences.csv"
OUTPUT_PATH = "outputs/logbert_like_scores.csv"
EMBEDDINGS_PATH = "models/logbert_embeddings.npy"
MODEL_PATH = "models/logbert_like_iforest.joblib"

MODEL_NAME = "distilbert-base-uncased"

# Version légère pour éviter crash RAM/CPU.
MAX_TOTAL_ROWS = 8000
MAX_ROWS_PER_COMPONENT = 1800
BATCH_SIZE = 4
MAX_LENGTH = 64
RANDOM_STATE = 42

os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

print("Loading sequences...")
df = pd.read_csv(INPUT_PATH)

required_cols = [
    "sequence_uid",
    "application_key",
    "component_name",
    "start_timestamp",
    "end_timestamp",
    "event_ids",
    "sequence_text",
]

missing = [c for c in required_cols if c not in df.columns]
if missing:
    raise SystemExit(f"Missing columns: {missing}")

df["sequence_text"] = df["sequence_text"].fillna("").astype(str)
df["component_name"] = df["component_name"].fillna("unknown_component").astype(str)

print(f"Original sequences: {len(df)}")

# Échantillonnage stratifié par composant pour éviter de prendre seulement default/generic.
sampled_parts = []
for component, group in df.groupby("component_name"):
    n = min(len(group), MAX_ROWS_PER_COMPONENT)
    sampled_parts.append(group.sample(n=n, random_state=RANDOM_STATE))

work = pd.concat(sampled_parts, ignore_index=True)

if len(work) > MAX_TOTAL_ROWS:
    work = work.sample(n=MAX_TOTAL_ROWS, random_state=RANDOM_STATE).reset_index(drop=True)

print(f"Sampled sequences for LogBERT-light: {len(work)}")
print(work["component_name"].value_counts())

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

print("Loading tokenizer/model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model.to(device)
model.eval()

texts = work["sequence_text"].tolist()
embeddings = []

print("Encoding sequences...")
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
            print(f"Encoded {min(start + BATCH_SIZE, len(texts))}/{len(texts)}")

E = np.vstack(embeddings)
np.save(EMBEDDINGS_PATH, E)

print(f"Embeddings saved: {EMBEDDINGS_PATH}, shape={E.shape}")

print("Training IsolationForest on LogBERT embeddings...")
iso = IsolationForest(
    n_estimators=100,
    contamination="auto",
    random_state=RANDOM_STATE,
    n_jobs=-1,
)

iso.fit(E)

raw_scores = -iso.decision_function(E)

min_s = raw_scores.min()
max_s = raw_scores.max()
if max_s > min_s:
    scores = (raw_scores - min_s) / (max_s - min_s)
else:
    scores = np.zeros_like(raw_scores)

joblib.dump(
    {
        "model_name": MODEL_NAME,
        "max_length": MAX_LENGTH,
        "batch_size": BATCH_SIZE,
        "sample_size": len(work),
        "iforest": iso,
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

out["logbert_like_score"] = scores
out.to_csv(OUTPUT_PATH, index=False)

print(f"Saved {OUTPUT_PATH} with {len(out)} rows")
print("Top scores:")
print(
    out.sort_values("logbert_like_score", ascending=False)
    .head(10)
    .to_string(index=False)
)
