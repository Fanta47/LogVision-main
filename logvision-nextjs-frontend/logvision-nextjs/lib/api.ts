<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
﻿const API_BASE_URL =
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
=======
﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// lib/api.ts
=======
﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// lib/api.ts
>>>>>>> 22f3de9 (Initial LogVision commit)
=======
﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// lib/api.ts
>>>>>>> e97c9e7 (Fix: Kibana/Elasticsearch docker-compose configuration and CA path)
import { getAuthToken } from "./auth";

function resolveApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!raw) return "http://localhost:8000";
  try {
    const parsed = new URL(raw);
    if (!parsed.protocol.startsWith("http")) return "http://localhost:8000";
    if (!parsed.hostname || parsed.hostname.toLowerCase() === "localhost") return "http://localhost:8000";
    return parsed.origin;
  } catch {
    return "http://localhost:8000";
  }
}

const API_BASE = resolveApiBase();
export type SafeResult<T> = { data: T; error: string | null; usingFallback: boolean };

/** Helper to remove null/undefined/empty filters before sending to backend */
function cleanParams(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([_, v]) => v != null && v !== "" && v !== "all")
      .map(([key, value]) => [key, String(value)])
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", headers });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function safeFetch<T>(
  path: string,
  opts: RequestInit = {},
  fallback: T
): Promise<SafeResult<T>> {
  try {
    const token = typeof window !== "undefined" ? getAuthToken() : null;
    const headers = new Headers(opts.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    
    if (!res.ok) {
      let errorMessage = `http_${res.status}`;
      try {
        const body = await res.json();
        errorMessage = body?.detail || errorMessage;
      } catch (e) { /* ignore parse error */ }
      return { data: fallback, error: errorMessage, usingFallback: false };
    }

    const text = await res.text();
    if (!text || text.trim() === "") return { data: fallback, error: null, usingFallback: false };

    return { data: JSON.parse(text) as T, error: null, usingFallback: false };
  } catch {
    return { data: fallback, error: "unavailable", usingFallback: true };
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────
export const getProfile = () => safeFetch("/api/auth/me", {}, { id: 0, user: "", email: "", role: "Analyst", department: "" });
export const updateProfile = (payload: any) => 
  safeFetch("/api/auth/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { ok: true });
export const updatePassword = (payload: any) =>
  safeFetch("/api/auth/me/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { ok: true });

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function createPasswordResetRequest(
  email: string,
  reason?: string,
  requestedNewPassword?: string
): Promise<SafeResult<{ ok: boolean }>> {
  try {
    const token = typeof window !== "undefined" ? getAuthToken() : null;
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const targetUrl = `${API_BASE}/api/auth/password-reset-request`;
    console.debug("[forgot-password] POST", targetUrl);
    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, reason, requestedNewPassword }),
    });
    if (!res.ok) {
      const error = res.status === 422 ? "invalid_payload" : `http_${res.status}`;
      return { data: { ok: false }, error, usingFallback: false };
    }
    return { data: await res.json() as { ok: boolean }, error: null, usingFallback: false };
  } catch {
    return { data: { ok: false }, error: "unavailable", usingFallback: true };
  }
}

// ─── Admin — Users ────────────────────────────────────────────────────────────
export const getAdminUsers = () => safeFetch("/api/admin/users", {}, []);
export async function createAdminUser(payload: unknown): Promise<SafeResult<{ ok: boolean; id?: number }>> {
  try {
    const token = typeof window !== "undefined" ? getAuthToken() : null;
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${API_BASE}/api/admin/users`, { method: "POST", headers, body: JSON.stringify(payload) });
    if (res.ok) {
      return { data: (await res.json()) as { ok: boolean; id?: number }, error: null, usingFallback: false };
    }
    // try to parse backend error detail
    try {
      const body = await res.json();
      if ((res.status === 400 || res.status === 409) && body?.detail === "user_exists") {
        return { data: { ok: false }, error: "user_exists", usingFallback: false };
      }
      return { data: { ok: false }, error: body?.detail || `http_${res.status}`, usingFallback: false };
    } catch {
      return { data: { ok: false }, error: `http_${res.status}`, usingFallback: false };
    }
  } catch {
    return { data: { ok: false }, error: "unavailable", usingFallback: true };
  }
}
export const updateAdminUser = (id: number, payload: unknown) =>
  safeFetch(`/api/admin/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { ok: true });
export const disableAdminUser = (id: number) =>
  safeFetch(`/api/admin/users/${id}/disable`, { method: "POST" }, { ok: true });
export const enableAdminUser = (id: number) =>
  safeFetch(`/api/admin/users/${id}/enable`, { method: "POST" }, { ok: true });
export const deleteAdminUser = (id: number) =>
  safeFetch(`/api/admin/users/${id}`, { method: "DELETE" }, { ok: true });

// ─── Admin — Roles ────────────────────────────────────────────────────────────
export const getAdminRoles = () => safeFetch("/api/admin/roles", {}, { 
  roles: [] as any[], 
  permissions: [] as string[],
  logSources: [] as string[],
  features: [] as string[]
});
export const updateRoleMatrix = (type: 'permissions' | 'logs' | 'features', payload: any) =>
  safeFetch(`/api/admin/roles/matrix/${type}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { ok: true });

// ─── Admin — Alert Rules ──────────────────────────────────────────────────────
export const getAdminAlertRules = () => safeFetch("/api/admin/alert-rules", {}, []);
export const createAdminAlertRule = (payload: unknown) =>
  safeFetch("/api/admin/alert-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { ok: true });
export const updateAdminAlertRule = (id: number, payload: unknown) =>
  safeFetch(`/api/admin/alert-rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { ok: true });
export const deleteAdminAlertRule = (id: number) =>
  safeFetch(`/api/admin/alert-rules/${id}`, { method: "DELETE" }, { ok: true });

// ─── Admin — Configuration ────────────────────────────────────────────────────
const EMPTY_CONFIG = {
  parameters: {
    log_retention_days: 30,
    max_ingestion_rate: 0,
    anomaly_threshold: 0,
    alert_cooldown_minutes: 0,
    max_concurrent_queries: 0,
    logout_timeout_seconds: 15,
    kibana_url: "",
  },
  flags: {
    ml_predictions_enabled: false,
    keycloak_sso_enabled: false,
    kibana_integration: false,
    auto_incident_creation: false,
    debug_mode: false,
  },
};

export const getAdminConfiguration = () => safeFetch("/api/admin/configuration", {}, EMPTY_CONFIG);
export const updateAdminConfiguration = (payload: unknown) =>
  safeFetch("/api/admin/configuration", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { ok: true });

// ─── Admin — System Health ────────────────────────────────────────────────────
const EMPTY_SYSTEM = {
  servicesUp: "0/0",
  ingestionRate: "0/s",
  storageUsed: "0 B",
  avgCpu: "0%",
  services: [],
};

export const getAdminSystemHealth = () => safeFetch("/api/admin/system/health", {}, EMPTY_SYSTEM);
export const restartAdminService = (serviceId: string) =>
  safeFetch(`/api/admin/system/restart/${serviceId}`, { method: "POST" }, { ok: false });
export const restartAllAdminServices = () =>
  safeFetch(`/api/admin/system/restart-all`, { method: "POST" }, { ok: false, restarted_count: 0 });

// ─── Admin — Password Requests ────────────────────────────────────────────────
export const getPasswordResetRequests = () => safeFetch("/api/admin/password-reset-requests", {}, []);
export const approvePasswordResetRequest = (id: number, adminComment?: string, newPassword?: string) =>
  safeFetch(`/api/admin/password-reset-requests/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminComment, newPassword }) }, { ok: true });
export const rejectPasswordResetRequest = (id: number, adminComment?: string) =>
  safeFetch(`/api/admin/password-reset-requests/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminComment }) }, { ok: true });

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = () => safeFetch("/api/notifications", {}, []);
export const getUnreadNotificationCount = () => safeFetch("/api/notifications/unread-count", {}, { count: 0 });
export const markNotificationAsRead = (id: number) =>
  safeFetch(`/api/notifications/${id}/read`, { method: "POST" }, { ok: true });

// ─── Dashboard général ────────────────────────────────────────────────────────
export const getDashboardSummary = () => safeFetch("/api/dashboard/summary", {}, {
  totalLogs: 0, activeAlerts: 0, openIncidents: 0, anomaliesDetected: 0,
});
export const getLogs = () => safeFetch("/api/search/logs", {}, { logs: [], total: 0 });
export const getAlerts = () => safeFetch("/api/alerts", {}, []);
export const getAnomalies = () => safeFetch("/api/anomalies", {}, []);
export const getIncidents = () => safeFetch("/api/incidents", {}, []);

export type UploadLogResponse = {
  upload_uid?: string;
  original_file_name?: string;
  stored_file_name?: string;
  stored_path?: string;
  application_key?: string;
  component_name?: string;
  status?: string;
};

export const uploadLogFile = (
  payload: FormData,
  onProgress?: (pct: number) => void
): Promise<SafeResult<UploadLogResponse>> => {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const token = typeof window !== "undefined" ? getAuthToken() : null;

    xhr.open("POST", `${API_BASE}/api/logs/upload`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data: JSON.parse(xhr.responseText), error: null, usingFallback: false });
      } else {
        resolve({ data: {}, error: `http_${xhr.status}`, usingFallback: false });
      }
    };

    xhr.onerror = () => resolve({ data: {}, error: "unavailable", usingFallback: true });
    xhr.send(payload);
  });
};

export const getReports = () => safeFetch("/api/reports", {}, []);
export const getRiskByApplication = () => safeFetch("/api/ml/risk/applications", {}, [
]);

// ─── Manager ──────────────────────────────────────────────────────────────────
export const getManagerOverview = (range: string = "24h", application_key?: string) => {
  const query = new URLSearchParams({ range });
  if (application_key && application_key !== "all") query.append("application_key", application_key);
  return safeFetch(`/api/manager/overview?${query.toString()}`, {}, {
    totalAnomalies: 0, stabilityScore: 100, mttr: "0m", activeEngineers: "0/0", 
    crashRisk: 0, totalLogs: "0", monitoredApps: 0, systemHealth: "Healthy"
  });
};
export const getManagerTeam = () => safeFetch("/api/manager/team", {}, [
]);

export const getManagerAnomalies = (params: any) => {
  const query = new URLSearchParams(cleanParams(params)).toString();
  return safeFetch(`/api/manager/anomalies?${query}`, {}, { 
    items: [], 
    total: 0,
    score_status: "waiting_for_postgres_scores" 
  });
};

export const getManagerAlerts = (params: any) => {
  const query = new URLSearchParams(params).toString();
  return safeFetch(`/api/manager/alerts?${query}`, {}, []);
};

export const updateAlertStatus = (id: string, status: string) =>
  safeFetch(`/api/manager/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, { ok: true });

export const getManagerIncidents = (params: any) => {
  const query = new URLSearchParams(params).toString();
  return safeFetch(`/api/manager/incidents?${query}`, {}, []);
};

export const getManagerPredictions = (params: any) => {
  const query = new URLSearchParams(cleanParams(params)).toString();
  return safeFetch(`/api/manager/predictions?${query}`, {}, {
    items: [],
    total: 0,
    score_status: "waiting_for_postgres_scores",
  });
};

export const getMLUploads = () => 
  safeFetch("/api/ml/uploads", {}, []);

export const runDiagnosis = (uploadUid: string) =>
  safeFetch(`/api/ml/diagnose/${uploadUid}`, { method: "POST" }, { status: "error" });

export const forceResyncPipeline = (uploadUid: string) =>
  apiPost<{ status: string }>(`/api/ml/process/${uploadUid}`);

export const updateIncidentStatus = (id: string, status: string) =>
  safeFetch(`/api/manager/incidents/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, { ok: true });

export const assignIncidentOwner = (id: string, owner: string) =>
  safeFetch(`/api/manager/incidents/${id}/assign`, { method: "PATCH", body: JSON.stringify({ owner }) }, { ok: true });

export const getIncidentNotes = (id: string) =>
  safeFetch(`/api/manager/incidents/${id}/notes`, {}, []);

export const addIncidentNote = (id: string, note: string) =>
  safeFetch(`/api/manager/incidents/${id}/notes`, { method: "POST", body: JSON.stringify({ note }) }, { ok: true });

export const createIncidentFromAlert = (alertId: string) =>
  safeFetch(`/api/manager/alerts/${alertId}/incident`, { method: "POST" }, { id: "new-id" });

// ─── Log Search ──────────────────────────────────────────────────────────────
export const searchLogs = (params: any) => {
  const query = new URLSearchParams(cleanParams(params)).toString();
  return safeFetch(`/api/search/logs?${query}`, {}, { logs: [], total: 0 });
};

export const getSearchTaxonomy = () => 
  safeFetch<Record<string, string[]>>("/api/search/taxonomy", {}, {});

// ─── Reports ──────────────────────────────────────────────────────────────────
export const downloadReport = async (type: string, extension: string = "xlsx") => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/manager/reports/${type}.${extension}`, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error("Report generation failed");
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_${new Date().toISOString().split('T')[0]}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// ─── ML ───────────────────────────────────────────────────────────────────────
export const getMLDetailedStatus = () => 
  safeFetch("/api/ml/status", {}, {
    active_model: { name: "logbert_like_distilbert_iforest", version: "logbert_v1_full" },
    score_status: "waiting_for_postgres_scores",
    registry: []
  });

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    cache: "no-store",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export async function runMLScoring(): Promise<{ status: string; message: string; model_name?: string; model_version?: string }> {
  return apiPost("/api/ml/run-scoring");
}

export async function getModelComparison(): Promise<unknown[]> {
  return apiGet("/api/ml/model-comparison");
}

export async function getMLStatus(): Promise<unknown> {
  return apiGet("/api/ml/status");
}
>>>>>>> 494bacd (Save workspace snapshot)
