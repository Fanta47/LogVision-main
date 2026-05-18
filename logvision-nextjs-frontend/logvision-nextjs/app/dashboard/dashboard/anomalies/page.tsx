"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Database,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MlAnomaly } from "@/types/ml";

function formatDate(value: string) {
  if (!value) return "N/A";

  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function labelClass(label: string) {
  if (label === "anomalous") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  if (label === "suspicious") {
    return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  }

  return "border-slate-500/40 bg-slate-500/10 text-slate-300";
}

export default function AnomaliesPage() {
  const [records, setRecords] = useState<MlAnomaly[]>([]);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnomalies() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiGet<MlAnomaly[]>("/api/ml/anomalies?limit=500");
        setRecords(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadAnomalies();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((item) => {
      const searchText = [
        item.application_key,
        item.component_name,
        item.anomaly_label,
        item.model_name,
        item.sequence_uid,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = searchText.includes(query.toLowerCase());

      const matchesLabel =
        labelFilter === "all" || item.anomaly_label === labelFilter;

      return matchesQuery && matchesLabel;
    });
  }, [records, query, labelFilter]);

  const stats = useMemo(() => {
    const anomalous = records.filter(
      (item) => item.anomaly_label === "anomalous"
    ).length;

    const suspicious = records.filter(
      (item) => item.anomaly_label === "suspicious"
    ).length;

    const maxScore =
      records.length > 0
        ? Math.max(...records.map((item) => item.anomaly_score))
        : 0;

    return {
      total: records.length,
      anomalous,
      suspicious,
      maxScore,
    };
  }, [records]);

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-red-400">
          Operations
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Anomalies
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Séquences détectées comme atypiques par le modèle ML LogVision.
          Données chargées depuis /api/ml/anomalies.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Chargement des anomalies depuis FastAPI...
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
                <p className="text-sm text-slate-400">Loaded records</p>
                <Database className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.total}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-300">Anomalous</p>
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-red-200">
                {stats.anomalous}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-300">Suspicious</p>
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-orange-200">
                {stats.suspicious}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Max score</p>
                <Activity className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.maxScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  ML anomaly sequences
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Filtrage local sur les données chargées depuis FastAPI.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search component, model, UID..."
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-red-500/50 md:w-80"
                  />
                </div>

                <select
                  value={labelFilter}
                  onChange={(event) => setLabelFilter(event.target.value)}
                  className="h-10 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-slate-200 outline-none transition focus:border-red-500/50"
                >
                  <option value="all">All labels</option>
                  <option value="anomalous">Anomalous</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Application</th>
                    <th className="px-4 py-3">Component</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Events</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Model</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {filtered.map((item) => (
                    <tr
                      key={item.sequence_uid}
                      className="bg-[#070b12] transition hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            labelClass(item.anomaly_label),
                          ].join(" ")}
                        >
                          {item.anomaly_label}
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
                        {item.event_count}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(item.start_timestamp)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(item.end_timestamp)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {item.model_name}:{item.model_version}
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Aucune anomalie trouvée pour ce filtre.
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