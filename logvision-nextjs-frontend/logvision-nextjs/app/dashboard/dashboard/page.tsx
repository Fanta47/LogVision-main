"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  BarChart3,
  Database,
  ExternalLink,
  Layers,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MlAnomaly } from "@/types/ml";

type ComponentStat = {
  application_key: string;
  component_name: string;
  count: number;
  max_score: number;
};

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

export default function DashboardPage() {
  const [records, setRecords] = useState<MlAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
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

    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const anomalous = records.filter(
      (item) => item.anomaly_label === "anomalous"
    );

    const suspicious = records.filter(
      (item) => item.anomaly_label === "suspicious"
    );

    const maxScore =
      records.length > 0
        ? Math.max(...records.map((item) => item.anomaly_score))
        : 0;

    const componentStats = buildComponentStats(records);
    const topComponent = componentStats[0];

    const models = Array.from(
      new Set(records.map((item) => `${item.model_name}:${item.model_version}`))
    );

    return {
      total: records.length,
      anomalous: anomalous.length,
      suspicious: suspicious.length,
      maxScore,
      topComponent,
      componentStats,
      models,
    };
  }, [records]);

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-red-400">
          Operations
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Dashboard
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Vue globale de LogVision basée sur les scores ML réels exposés par
          FastAPI.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Chargement du dashboard depuis FastAPI...
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
                {summary.total}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-300">Anomalous</p>
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-red-200">
                {summary.anomalous}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-300">Suspicious</p>
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-orange-200">
                {summary.suspicious}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Max score</p>
                <Activity className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {summary.maxScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    System overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Résumé des anomalies détectées dans les composants analysés.
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-red-400" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Top affected component
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {summary.topComponent?.component_name || "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Application:{" "}
                    {summary.topComponent?.application_key || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Model used
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {summary.models[0] || "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Source: /api/ml/anomalies
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
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
                    {summary.componentStats.slice(0, 5).map((item) => (
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
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Quick access
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Accès aux vues principales.
                  </p>
                </div>
                <Layers className="h-5 w-5 text-slate-500" />
              </div>

              <div className="space-y-3">
                <Link
                  href="/dashboard/alerts"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Alerts</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/incidents"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Incidents</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/anomalies"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Anomalies</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/reports"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Reports</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/kibana"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Kibana</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
