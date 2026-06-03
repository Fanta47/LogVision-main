<<<<<<< HEAD
﻿import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
          Reports
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white">
          LogVision Reports
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Synthèse opérationnelle des résultats ML LogVision. Cette page sert de
          point d’accès aux vues principales : le dashboard applicatif ML basé
          sur FastAPI/PostgreSQL et le dashboard analytique Kibana basé sur
          Elasticsearch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/models"
          className="rounded-2xl border border-white/10 bg-[#0b111b] p-5 transition hover:border-red-500/40 hover:bg-white/[0.03]"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            FastAPI / PostgreSQL
          </p>

          <h2 className="mt-2 text-lg font-bold text-white">
            ML Models Dashboard
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Consulte les statistiques globales du modèle LogBERT-like V4, les
            filtres par application, composant et label, ainsi que la table des
            séquences scorées.
          </p>

          <p className="mt-4 text-sm font-semibold text-red-300">
            Open ML Models →
          </p>
        </Link>

        <Link
          href="/dashboard/kibana"
          className="rounded-2xl border border-white/10 bg-[#0b111b] p-5 transition hover:border-red-500/40 hover:bg-white/[0.03]"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Elasticsearch / Kibana
          </p>

          <h2 className="mt-2 text-lg font-bold text-white">
            Kibana Analytics Dashboard
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Explore les visualisations Kibana : distribution des labels,
            anomalies par application, composants critiques, timeline et tableau
            des composants anormaux.
          </p>

          <p className="mt-4 text-sm font-semibold text-red-300">
            Open Kibana Analytics →
          </p>
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b111b] p-5">
        <h2 className="text-lg font-bold text-white">
          Architecture de visualisation
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">
              PostgreSQL
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Source principale des scores ML pour le backend FastAPI et le
              dashboard applicatif.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">
              FastAPI / Next.js
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Expose et affiche les statistiques globales, les filtres et les
              séquences scorées.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">
              Elasticsearch / Kibana
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Copie analytique des scores ML pour construire des dashboards
              exploratoires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
=======
﻿﻿"use client";

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
  Download,
  FileText,
  Printer,
  ChevronRight,
  Filter as FilterIcon,
  Check,
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
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

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

  const uniqueApps = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.application_key))).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedApps.length === 0) return records;
    return records.filter((r) => selectedApps.includes(r.application_key));
  }, [records, selectedApps]);

  const toggleApp = (app: string) => {
    setSelectedApps(prev => 
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );
  };

  const report = useMemo(() => {
    const anomalous = filteredRecords.filter(
      (item) => item.anomaly_label === "anomalous"
    );

    const suspicious = filteredRecords.filter(
      (item) => item.anomaly_label === "suspicious"
    );

    const normal = filteredRecords.filter((item) => item.anomaly_label === "normal");

    const maxScore =
      filteredRecords.length > 0
        ? Math.max(...filteredRecords.map((item) => item.anomaly_score))
        : 0;

    const highest =
      filteredRecords.length > 0
        ? filteredRecords.reduce((max, item) =>
            item.anomaly_score > max.anomaly_score ? item : max
          )
        : null;

    const componentStats = buildComponentStats(filteredRecords);

    const topComponent = componentStats[0];

    const models = Array.from(
      new Set(
        filteredRecords.map((item) => `${item.model_name}:${item.model_version}`)
      )
    );

    const firstTimestamp =
      filteredRecords.length > 0
        ? [...filteredRecords].sort((a, b) =>
            a.start_timestamp.localeCompare(b.start_timestamp)
          )[0]?.start_timestamp
        : "";

    const lastTimestamp =
      filteredRecords.length > 0
        ? [...filteredRecords].sort((a, b) =>
            b.end_timestamp.localeCompare(a.end_timestamp)
          )[0]?.end_timestamp
        : "";

    return {
      total: filteredRecords.length,
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
  }, [filteredRecords]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ["Sequence UID", "Application", "Component", "Score", "Label", "Start", "End"];
    const csvContent = [
      headers.join(","),
      ...filteredRecords.map(r => [
        r.sequence_uid,
        r.application_key,
        r.component_name,
        r.anomaly_score,
        r.anomaly_label,
        r.start_timestamp,
        r.end_timestamp
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `logvision_report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100 print:bg-white print:text-black">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-red-500">
            Intelligence
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
            Operational Reports
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-400">
            Synthèse opérationnelle basée sur les scores ML LogVision exposés par
            FastAPI. Cette page contient des données analytiques réelles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedApps([])}
            className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${selectedApps.length > 0 ? 'text-red-500 hover:underline' : 'hidden'}`}
          >
            Reset Filters
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-200 transition hover:bg-white/10"
          >
            <FileText className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/20 transition hover:scale-105"
          >
            <Printer className="h-4 w-4" />
            Print PDF
          </button>
        </div>
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
          {/* Multi-Select Application Filter */}
          <div className="mb-6 glass-card rounded-2xl border border-white/5 bg-white/[0.02] p-4 print:hidden">
            <div className="mb-3 flex items-center gap-2 px-1">
              <FilterIcon className="h-3 w-3 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter by Application</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueApps.map(app => {
                const isSelected = selectedApps.includes(app);
                return (
                  <button
                    key={app}
                    onClick={() => toggleApp(app)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                      isSelected 
                        ? "border-red-500/50 bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {app}
                  </button>
                );
              })}
              {uniqueApps.length === 0 && <span className="text-xs text-slate-600 italic px-1">No applications found in current records.</span>}
            </div>
          </div>

          {/* Risk Distribution Bar */}
          <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-white/5 flex print:border print:border-black">
            <div 
              className="h-full bg-red-500 transition-all duration-1000" 
              style={{ width: `${(report.anomalous / report.total) * 100}%` }}
              title={`Anomalous: ${report.anomalous}`}
            />
            <div 
              className="h-full bg-orange-500 transition-all duration-1000" 
              style={{ width: `${(report.suspicious / report.total) * 100}%` }}
              title={`Suspicious: ${report.suspicious}`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loaded records</p>
                <BarChart3 className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-4xl font-black text-white">
                {report.total}
              </p>
            </div>

            <div className="glass-card rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Anomalous</p>
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-4xl font-black text-red-400">
                {report.anomalous}
              </p>
            </div>

            <div className="glass-card rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Suspicious</p>
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-4 text-4xl font-black text-orange-400">
                {report.suspicious}
              </p>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Highest score</p>
                <Activity className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-4xl font-black text-white">
                {report.maxScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-6 xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Executive summary
                  </h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                    Vue synthétique des anomalies détectées par LogVision.
                  </p>
                </div>
                <Brain className="h-5 w-5 text-red-400" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Main affected component
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {report.topComponent?.component_name || "N/A"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-red-500/80">
                    Application: {report.topComponent?.application_key || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Model used
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {report.models[0] || "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Source: /api/ml/anomalies
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    First timestamp
                  </p>
                  <p className="mt-2 text-sm font-black font-mono text-slate-200">
                    {formatDate(report.firstTimestamp)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Last timestamp
                  </p>
                  <p className="mt-2 text-sm font-black font-mono text-slate-200">
                    {formatDate(report.lastTimestamp)}
                  </p>
                </div>
              </div>

              {report.highest && (
                <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
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

            <div className="glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-6 print:hidden">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Navigation
                  </h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                    Accès aux vues détaillées.
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-slate-500" />
              </div>

              <div className="space-y-4">
                <Link
                  href="/dashboard/anomalies"
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/40 px-5 py-4 text-sm font-bold text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Anomalies details</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/models"
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/40 px-5 py-4 text-sm font-bold text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>ML Models</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/kibana"
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/40 px-5 py-4 text-sm font-bold text-slate-300 transition hover:border-red-500/40 hover:text-white"
                >
                  <span>Kibana dashboard</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 glass-card rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  Component breakdown
                </h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
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
>>>>>>> 494bacd (Save workspace snapshot)
