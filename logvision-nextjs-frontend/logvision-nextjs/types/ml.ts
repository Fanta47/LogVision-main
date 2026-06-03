<<<<<<< HEAD
﻿export type MlAnomaly = {
=======
export type MlAnomaly = {
>>>>>>> 494bacd (Save workspace snapshot)
  sequence_uid: string;
  application_key: string;
  component_name: string;
  start_timestamp: string;
  end_timestamp: string;
  anomaly_score: number;
  anomaly_label: string;
  model_name: string;
  model_version: string;
  event_count: number;
};
<<<<<<< HEAD
=======

export type MlModelStatus = {
  status: string;
  model_name: string;
  model_version: string;
  artifact_path?: string;
  scores_csv_path?: string;
  score_status?: "loaded" | "waiting_for_csv" | string;
  sequence_scores: number;
  message?: string;
};

export type MlModelComparisonRow = {
  sequence_uid: string;
  application_key: string;
  component_name: string;
  iforest_anomaly_score?: number;
  kmeans_anomaly_score?: number;
  knn_anomaly_score?: number;
  logbert_like_score?: number;
  final_anomaly_score?: number;
  final_anomaly_label?: string;
};
>>>>>>> 494bacd (Save workspace snapshot)
