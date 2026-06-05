<<<<<<< HEAD
﻿import { Brain, Wrench } from "lucide-react";

export default function PredictionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Incident predictions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Previsions intelligentes en cours de deploiement.</p>
        </div>
      </div>

      <div className="glass-card animate-slide-up rounded-xl border border-border/80 p-6">
        <div className="flex items-center gap-2 text-primary">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Under Construction</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold">Predictive Visualisations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette zone affichera la probabilite d incident, la fenetre de risque et les facteurs explicatifs
          par application et composant.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <p className="text-xs text-muted-foreground">Risk Score</p>
            <div className="mt-2 h-16 rounded-md bg-gradient-to-r from-primary/25 to-transparent" />
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <p className="text-xs text-muted-foreground">Trend Forecast</p>
            <div className="mt-2 h-16 rounded-md bg-gradient-to-r from-warning/25 to-transparent" />
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <p className="text-xs text-muted-foreground">Top Drivers</p>
            <div className="mt-2 h-16 rounded-md bg-gradient-to-r from-success/25 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
=======
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brain, Database, Loader2, Search, ShieldAlert, Zap, TrendingUp, AlertTriangle, CheckCircle2, ExternalLink, Filter, FileText, Cpu, CheckCircle, Activity, PlayCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getManagerPredictions, getMLUploads, runDiagnosis, apiPost } from "@/lib/api";
import { toast } from "sonner";

export default function PredictionsPage() {
  const [data, setData] = useState<any>({ items: [], score_status: "loading" });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);

  // On-Demand Diagnosis States
  const [uploads, setUploads] = useState<any[]>([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      
      const [predRes, upRes] = await Promise.all([
        getManagerPredictions({ limit: 300 }),
        getMLUploads()
      ]);

      if (predRes.data) setData(predRes.data);
      if (upRes.data) setUploads(upRes.data);

      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const items = data.items || [];
    const total = items.length;
    const highRisk = items.filter((i: any) => (i.risk_probability || i.final_anomaly_score * 100) >= 80).length;
    const avgRisk = total > 0 
      ? Math.round(items.reduce((acc: number, curr: any) => acc + (curr.risk_probability || curr.final_anomaly_score * 100), 0) / total)
      : 0;
    return { total, highRisk, avgRisk };
  }, [data.items]);

  const rows = useMemo(() => {
    const text = query.toLowerCase();
    let filtered = (data.items || []).filter((item: any) => {
      const matchText = [
        item.sequence_uid,
        item.application_key,
        item.component_name,
        item.final_anomaly_label,
      ].join(" ").toLowerCase().includes(text);
      return matchText;
    });

    if (showOnlyCritical) {
      filtered = filtered.filter((i: any) => (i.risk_probability || i.final_anomaly_score * 100) >= 80);
    }

    return filtered;
  }, [data.items, query, showOnlyCritical]);

  const handleAcknowledge = (uid: string) => {
    toast.success(`Prédiction ${uid.slice(0,8)} acquittée`);
  };

  const handleStartFullPipeline = async () => {
    if (!selectedUid) return;
    setDiagnosing(true);
    const res = await apiPost<{status: string}>(`/api/ml/process/${selectedUid}`);
    if (res.status === "started") {
      toast.success("Pipeline de traitement envoyé à l'administration");
    }
    setDiagnosing(false);
  };

  const handleDiagnose = async () => {
    if (!selectedUid) return;
    setDiagnosing(true);
    setDiagResult(null);
    const res = await runDiagnosis(selectedUid);
    if (res.data) setDiagResult(res.data);
    setDiagnosing(false);
  };

  if (data.score_status === "waiting_for_postgres_scores") {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <Database className="mb-4 h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-bold text-white">No ML scores loaded</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The model is registered, but PostgreSQL has no real scored sequences for the active model yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold text-white">Incident Predictions</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
              Ranked from active LogBERT sequence scores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowOnlyCritical(!showOnlyCritical)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              showOnlyCritical 
                ? "border-red-500/50 bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Critical Only
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-lg border border-white/10 bg-secondary/30 px-3 py-2 pl-10 text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Deep Analysis Engine Card */}
      <div className="glass-card mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl transition-all">
        <div className="border-b border-white/5 bg-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-600/20 p-2">
                <Cpu className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">LogBERT Diagnosis Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground opacity-60">Analyse on-demand des fichiers ingérés</p>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedUid && !diagnosing && (
                <button 
                  onClick={handleStartFullPipeline}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-900/40 transition-all hover:scale-105"
                >
                  <PlayCircle className="h-4 w-4" />
                  Run Start Process
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choisir un fichier source</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select 
                  value={selectedUid}
                  onChange={(e) => setSelectedUid(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-secondary/50 py-3 pl-10 pr-4 text-xs font-black text-white outline-none focus:ring-1 focus:ring-red-600 transition-all"
                >
                  <option value="" className="bg-[#0b1220]">Sélectionner un fichier ingéré...</option>
                  {uploads.map((u: any) => (
                    <option key={u.upload_uid} value={u.upload_uid} className="bg-[#0b1220]">
                      {u.original_file_name} — {new Date(u.uploaded_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {diagnosing && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Exécution du modèle de langage bidirectionnel...</p>
              </div>
            )}
          </div>
          
          <div className="min-h-[120px] rounded-2xl border border-white/5 bg-black/40 p-5">
            {!diagResult && !diagnosing && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Search className="mb-2 h-8 w-8 text-slate-700" />
                <p className="text-xs font-bold text-slate-600">Sélectionnez un fichier pour voir les prédictions et suggestions d'analyse.</p>
              </div>
            )}
            {diagResult && !diagnosing && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-500">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase tracking-tighter text-red-500">Anomalies</p>
                      <p className="text-xl font-black text-white">{diagResult.summary.anomalies_detected}</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase tracking-tighter text-red-500">Erreurs</p>
                      <p className="text-xl font-black text-white">{diagResult.summary.critical_errors}</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                    <p className="text-[9px] font-black uppercase text-emerald-500">Confidence: {Math.round(diagResult.summary.confidence_score * 100)}%</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Intelligence Suggestions</p>
                  <ul className="space-y-2">
                    {diagResult.summary.suggestions.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[10px] font-bold text-slate-200">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                {diagResult.summary.sequence_graph && (
                  <div className="mt-6 border-t border-white/5 pt-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Anomaly Pulse Visualization</p>
                      <Activity className="h-3 w-3 text-red-500 animate-pulse" />
                    </div>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={diagResult.summary.sequence_graph}>
                          <defs>
                            <linearGradient id="diagGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 8 }} />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "rgba(11, 18, 32, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "10px" }} 
                            itemStyle={{ color: "#ef4444" }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#ef4444" fillOpacity={1} fill="url(#diagGradient)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card group rounded-xl border border-white/5 p-5 transition-all hover:bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Predictions</p>
            <Zap className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.total}</p>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full opacity-50" />
          </div>
        </div>
        <div className="glass-card group rounded-xl border border-white/5 p-5 transition-all hover:bg-red-500/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">High Risk Active</p>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-3xl font-black text-white">{stats.highRisk}</p>
          <p className="mt-1 text-[10px] font-bold text-red-500/70 uppercase">Requires immediate action</p>
        </div>
        <div className="glass-card group rounded-xl border border-white/5 p-5 transition-all hover:bg-amber-500/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Avg Anomaly Score</p>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-white">{stats.avgRisk}%</p>
          <p className="mt-1 text-[10px] font-mono text-muted-foreground">{data.model_version}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-6 py-4">Risk Probability</th>
              <th className="px-6 py-4">Sequence UID</th>
              <th className="px-6 py-4">Application / Component</th>
              <th className="px-6 py-4">Prediction Drivers</th>
              <th className="px-6 py-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                    <span className="font-black uppercase tracking-widest opacity-50">Syncing with ML Service...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-20 text-center text-muted-foreground italic">
                  Aucune prédiction ne correspond aux critères.
                </td>
              </tr>
            ) : (
              rows.map((item: any) => {
                const riskValue = item.risk_probability || (item.final_anomaly_score * 100);
                const isHighRisk = riskValue >= 80;
                
                return (
                <tr key={item.sequence_uid} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex items-center justify-center">
                        <svg className="h-10 w-10 -rotate-90">
                          <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                          <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={100} strokeDashoffset={100 - riskValue} strokeLinecap="round" className={isHighRisk ? "text-red-500" : "text-amber-500"} />
                        </svg>
                        <span className={`absolute text-[10px] font-black ${isHighRisk ? "text-red-500" : "text-amber-500"}`}>{Math.round(riskValue)}%</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border ${isHighRisk ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                        {isHighRisk ? "Critical" : "Warning"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-blue-400/80 group-hover:text-blue-400 transition-colors">
                    {item.sequence_uid.slice(0, 8)}...{item.sequence_uid.slice(-4)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-200 uppercase tracking-tight">{item.application_key}</div>
                    <div className="text-[10px] font-medium text-muted-foreground opacity-60 uppercase">{item.component_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {(item.drivers || []).map((driver: string) => (
                        <span key={driver} className="rounded-md border border-white/5 bg-white/5 px-2 py-1 font-mono text-[9px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                          {driver}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleAcknowledge(item.sequence_uid)}
                        className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                        title="Acknowledge Prediction"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/dashboard/logs?sequence_uid=${item.sequence_uid}`}
                        className="rounded-lg bg-amber-500/10 p-2 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"
                        title="View Full Sequence"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="group-hover:hidden">
                    <Link
                      href={`/dashboard/logs?sequence_uid=${item.sequence_uid}`}
                      className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:underline"
                    >
                      Inspecter
                    </Link>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
