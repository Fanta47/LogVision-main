# Reproduction Kaggle dans LogVision

Ce document explique comment reproduire le workflow Kaggle dans ce projet LogVision.

## Objectif

Exécuter les scripts Kaggle disponibles dans `ml_service/kaggle_package` pour entraîner et scorer un modèle LogBERT-like, puis importer les résultats dans PostgreSQL et les exporter vers Elasticsearch.

## Contenu principal

- `ml_service/kaggle_package/scripts/train_logbert_kaggle_full.py`
- `ml_service/kaggle_package/scripts/train_logbert_kaggle_1k.py`
- `ml_service/ml_service/README.md`
- `ml_service/scripts/import_megacommon_fast_to_postgres.py`
- `ml_service/scripts/import_app_fast_to_postgres.py`
- `ml_service/scripts/write_scores_to_postgres.py`
- `ml_service/scripts/export_ml_scores_to_elasticsearch.py`

## Prérequis

- Python 3.11+ ou compatible
- Environnement virtuel dans `ml_service`
- PostgreSQL et Elasticsearch opérationnels
- Le dataset Kaggle doit être disponible sous forme de CSV/JSON prêt à charger dans `ml_service/data/` ou `ml_service/kaggle_package/data/`

## Installation de l'environnement ML

```bash
cd ml_service
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Exécution du pipeline Kaggle

1. Placer les données Kaggle dans `ml_service/kaggle_package/data/` ou `ml_service/data/`.
2. Pour entraîner le modèle complet (équilibré, cible 12000 séquences) :

```bash
cd ml_service\kaggle_package\scripts
python train_logbert_kaggle_full.py
```

3. Pour exécuter une version réduite (1 000 séquences) :

```bash
cd ml_service\kaggle_package\scripts
python train_logbert_kaggle_1k.py
```

## Pipeline ML générique

Dans `ml_service`, les scripts suivants forment le pipeline ML principal :

```bash
cd ml_service
python scripts\extract_events.py
python scripts\normalize_events.py
python scripts\build_sequences.py
python scripts\train_iforest.py
python scripts\train_kmeans.py
python scripts\train_logbert_embeddings.py
python scripts\compare_models.py
python scripts\write_scores_to_postgres.py
```

## Import dans PostgreSQL

- `ml_service/scripts/import_megacommon_fast_to_postgres.py`
- `ml_service/scripts/import_app_fast_to_postgres.py`

Ces scripts importent des événements Elasticsearch vers PostgreSQL en utilisant des index Elasticsearch configurés (`ES_INDEX`) et la table `base_event`.

## Export vers Elasticsearch

- `ml_service/scripts/export_ml_scores_to_elasticsearch.py`

Ce script lit la table `ml_sequence_score` dans PostgreSQL et écrit les scores ML vers l’index Elasticsearch configuré par `ES_ML_INDEX`.

## Endpoints FastAPI ML

Les endpoints ML exposés par FastAPI sont définis dans `backend/app/api/routes/ml.py` :

- `GET /api/ml/anomalies`
- `GET /api/ml/model-comparison`
- `GET /api/ml/model-summary`
- `GET /api/ml/status`
- `POST /api/ml/run-scoring`

## Frontend dashboard

Les pages `Next.js` correspondant aux vues demandées sont :

- `logvision-nextjs-frontend/logvision-nextjs/app/dashboard/models/page.tsx`
- `logvision-nextjs-frontend/logvision-nextjs/app/dashboard/kibana/page.tsx`
- `logvision-nextjs-frontend/logvision-nextjs/app/dashboard/reports/page.tsx`

## Notes importantes

- Le script `run_scoring` de FastAPI est désactivé en production : il renvoie un statut `disabled` et indique que le scoring est fait hors ligne.
- Le tableau de bord Kibana charge un dashboard intégré via `KIBANA_DASHBOARD_URL` dans `app/dashboard/kibana/page.tsx`.
- Les résultats ML sont historiquement stockés dans PostgreSQL puis éventuellement copiés vers Elasticsearch pour la visualisation Kibana.

## Conseils pour reproduire Kaggle

1. Vérifiez que les colonnes attendues par les scripts sont présentes : `sequence_text`, `event_ids`, `application_key`, `component_name`, `start_timestamp`, `end_timestamp`.
2. Utilisez d’abord `train_logbert_kaggle_1k.py` pour un test rapide.
3. Passez ensuite à `train_logbert_kaggle_full.py` pour un modèle final plus robuste.
4. Importez les scores dans PostgreSQL puis exportez-les vers Elasticsearch pour un dashboard Kibana complet.

---

Ce fichier documentation est un guide rapide pour exécuter le workflow Kaggle intégré à LogVision.