"""Smoke test: read a row from the runtime CSV and call /score_raw on the local server.

Usage:
    python smoke_test.py [CSV_PATH] [rows]

Example:
    python smoke_test.py logbert_like_scores_v2_full.csv 3
"""
from pathlib import Path
import sys
import requests
import pandas as pd

ROOT = Path(__file__).resolve().parent
DEFAULT_CSV = ROOT / "outputs" / "logbert_like_scores_v2_full.csv"
URL = "http://127.0.0.1:8000/score_raw"


def main(csv_path: Path, n: int = 1):
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}")
        return

    # Read header to inspect available columns without loading whole file
    df0 = pd.read_csv(csv_path, nrows=0)
    cols = set(df0.columns.tolist())

    preferred = None
    is_normalized = False
    if "iforest_raw" in cols:
        preferred = "iforest_raw"
        is_normalized = False
    elif "iforest" in cols:
        preferred = "iforest"
        is_normalized = False
    elif "logbert_like_score" in cols:
        preferred = "logbert_like_score"
        is_normalized = True
    elif "base_v2_score" in cols:
        preferred = "base_v2_score"
        is_normalized = True
    else:
        print("No suitable score column found in CSV header. Columns:", cols)
        return

    print(f"Using column: {preferred} (is_normalized={is_normalized})")

    df = pd.read_csv(csv_path, usecols=[preferred, "application_key"] if "application_key" in cols else [preferred], nrows=n)

    for idx, row in df.iterrows():
        raw = float(row[preferred])
        payload = {"raw": raw, "is_normalized": is_normalized}
        if "application_key" in row.index and pd.notnull(row.get("application_key")):
            payload["application_key"] = str(row["application_key"])

        try:
            r = requests.post(URL, json=payload, timeout=5)
            print(idx, payload, "->", r.status_code, r.json())
        except Exception as e:
            print("Request failed:", e)


if __name__ == "__main__":
    csv = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    main(csv, n=n)
