from __future__ import annotations

import argparse
<<<<<<< HEAD
import os
from typing import List

import numpy as np
import pandas as pd
import torch

from .config import settings
from .dataset import SequenceDataset
from .model import LogBERTLike
from .utils import ensure_dir


def infer(checkpoint: str, sequences_path: str) -> str:
=======
import uuid
from typing import List

import numpy as np
import torch

from .config import settings
from .model import LogBERTLike
from .score_store import write_raw_inference_scores, write_scores_with_metadata


def infer(
    checkpoint: str,
    sequences_path: str,
    metadata_path: str | None = None,
    model_name: str | None = None,
    model_version: str | None = None,
    run_uid: str | None = None,
    replace_existing: bool = False,
) -> dict:
>>>>>>> 494bacd (Save workspace snapshot)
    seqs = np.load(sequences_path)
    if seqs.shape[0] == 0:
        raise SystemExit("No sequences available for inference.")

    # get dims
    seq_len, feat_dim = seqs.shape[1], seqs.shape[2]
    model = LogBERTLike(feature_dim=feat_dim)
    ckpt = torch.load(checkpoint, map_location=settings.DEVICE)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    scores: List[float] = []
    with torch.no_grad():
        for seq in seqs:
            tensor = torch.from_numpy(seq).unsqueeze(0)
            out = model(tensor)
            target = tensor.mean(dim=1)
            mse = torch.mean((out - target) ** 2).item()
            scores.append(mse)

<<<<<<< HEAD
    ensure_dir(settings.OUTPUT_DIR)
    out_path = os.path.join(settings.OUTPUT_DIR, "inference_scores.csv")
    pd.DataFrame({"score": scores}).to_csv(out_path, index=False)
    return out_path
=======
    active_model_name = model_name or settings.ML_MODEL_NAME
    active_model_version = model_version or settings.ML_MODEL_VERSION
    active_run_uid = run_uid or uuid.uuid4().hex

    if metadata_path:
        inserted = write_scores_with_metadata(
            scores,
            metadata_path,
            model_name=active_model_name,
            model_version=active_model_version,
            replace_existing=replace_existing,
        )
        target_table = "ml_sequence_score"
    else:
        inserted = write_raw_inference_scores(
            scores,
            run_uid=active_run_uid,
            model_name=active_model_name,
            model_version=active_model_version,
        )
        target_table = "ml_inference_score"

    return {
        "status": "stored",
        "target_table": target_table,
        "stored_scores": inserted,
        "run_uid": active_run_uid,
        "model_name": active_model_name,
        "model_version": active_model_version,
    }
>>>>>>> 494bacd (Save workspace snapshot)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--sequences", default="./data/processed/sequences.npy")
<<<<<<< HEAD
    args = parser.parse_args()
    out = infer(args.checkpoint, args.sequences)
    print("Saved inference output to", out)
=======
    parser.add_argument("--metadata", default=None)
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--model-version", default=None)
    parser.add_argument("--run-uid", default=None)
    parser.add_argument("--replace-existing", action="store_true")
    args = parser.parse_args()
    out = infer(
        args.checkpoint,
        args.sequences,
        metadata_path=args.metadata,
        model_name=args.model_name,
        model_version=args.model_version,
        run_uid=args.run_uid,
        replace_existing=args.replace_existing,
    )
    print(out)
>>>>>>> 494bacd (Save workspace snapshot)
