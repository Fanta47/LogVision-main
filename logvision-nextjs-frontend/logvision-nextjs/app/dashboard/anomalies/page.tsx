"use client";

<<<<<<< HEAD
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
=======
import React, { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import Link from "next/link";
import { getManagerAnomalies, downloadReport, getProfile } from "@/lib/api";
import { BrainCircuit, FileDown, Database, TrendingUp, Brain, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AnomaliesManagementPage() {
  const [data, setData] = useState<any>({ items: [], score_status: "loading" });
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("Analyst");
  const [filters, setFilters] = useState({
    application_key: "all",
    component_name: "all",
    start_date: "",
    end_date: ""
  });

  const loadAnomalies = async (f = filters) => {
    setLoading(true);
    const res = await getManagerAnomalies({ 
      model: "logbert_like_distilbert_iforest",
      ...f
    });
    if (res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    getProfile().then(r => setRole(r.data?.role || "Analyst"));
    loadAnomalies();
  }, []);

  const chartData = useMemo(() => {
    return (data.items || []).slice(0, 20).reverse().map((item: any) => ({
      time: new Date(item.start_timestamp || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: Math.round((item.final_anomaly_score || 0) * 100)
    }));
  }, [data.items]);

  if (data.score_status === "waiting_for_postgres_scores") {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <div className="rounded-full bg-amber-500/10 p-6 border border-amber-500/20">
          <Database className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-white">No Real Scores Available</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          No real anomaly scores are available yet. Ingest logs through Logstash, run ETL, build PostgreSQL sequences, and score them with the ML service.
        </p>
        <button onClick={() => loadAnomalies()} className="rounded-lg bg-amber-500 px-6 py-2 text-xs font-black uppercase text-[#05080d]">Refresh Status</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold text-white">
              {role === "Analyst" ? "Anomaly Analysis" : "Anomalies Explorer"}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Real ML sequence scores from PostgreSQL</p>
          </div>
        </div>
        <button 
          onClick={() => downloadReport('anomalies')} title="Download Report"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#05080d] shadow-lg"
        >
          <FileDown className="h-4 w-4" /> Export ML Data
        </button>
      </div>

      {/* Evolution Chart */}
      <div className="glass-card rounded-2xl border border-white/5 p-6 h-[250px] w-full bg-amber-500/5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Évolution du score d'anomalie (Séquences récentes)</h3>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: "rgba(11, 18, 32, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", backdropFilter: "blur(8px)" }} />
            <Area type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" animationDuration={1000} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filter Bar */}
      <div className="glass-card flex flex-wrap items-center gap-3 rounded-xl border border-white/5 p-4">
        <input 
          type="text" title="Filtrer par application"
          placeholder="Application..." 
          className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 text-white min-w-[150px]"
          value={filters.application_key === "all" ? "" : filters.application_key}
          onChange={(e) => setFilters({...filters, application_key: e.target.value || "all"})}
        />
        <input 
          type="date" title="Date de début"
          className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs outline-none text-slate-300"
          value={filters.start_date}
          onChange={(e) => setFilters({...filters, start_date: e.target.value})}
        />
        <button onClick={() => loadAnomalies()} className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all">
          Apply Filters
        </button>
      </div>

      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">
            <tr>
              <th className="p-4">Sequence UID</th>
              <th className="p-4">Severity Score</th>
              <th className="p-4">Context</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.items.map((item: any) => (
              <Fragment key={item.sequence_uid}>
                <tr className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-mono text-xs text-blue-400"><Zap className={`inline h-3 w-3 mr-2 ${role === 'Analyst' ? 'text-cyan-400' : 'text-amber-500'}`} />{item.sequence_uid.split('-')[0]}...</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${item.final_anomaly_score > 0.8 ? 'bg-red-500/20 text-red-500' : 'bg-cyan-500/20 text-cyan-400'}`}>
                        {item.final_anomaly_score > 0.8 ? 'Critical' : 'Warning'}
                      </div>
                      <span className="font-mono text-[10px] font-bold">{(item.final_anomaly_score * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-300 text-xs">{item.application_key}</td>
                  <td className="p-4 text-right">
                    <Link href={`/dashboard/logs?sequence_uid=${item.sequence_uid}`} className="text-cyan-400 hover:underline text-[10px] font-black uppercase tracking-widest">Investigate</Link>
                  </td>
                </tr>
                {role === "Analyst" && (
                  <tr className="bg-cyan-500/5">
                    <td colSpan={4} className="p-4 pt-0">
                      <div className="rounded-lg bg-black/20 p-3 flex items-start gap-3 border border-cyan-500/10">
                        <Brain className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-tighter text-cyan-500">Evidence</span>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Real ML score {Number(item.final_anomaly_score ?? 0).toFixed(4)} for {item.application_key}/{item.component_name}. Open the related logs to investigate the source events.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
