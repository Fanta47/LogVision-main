from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env"))


@dataclass
class Settings:
<<<<<<< HEAD
    PG_HOST: str = os.getenv("PG_HOST", "localhost")
    PG_PORT: int = int(os.getenv("PG_PORT", 5432))
    PG_DB: str = os.getenv("PG_DB", "logs")
    PG_USER: str = os.getenv("PG_USER", "logs_user")
    PG_PASSWORD: str = os.getenv("PG_PASSWORD", "logs_pass")
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./data/checkpoints")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "./data/outputs")
    DEVICE: str = os.getenv("DEVICE", "cpu")
=======
    PG_HOST: str = os.getenv("POSTGRES_HOST", os.getenv("PG_HOST", "localhost"))
    PG_PORT: int = int(os.getenv("POSTGRES_PORT", os.getenv("PG_PORT", 55432)))
    PG_DB: str = os.getenv("POSTGRES_DB", os.getenv("PG_DB", "logs"))
    PG_USER: str = os.getenv("POSTGRES_USER", os.getenv("PG_USER", "logs_user"))
    PG_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", os.getenv("PG_PASSWORD", "logs_pass"))
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./data/checkpoints")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "./data/outputs")
    DEVICE: str = os.getenv("DEVICE", "cpu")
    ML_MODEL_NAME: str = os.getenv("ML_MODEL_NAME", os.getenv("LOGBERT_MODEL_NAME", "logbert_like_distilbert_iforest"))
    ML_MODEL_VERSION: str = os.getenv("ML_MODEL_VERSION", os.getenv("LOGBERT_MODEL_VERSION", "logbert_v1_full"))
>>>>>>> 494bacd (Save workspace snapshot)


settings = Settings()
