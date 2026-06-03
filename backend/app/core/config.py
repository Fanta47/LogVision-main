from functools import lru_cache
import os


class Settings:
    app_name: str
    app_env: str
    database_url: str
    es_url: str
    es_index: str
    es_username: str | None
    es_password: str | None
    es_ca_cert: str | None
    ml_model_name: str
    ml_model_version: str
    ml_model_artifact_path: str
    ml_scores_csv_path: str

    def __init__(self) -> None:
        self.app_name = os.getenv("APP_NAME", "LogVision Backend")
        self.app_env = os.getenv("APP_ENV", "docker")
        self.database_url = os.getenv(
            "DATABASE_URL", "postgresql://logs_user:logs_pass@postgres:5432/logs"
        )
        self.es_url = os.getenv("ES_URLS", os.getenv("ES_URL", "https://es01:9200"))
        self.es_index = os.getenv("ES_INDEX", "lvlogs-*")
        self.es_username = os.getenv("ES_USERNAME")
        self.es_password = os.getenv("ES_PASSWORD")
        self.es_ca_cert = os.getenv("ES_CA_CERT")
        self.ml_model_name = os.getenv("ML_MODEL_NAME", "logbert_like_distilbert_iforest")
        self.ml_model_version = os.getenv("ML_MODEL_VERSION", "logbert_v1_full")
        self.ml_model_artifact_path = os.getenv(
            "ML_MODEL_ARTIFACT_PATH",
            "ml_service/logbert_v1_full_runtime",
        )
        self.ml_scores_csv_path = os.getenv(
            "ML_SCORES_CSV_PATH",
            "ml_service/logbert_v1_full_runtime/outputs/logbert_v1_full_scores.csv",
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
