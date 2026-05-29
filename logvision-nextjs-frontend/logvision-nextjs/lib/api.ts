const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `API GET failed: ${response.status} ${response.statusText} ${url} ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `API POST failed: ${response.status} ${response.statusText} ${url} ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

export type MlModelComparisonRow = {
  sequence_uid: string;
  application_key: string;
  component_name: string;
  start_timestamp?: string;
  end_timestamp?: string;
  iforest_baseline_score?: number;
  knn_baseline_score?: number;
  logbert_like_score?: number;
  final_anomaly_score?: number;
  final_anomaly_label: "normal" | "suspicious" | "anomalous" | string;
  model_name?: string;
  model_version?: string;
  event_count?: number;
  iforest_anomaly_score?: number;
  kmeans_anomaly_score?: number;
  knn_anomaly_score?: number;
};

export type ModelSummary = {
  total: number;
  avg_score: number;
  by_label: {
    final_anomaly_label: string;
    count: number;
    avg_score: number;
  }[];
  by_application: {
    application_key: string;
    count: number;
    avg_score: number;
  }[];
  by_component: {
    application_key: string;
    component_name: string;
    count: number;
    avg_score: number;
  }[];
  by_application_label: {
    application_key: string;
    final_anomaly_label: string;
    count: number;
    avg_score: number;
  }[];
  by_component_label: {
    application_key: string;
    component_name: string;
    final_anomaly_label: string;
    count: number;
    avg_score: number;
  }[];
};

export type MlAnomaly = {
  sequence_uid?: string;
  event_uid?: string;
  base_event_id?: number;
  application_key?: string;
  component_name?: string;
  anomaly_score: number;
  anomaly_label: "normal" | "suspicious" | "anomalous" | string;
  model_name?: string;
  model_version?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  created_at?: string;
};

export function getModelComparison(
  limit = 12000,
  filters?: {
    application_key?: string;
    component_name?: string;
    final_anomaly_label?: string;
  }
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (filters?.application_key && filters.application_key !== "all") {
    params.set("application_key", filters.application_key);
  }

  if (filters?.component_name && filters.component_name !== "all") {
    params.set("component_name", filters.component_name);
  }

  if (filters?.final_anomaly_label && filters.final_anomaly_label !== "all") {
    params.set("final_anomaly_label", filters.final_anomaly_label);
  }

  return apiGet<MlModelComparisonRow[]>(
    `/api/ml/model-comparison?${params.toString()}`
  );
}

export function getModelSummary() {
  return apiGet<ModelSummary>("/api/ml/model-summary");
}

export function getMlAnomalies(limit = 100) {
  return apiGet<MlAnomaly[]>(`/api/ml/anomalies?limit=${limit}`);
}

export function runMLScoring() {
  return apiPost<{ status: string; message?: string }>("/api/ml/run-scoring");
}