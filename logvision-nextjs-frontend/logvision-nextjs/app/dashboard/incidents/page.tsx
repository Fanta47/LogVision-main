"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Layers,
  Activity,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MlAnomaly } from "@/types/ml";

type Incident = {
  id: string;
  application_key: string;
  component_name: string;
  anomaly_count: number;
  max_score: number;
  severity: "Critical" | "Warning" | "Info";
  first_seen: string;
  last_seen: string;
  model_name: string;
  model_version: string;
};

function getSeverity(score: number, label: string): "Critical" | "Warning" | "Info" {
  if (label === "anomalous" || score >= 0.7) return "Critical";
  if (label === "suspicious" || score >= 0.3) return "Warning";
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

function buildIncidents(anomalies: MlAnomaly[]): Incident[] {
  const groups = new Map<string, MlAnomaly[]>();

  for (const item of anomalies) {
    const key = `${item.application_key}::${item.component_name}`;
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const [application_key, component_name] = key.split("::");

      const maxScore = Math.max(...items.map((item) => item.anomaly_score));

      const highestItem = items.reduce((max, item) =>
        item.anomaly_score > max.anomaly_score ? item : max
      );

      const sortedByStart = [...items].sort((a, b) =>
        a.start_timestamp.localeCompare(b.start_timestamp)
      );

      const sortedByEnd = [...items].sort((a, b) =>
        b.end_timestamp.localeCompare(a.end_timestamp)
      );

      return {
        id: `${application_key}-${component_name}`,
        application_key,
        component_name,
        anomaly_count: items.length,
        max_score: maxScore,
        severity: getSeverity(maxScore, highestItem.anomaly_label),
        first_seen: sortedByStart[0]?.start_timestamp || "",
        last_seen: sortedByEnd[0]?.end_timestamp || "",
        model_name: highestItem.model_name,
        model_version: highestItem.model_version,
      };
    })
    .sort((a, b) => b.max_score - a.max_score);
}

export default function IncidentsPage() {
  const [anomalies, setAnomalies] = useState<MlAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIncidents() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiGet<MlAnomaly[]>("/api/ml/anomalies?limit=500");
        setAnomalies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, []);

  const incidents = useMemo(() => buildIncidents(anomalies), [anomalies]);

  const stats = useMemo(() => {
    const critical = incidents.filter((item) => item.severity === "Critical").length;
    const warning = incidents.filter((item) => item.severity === "Warning").length;

    const maxScore =
      incidents.length > 0
        ? Math.max(...incidents.map((item) => item.max_score))
        : 0;

    return {
      total: incidents.length,
      critical,
      warning,
      maxScore,
    };
  }, [incidents]);

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-red-400">
          Operations
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Incidents
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Incidents candidats construits à partir des anomalies ML regroupées par
          application et composant.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Chargement des incidents depuis FastAPI...
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
                <p className="text-sm text-slate-400">Incident groups</p>
                <Layers className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.total}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-300">Critical incidents</p>
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-red-200">
                {stats.critical}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-300">Warning incidents</p>
                <AlertOctagon className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-orange-200">
                {stats.warning}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Highest score</p>
                <Activity className="h-5 w-5 text-slate-500" />
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
                  Candidate incidents
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Grouping rule: application_key + component_name
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
                    <th className="px-4 py-3">Anomalies</th>
                    <th className="px-4 py-3">Max score</th>
                    <th className="px-4 py-3">First seen</th>
                    <th className="px-4 py-3">Last seen</th>
                    <th className="px-4 py-3">Model</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {incidents.map((item) => (
                    <tr
                      key={item.id}
                      className="bg-[#070b12] transition hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            severityClass(item.severity),
                          ].join(" ")}
                        >
                          {item.severity}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-200">
                        {item.application_key}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.component_name}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.anomaly_count}
                      </td>

                      <td className="px-4 py-4 font-mono text-red-300">
                        {item.max_score.toFixed(6)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(item.first_seen)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(item.last_seen)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {item.model_name}:{item.model_version}
                      </td>
                    </tr>
                  ))}

                  {incidents.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Aucun incident candidat trouvé.
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