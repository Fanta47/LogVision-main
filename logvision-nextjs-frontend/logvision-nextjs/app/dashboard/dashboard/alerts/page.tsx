"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert, Activity, Clock3 } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MlAnomaly } from "@/types/ml";

function getSeverity(item: MlAnomaly) {
  if (item.anomaly_label === "anomalous" || item.anomaly_score >= 0.7) {
    return "Critical";
  }

  if (item.anomaly_label === "suspicious" || item.anomaly_score >= 0.3) {
    return "Warning";
  }

  return "Info";
}

function severityClass(severity: string) {
  if (severity === "Critical") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  if (severity === "Warning") {
    return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  }

  return "border-slate-500/40 bg-slate-500/10 text-slate-300";
}

function formatDate(value: string) {
  if (!value) return "N/A";

  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<MlAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiGet<MlAnomaly[]>("/api/ml/anomalies?limit=200");
        setAlerts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  const stats = useMemo(() => {
    const critical = alerts.filter(
      (item) => getSeverity(item) === "Critical"
    ).length;

    const warning = alerts.filter(
      (item) => getSeverity(item) === "Warning"
    ).length;

    const maxScore =
      alerts.length > 0
        ? Math.max(...alerts.map((item) => item.anomaly_score))
        : 0;

    const componentCounts = alerts.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.component_name] = (acc[item.component_name] || 0) + 1;
        return acc;
      },
      {}
    );

    const topComponent =
      Object.entries(componentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    return {
      total: alerts.length,
      critical,
      warning,
      maxScore,
      topComponent,
    };
  }, [alerts]);

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-red-400">
          Operations
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Alerts
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Alertes générées à partir des scores ML LogVision exposés par FastAPI.
          Les données affichées viennent de /api/ml/anomalies.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Chargement des alertes depuis FastAPI...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          Erreur de chargement : {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Total alerts</p>
                <Activity className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.total}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-300">Critical</p>
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-red-200">
                {stats.critical}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-300">Warning</p>
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-orange-200">
                {stats.warning}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Max score</p>
                <Clock3 className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.maxScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Active ML alerts
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Top component:{" "}
                  <span className="font-medium text-slate-200">
                    {stats.topComponent}
                  </span>
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-slate-400">
                Source: /api/ml/anomalies
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Application</th>
                    <th className="px-4 py-3">Component</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Events</th>
                    <th className="px-4 py-3">Start time</th>
                    <th className="px-4 py-3">Model</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {alerts.map((item) => {
                    const severity = getSeverity(item);

                    return (
                      <tr
                        key={item.sequence_uid}
                        className="bg-[#070b12] transition hover:bg-white/[0.04]"
                      >
                        <td className="px-4 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                              severityClass(severity),
                            ].join(" ")}
                          >
                            {severity}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-200">
                          {item.application_key}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.component_name}
                        </td>

                        <td className="px-4 py-4 font-mono text-red-300">
                          {item.anomaly_score.toFixed(6)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.anomaly_label}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.event_count}
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(item.start_timestamp)}
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {item.model_name}:{item.model_version}
                        </td>
                      </tr>
                    );
                  })}

                  {alerts.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Aucune alerte trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}