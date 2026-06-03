<<<<<<< HEAD
﻿"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getModelComparison,
  getModelSummary,
  type ModelSummary,
} from "@/lib/api";

type ModelRow = {
  sequence_uid: string;
  application_key: string;
  component_name: string;
  logbert_like_score?: number;
  final_anomaly_score?: number;
  final_anomaly_label?: string;
  model_name?: string;
  model_version?: string;
  event_count?: number;
  start_timestamp?: string;
  end_timestamp?: string;
};

type LabelFilter = "all" | "anomalous" | "suspicious" | "normal";

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function shortUid(uid: string) {
  if (!uid) return "-";
  return `${uid.slice(0, 12)}...${uid.slice(-6)}`;
}

function scoreOf(row: ModelRow) {
  return toNumber(row.final_anomaly_score ?? row.logbert_like_score);
}

function scoreClass(score: number) {
  if (score >= 0.7) return "text-red-400";
  if (score >= 0.45) return "text-amber-300";
  return "text-emerald-300";
}

function labelClass(label: string) {
  if (label === "anomalous") {
    return "border-red-500/30 bg-red-500/15 text-red-300";
  }

  if (label === "suspicious") {
    return "border-amber-500/30 bg-amber-500/15 text-amber-300";
  }

  return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
}

function averageScore(rows: ModelRow[]) {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + scoreOf(row), 0) / rows.length;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function ModelsPage() {
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ModelSummary | null>(null);

  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [applicationFilter, setApplicationFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    Promise.all([
      getModelComparison(12000, {
        application_key: applicationFilter,
        component_name: componentFilter,
        final_anomaly_label: labelFilter,
      }),
      getModelSummary(),
    ])
      .then(([comparisonData, summaryData]) => {
        if (cancelled) return;

        const cleaned = (comparisonData as ModelRow[]).map((row) => ({
          ...row,
          application_key: row.application_key ?? "unknown",
          component_name: row.component_name ?? "unknown",
          final_anomaly_label: row.final_anomaly_label ?? "normal",
        }));

        cleaned.sort((a, b) => scoreOf(b) - scoreOf(a));

        setRows(cleaned);
        setSummary(summaryData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationFilter, componentFilter, labelFilter]);

  const applications = useMemo(() => {
    return summary?.by_application.map((item) => item.application_key).sort() ?? [];
  }, [summary]);

  const components = useMemo(() => {
    const source =
      summary?.by_component.filter((item) =>
        applicationFilter === "all"
          ? true
          : item.application_key === applicationFilter
      ) ?? [];

    return Array.from(new Set(source.map((item) => item.component_name))).sort();
  }, [summary, applicationFilter]);

  const scopedRows = useMemo(() => {
    return rows;
  }, [rows]);

  const tableRows = useMemo(() => {
    return scopedRows;
  }, [scopedRows]);

  const stats = useMemo(() => {
    const getScopeTotal = () => {
      if (!summary) return scopedRows.length;

      if (applicationFilter !== "all" && componentFilter !== "all") {
        return (
          summary.by_component.find(
            (item) =>
              item.application_key === applicationFilter &&
              item.component_name === componentFilter
          )?.count ?? 0
        );
      }

      if (applicationFilter !== "all") {
        return (
          summary.by_application.find(
            (item) => item.application_key === applicationFilter
          )?.count ?? 0
        );
      }

      return summary.total;
    };

    const getScopeAvg = () => {
      if (!summary) return averageScore(scopedRows);

      if (applicationFilter !== "all" && componentFilter !== "all") {
        return (
          summary.by_component.find(
            (item) =>
              item.application_key === applicationFilter &&
              item.component_name === componentFilter
          )?.avg_score ?? 0
        );
      }

      if (applicationFilter !== "all") {
        return (
          summary.by_application.find(
            (item) => item.application_key === applicationFilter
          )?.avg_score ?? 0
        );
      }

      return summary.avg_score ?? averageScore(scopedRows);
    };

    const getLabelStats = (label: string) => {
      if (!summary) {
        const filtered = scopedRows.filter(
          (r) => r.final_anomaly_label === label
        );

        return {
          count: filtered.length,
          avg: averageScore(filtered),
        };
      }

      if (applicationFilter !== "all" && componentFilter !== "all") {
        const row = summary.by_component_label.find(
          (item) =>
            item.application_key === applicationFilter &&
            item.component_name === componentFilter &&
            item.final_anomaly_label === label
        );

        return {
          count: row?.count ?? 0,
          avg: row?.avg_score ?? 0,
        };
      }

      if (applicationFilter !== "all") {
        const row = summary.by_application_label.find(
          (item) =>
            item.application_key === applicationFilter &&
            item.final_anomaly_label === label
        );

        return {
          count: row?.count ?? 0,
          avg: row?.avg_score ?? 0,
        };
      }

      const row = summary.by_label.find(
        (item) => item.final_anomaly_label === label
      );

      return {
        count: row?.count ?? 0,
        avg: row?.avg_score ?? 0,
      };
    };

    const anomalous = getLabelStats("anomalous");
    const suspicious = getLabelStats("suspicious");
    const normal = getLabelStats("normal");

    return {
      total: getScopeTotal(),
      allAvg: getScopeAvg(),

      anomalousCount: anomalous.count,
      anomalousAvg: anomalous.avg,

      suspiciousCount: suspicious.count,
      suspiciousAvg: suspicious.avg,

      normalCount: normal.count,
      normalAvg: normal.avg,
    };
  }, [summary, scopedRows, applicationFilter, componentFilter]);

  function resetFilters() {
    setLabelFilter("all");
    setApplicationFilter("all");
    setComponentFilter("all");
=======
"use client";

import { useEffect, useState } from "react";
import { Brain, Database, Play, Wrench } from "lucide-react";
import { toast } from "sonner";
import { getMLStatus, getModelComparison, runMLScoring } from "@/lib/api";
import type { MlModelComparisonRow, MlModelStatus } from "@/types/ml";

export default function ModelsPage() {
  const [rows, setRows] = useState<MlModelComparisonRow[]>([]);
  const [status, setStatus] = useState<MlModelStatus | null>(null);
  const [running, setRunning] = useState(false);

  async function refresh() {
    getMLStatus().then((data) => setStatus(data as MlModelStatus)).catch(() => setStatus(null));
    getModelComparison().then((data) => setRows(data as MlModelComparisonRow[])).catch(() => setRows([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function run() {
    setRunning(true);
    try {
      const res = await runMLScoring();
      toast.success(res.message || "ML scoring status refreshed");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ML scoring failed");
    } finally {
      setRunning(false);
    }
>>>>>>> 494bacd (Save workspace snapshot)
  }

  return (
    <div className="space-y-6">
<<<<<<< HEAD
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
          Intelligence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          LogBERT-like V4
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Primary anomaly scoring model. Global counters are calculated from the
          full imported Kaggle dataset, while the table loads a limited,
          filtered result set from the backend.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#0b111b] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current scope
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">All sequences</h2>
          <p className="mt-3 text-3xl font-bold text-slate-200">
            {formatNumber(stats.total)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg score: {stats.allAvg.toFixed(3)}
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/25 bg-[#0b111b] p-5 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Critical
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">Anomalous</h2>
          <p className="mt-3 text-3xl font-bold text-red-300">
            {formatNumber(stats.anomalousCount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg score: {stats.anomalousAvg.toFixed(3)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-[#0b111b] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Warning
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">Suspicious</h2>
          <p className="mt-3 text-3xl font-bold text-amber-300">
            {formatNumber(stats.suspiciousCount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg score: {stats.suspiciousAvg.toFixed(3)}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-[#0b111b] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Stable
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">Normal</h2>
          <p className="mt-3 text-3xl font-bold text-emerald-300">
            {formatNumber(stats.normalCount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg score: {stats.normalAvg.toFixed(3)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b111b] p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Application
            </label>
            <select
              value={applicationFilter}
              onChange={(e) => {
                setApplicationFilter(e.target.value);
                setComponentFilter("all");
              }}
              className="w-full rounded-xl border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white outline-none focus:border-red-500/60"
            >
              <option value="all">All applications</option>
              {applications.map((app) => (
                <option key={app} value={app}>
                  {app}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Log type / component
            </label>
            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#070b12] px-3 py-2 text-sm text-white outline-none focus:border-red-500/60"
            >
              <option value="all">All log types</option>
              {components.map((component) => (
                <option key={component} value={component}>
                  {component}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => setLabelFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              labelFilter === "all"
                ? "bg-white text-black"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            All ({formatNumber(stats.total)})
          </button>

          <button
            onClick={() => setLabelFilter("anomalous")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              labelFilter === "anomalous"
                ? "bg-red-500 text-white"
                : "bg-red-500/10 text-red-300 hover:bg-red-500/20"
            }`}
          >
            Anomalous ({formatNumber(stats.anomalousCount)})
          </button>

          <button
            onClick={() => setLabelFilter("suspicious")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              labelFilter === "suspicious"
                ? "bg-amber-500 text-black"
                : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            Suspicious ({formatNumber(stats.suspiciousCount)})
          </button>

          <button
            onClick={() => setLabelFilter("normal")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              labelFilter === "normal"
                ? "bg-emerald-500 text-black"
                : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            Normal ({formatNumber(stats.normalCount)})
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Active scope:{" "}
          <span className="text-slate-300">
            {applicationFilter === "all" ? "all applications" : applicationFilter}
          </span>{" "}
          /{" "}
          <span className="text-slate-300">
            {componentFilter === "all" ? "all log types" : componentFilter}
          </span>
          . Showing{" "}
          <span className="text-slate-300">{formatNumber(tableRows.length)}</span>{" "}
          rows from the filtered backend result. The cards use full-dataset
          aggregate statistics.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b111b]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-white">
            LogBERT scored sequences
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Filter by application, log type and anomaly label. The table is
            intentionally limited to at most 12,000 rows to avoid loading more
            than one million records in the browser.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-400">
            Loading LogBERT scores...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#070b12] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sequence</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Log type</th>
                  <th className="px-4 py-3">LogBERT score</th>
                  <th className="px-4 py-3">Final score</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {tableRows.map((r) => {
                  const logbert = toNumber(r.logbert_like_score);
                  const final = scoreOf(r);
                  const label = r.final_anomaly_label ?? "normal";

                  return (
                    <tr
                      key={r.sequence_uid}
                      className="hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {shortUid(r.sequence_uid)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {r.application_key}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {r.component_name}
                      </td>

                      <td
                        className={`px-4 py-3 font-semibold ${scoreClass(
                          logbert
                        )}`}
                      >
                        {logbert.toFixed(3)}
                      </td>

                      <td
                        className={`px-4 py-3 font-semibold ${scoreClass(
                          final
                        )}`}
                      >
                        {final.toFixed(3)}
                      </td>

                      <td className="px-4 py-3 text-slate-400">
                        {r.event_count ?? 20}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${labelClass(
                            label
                          )}`}
                        >
                          {label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.start_timestamp ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.end_timestamp ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {tableRows.length === 0 && (
              <div className="p-6 text-sm text-slate-400">
                No sequences found for the selected filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
=======
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">ML models</h1>
            <p className="mt-1 text-sm text-muted-foreground">LogBERT v1 full runtime and PostgreSQL sequence scores.</p>
          </div>
        </div>
        <button onClick={run} disabled={running} className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-105 disabled:opacity-50">
          <Play className="mr-2 h-4 w-4" />
          {running ? "Checking..." : "Run scoring"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-lg p-5">
          <div className="flex items-center gap-2 text-primary">
            <Database className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Active model</span>
          </div>
          <p className="mt-3 break-all text-sm font-semibold">{status?.model_name ?? "logbert_like_distilbert_iforest"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{status?.model_version ?? "logbert_v1_full"}</p>
        </div>
        <div className="glass-card rounded-lg p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score status</div>
          <p className="mt-3 text-sm font-semibold">
            {status?.score_status === "loaded" ? "Loaded" : "No scored sequences"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{Number(status?.sequence_scores ?? 0).toLocaleString()} sequences</p>
        </div>
        <div className="glass-card rounded-lg p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Runtime</div>
          <p className="mt-3 break-all text-xs text-muted-foreground">{status?.artifact_path ?? "ml_service/logbert_v1_full_runtime"}</p>
        </div>
      </div>

      <div className="glass-card animate-slide-up rounded-xl border border-border/80 p-6">
        <div className="flex items-center gap-2 text-primary">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Runtime integration</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold">LogBERT v1 full</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The active LogVision anomaly model reads real normalized sequences and writes results to PostgreSQL. If this table is empty, ingest logs, run ETL, build sequences, and run ML scoring.
        </p>
      </div>

      <div className="glass-card rounded-lg p-5">
        <h2 className="mb-3 text-sm font-semibold">Model comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Sequence</th>
                <th>App</th>
                <th>Component</th>
                <th>IForest</th>
                <th>KMeans</th>
                <th>LogBERT</th>
                <th>Final</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sequence_uid} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{String(r.sequence_uid).slice(0, 16)}</td>
                  <td>{r.application_key}</td>
                  <td>{r.component_name}</td>
                  <td>{Number(r.iforest_anomaly_score ?? 0).toFixed(3)}</td>
                  <td>{Number(r.kmeans_anomaly_score ?? 0).toFixed(3)}</td>
                  <td>{Number(r.logbert_like_score ?? 0).toFixed(3)}</td>
                  <td>{Number(r.final_anomaly_score ?? 0).toFixed(3)}</td>
                  <td>{r.final_anomaly_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No real scored sequences are available yet. Ingest logs through Logstash, run ETL, build sequences, then run ML scoring.</p>}
        </div>
      </div>
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
