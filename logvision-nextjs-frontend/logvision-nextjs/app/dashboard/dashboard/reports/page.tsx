"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Layers,
  ExternalLink,
  Brain,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MlAnomaly } from "@/types/ml";

type ComponentStat = {
  component_name: string;
  application_key: string;
  count: number;
  max_score: number;
};

function formatDate(value: string) {
  if (!value) return "N/A";

  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function buildComponentStats(items: MlAnomaly[]): ComponentStat[] {
  const groups = new Map<string, MlAnomaly[]>();

  for (const item of items) {
    const key = `${item.application_key}::${item.component_name}`;
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, values]) => {
      const [application_key, component_name] = key.split("::");

      return {
        application_key,
        component_name,
        count: values.length,
        max_score: Math.max(...values.map((item) => item.anomaly_score)),
      };
    })
    .sort((a, b) => b.max_score - a.max_score);
}

export default function ReportsPage() {
  const [records, setRecords] = useState<MlAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReportData() {
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

    loadReportData();
  }, []);

  const report = useMemo(() => {
    const anomalous = records.filter(
      (item) => item.anomaly_label === "anomalous"
    );

    const suspicious = records.filter(
      (item) => item.anomaly_label === "suspicious"
    );

    const normal = records.filter((item) => item.anomaly_label === "normal");

    const maxScore =
      records.length > 0
        ? Math.max(...records.map((item) => item.anomaly_score))
        : 0;

    const highest =
      records.length > 0
        ? records.reduce((max, item) =>
            item.anomaly_score > max.anomaly_score ? item : max
          )
        : null;

    const componentStats = buildComponentStats(records);

    const topComponent = componentStats[0];

    const models = Array.from(
      new Set(
        records.map((item) => `${item.model_name}:${item.model_version}`)
      )
    );

    const firstTimestamp =
      records.length > 0
        ? [...records].sort((a, b) =>
            a.start_timestamp.localeCompare(b.start_timestamp)
          )[0]?.start_timestamp
        : "";

    const lastTimestamp =
      records.length > 0
        ? [...records].sort((a, b) =>
            b.end_timestamp.localeCompare(a.end_timestamp)
          )[0]?.end_timestamp
        : "";

    return {
      total: records.length,
      anomalous: anomalous.length,
      suspicious: suspicious.length,
      normal: normal.length,
      maxScore,
      highest,
      topComponent,
      componentStats,
      models,
      firstTimestamp,
      lastTimestamp,
    };
  }, [records]);

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-red-400">
          Intelligence
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Reports
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          SynthÃ¨se opÃ©rationnelle basÃ©e sur les scores ML LogVision exposÃ©s par
          FastAPI. Cette page ne contient pas de donnÃ©es fictives.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Chargement du rapport depuis FastAPI...
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
                <BarChart3 className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {report.total}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-300">Anomalous</p>
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-red-200">
                {report.anomalous}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-300">Suspicious</p>
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-orange-200">
                {report.suspicious}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Highest score</p>
                <Activity className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {report.maxScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Executive summary
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Vue synthÃ©tique des anomalies dÃ©tectÃ©es par LogVision.
                  </p>
                </div>
                <Brain className="h-5 w-5 text-red-400" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Main affected component
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {report.topComponent?.component_name || "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Application: {report.topComponent?.application_key || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Model used
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {report.models[0] || "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Source: /api/ml/anomalies
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    First timestamp
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-200">
                    {formatDate(report.firstTimestamp)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Last timestamp
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-200">
                    {formatDate(report.lastTimestamp)}
                  </p>
                </div>
              </div>

              {report.highest && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-red-300">
                    Highest-risk sequence
                  </p>

                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <p className="text-slate-300">
                      Component:{" "}
                      <span className="font-medium text-white">
                        {report.highest.component_name}
                      </span>
                    </p>

                    <p className="text-slate-300">
                      Score:{" "}
                      <span className="font-mono font-medium text-red-200">
                        {report.highest.anomaly_score.toFixed(6)}
                      </span>
                    </p>

                    <p className="text-slate-300">
                      Label:{" "}
                      <span className="font-medium text-red-200">
                        {report.highest.anomaly_label}
                      </span>
                    </p>

                    <p className="text-slate-300">
                      Events:{" "}
                      <span className="font-medium text-white">
                        {report.highest.event_count}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Navigation
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    AccÃ¨s aux vues dÃ©taillÃ©es.
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-slate-500" />
              </div>

              <div className="space-y-3">
                <Link
                  href="/dashboard/anomalies"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Anomalies details</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/models"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>ML Models</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/kibana"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Kibana dashboard</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Component breakdown
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Classement des composants par score ML maximal.
                </p>
              </div>
              <Layers className="h-5 w-5 text-slate-500" />
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Application</th>
                    <th className="px-4 py-3">Component</th>
                    <th className="px-4 py-3">Records</th>
                    <th className="px-4 py-3">Max score</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {report.componentStats.map((item) => (
                    <tr
                      key={`${item.application_key}-${item.component_name}`}
                      className="bg-[#070b12] transition hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-4 font-medium text-slate-200">
                        {item.application_key}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.component_name}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.count}
                      </td>

                      <td className="px-4 py-4 font-mono text-red-300">
                        {item.max_score.toFixed(6)}
                      </td>
                    </tr>
                  ))}

                  {report.componentStats.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Aucune donnÃ©e disponible pour le rapport.
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
