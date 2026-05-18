import hashlib
import os
import pandas as pd


INPUT_PATH = "data/events_normalized.csv"
OUTPUT_PATH = "data/sequences.csv"

WINDOW_SIZE = 20
STRIDE = 1


def safe_token(value):
    if pd.isna(value):
        return "UNKNOWN"
    value = str(value).strip()
    if not value:
        return "UNKNOWN"
    return (
        value.upper()
        .replace(" ", "_")
        .replace("-", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace(".", "_")
    )


def make_event_token(row):
    family = safe_token(row.get("log_family", "UNKNOWN"))
    event_type = safe_token(row.get("event_type", "UNKNOWN"))

    if family == "UNKNOWN" and event_type == "UNKNOWN":
        return "UNKNOWN_GENERIC"

    return f"{family}_{event_type}"


def make_sequence_uid(event_ids):
    raw = ",".join(str(x) for x in event_ids)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main():
    if not os.path.exists(INPUT_PATH):
        raise SystemExit(f"Error: {INPUT_PATH} not found")

    df = pd.read_csv(INPUT_PATH)

    required = [
        "id",
        "event_timestamp",
        "application_key",
        "component_name",
        "log_family",
        "event_type",
    ]

    missing = [c for c in required if c not in df.columns]
    if missing:
        raise SystemExit(f"Missing required columns: {missing}")

    df["event_timestamp"] = pd.to_datetime(df["event_timestamp"], errors="coerce")
    df = df.dropna(subset=["event_timestamp"])

    df["application_key"] = df["application_key"].fillna("unknown_app").astype(str)
    df["component_name"] = df["component_name"].fillna("unknown_component").astype(str)
    df["event_token"] = df.apply(make_event_token, axis=1)

    df = df.sort_values(["application_key", "component_name", "event_timestamp", "id"])

    rows = []

    grouped = df.groupby(["application_key", "component_name"], dropna=False)

    for (app, component), g in grouped:
        g = g.sort_values(["event_timestamp", "id"]).reset_index(drop=True)

        if len(g) < WINDOW_SIZE:
            continue

        for start in range(0, len(g) - WINDOW_SIZE + 1, STRIDE):
            window = g.iloc[start:start + WINDOW_SIZE]

            event_ids = window["id"].astype(str).tolist()
            tokens = window["event_token"].astype(str).tolist()

            rows.append({
                "sequence_uid": make_sequence_uid(event_ids),
                "application_key": app,
                "component_name": component,
                "start_timestamp": window["event_timestamp"].iloc[0],
                "end_timestamp": window["event_timestamp"].iloc[-1],
                "event_ids": ",".join(event_ids),
                "sequence_text": " ".join(tokens),
                "window_size": WINDOW_SIZE,
                "stride": STRIDE,
                "label": "",
                "anomaly_candidate": "",
                "severity": "unscored",
            })

    out = pd.DataFrame(rows)

    os.makedirs("data", exist_ok=True)
    out.to_csv(OUTPUT_PATH, index=False)

    print(f"Sequences built: {len(out)} -> {OUTPUT_PATH}")

    if len(out) > 0:
        print("Sample sequence:")
        print(out[["sequence_uid", "sequence_text"]].head(1).to_string(index=False))


if __name__ == "__main__":
    main()