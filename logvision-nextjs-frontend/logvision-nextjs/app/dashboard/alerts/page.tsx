"use client";

<<<<<<< HEAD
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
=======
import { useEffect, useState, useMemo } from "react";
import { getManagerAlerts, updateAlertStatus, createIncidentFromAlert, downloadReport } from "@/lib/api";
import { AlertTriangle, Bell, Filter, CheckCircle2, Zap, Search, FileDown, Clock, Layers } from "lucide-react";
import { toast } from "sonner";

export default function ManagerAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: "all",
    status: "open",
    application: "all"
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAlerts = async () => {
    setLoading(true);
    const res = await getManagerAlerts(filters);
    if (res.data) setAlerts(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.application_key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [alerts, searchTerm]);

  const handleAcknowledge = async (id: string) => {
    const res = await updateAlertStatus(id, "acknowledged");
    if (!res.error) {
      toast.success("Alert acknowledged");
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "acknowledged" } : a));
    }
  };

  const handleCreateIncident = async (alertId: string) => {
    const res = await createIncidentFromAlert(alertId);
    if (!res.error) {
      toast.success("Incident created successfully");
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: "incident_created" } : a));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold text-white">Alert Center</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Real-time threat & anomaly feed</p>
          </div>
        </div>
        <button 
          onClick={() => downloadReport('alerts')}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#05080d] shadow-lg hover:scale-105 transition-all"
        >
          <FileDown className="h-4 w-4" /> Export Alerts
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card flex flex-wrap items-center gap-4 rounded-xl border border-white/5 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts..."
            className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 pl-10 text-sm outline-none focus:ring-1 focus:ring-amber-500 text-white"
          />
        </div>
        <select 
          value={filters.severity} title="Severity Level"
          onChange={(e) => setFilters({...filters, severity: e.target.value})}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-bold uppercase outline-none text-slate-300"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select 
          value={filters.status} title="Alert Status"
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-bold uppercase outline-none text-slate-300"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">
            <tr>
              <th className="p-4">Alert</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Application / Service</th>
              <th className="p-4"><Clock className="h-3 w-3 inline mr-1" /> Detected</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground animate-pulse">Syncing with alert engine...</td></tr>
            ) : filteredAlerts.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No alerts found.</td></tr>
            ) : (
              filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{alert.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">ID: {alert.id.split('-')[0]}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-500' : alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400">{alert.application_key}</span>
                      <span className="text-[9px] uppercase tracking-tighter text-muted-foreground">{alert.component_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-mono text-muted-foreground">
                    {new Date(alert.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleAcknowledge(alert.id)} disabled={alert.status !== 'open'} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-20"><CheckCircle2 className="h-4 w-4" /></button>
                      <button onClick={() => handleCreateIncident(alert.id)} disabled={alert.status === 'incident_created'} className="p-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-[#05080d] transition-all disabled:opacity-20"><Zap className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
>>>>>>> 494bacd (Save workspace snapshot)
    </div>
  );
}