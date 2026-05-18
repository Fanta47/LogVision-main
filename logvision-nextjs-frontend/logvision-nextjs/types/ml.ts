export type MlAnomaly = {
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
