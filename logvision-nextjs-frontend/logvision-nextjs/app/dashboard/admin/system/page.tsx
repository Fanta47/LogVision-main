<<<<<<< HEAD
<<<<<<< HEAD
﻿import { Server, Activity } from "lucide-react";

const systems = [
  { name: "Elasticsearch", status: "Healthy", cls: "status-dot-success" },
  { name: "PostgreSQL", status: "Healthy", cls: "status-dot-success" },
  { name: "ETL Service", status: "Running", cls: "status-dot-warning" },
  { name: "ML Service", status: "Under review", cls: "status-dot-warning" },
];

export default function AdminSystemPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Server className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Admin System</h1>
          <p className="mt-1 text-sm text-muted-foreground">Observabilite des services critiques LogVision.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {systems.map((s) => (
          <div key={s.name} className="glass-card animate-slide-up rounded-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{s.name}</h2>
              <span className={`status-dot ${s.cls} animate-pulse-glow`} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.status}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-lg p-5">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Under Construction</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Les diagnostics avances seront ajoutes ici (latence, saturation, health timeline).</p>
      </div>
    </div>
  );
=======
﻿﻿﻿﻿"use client";
import { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive, RefreshCw, Server, Wifi } from "lucide-react";
import { getAdminSystemHealth, restartAdminService } from "@/lib/api";
=======
﻿﻿"use client";
>>>>>>> cb91247 (Add admin system health endpoints for frontend dashboard)

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Server, Activity, Cpu, Database, RefreshCw, AlertCircle, CheckCircle2, Play } from "lucide-react";
import { getAdminSystemHealth, restartAdminService } from "@/lib/api";
import { toast } from "sonner";

export default function AdminSystemPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<{ time: string; cpu: number }[]>([]);

  const fetchHealth = async () => {
    setLoading(true);
    const res = await getAdminSystemHealth();
    setHealth(res.data);

    // Update CPU history for the chart
    if (res.data?.avgCpu) {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const cpuValue = parseFloat(res.data.avgCpu.replace('%', '')); // Assuming avgCpu is like "75%"
      setCpuHistory(prev => {
        const newHistory = [...prev, { time: timeLabel, cpu: cpuValue }];
        return newHistory.slice(-20); // Keep last 20 data points for a rolling view
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh auto toutes les 30s
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async (serviceId: string) => {
    setRestarting(serviceId);
    const res = await restartAdminService(serviceId);
    if (!res.error) {
      toast.success(`Service ${serviceId} redémarré avec succès`);
      fetchHealth();
    } else {
      toast.error(`Erreur lors du redémarrage de ${serviceId}`);
    }
    setRestarting(null);
  };

  if (loading && !health) return <div className="p-10 text-center animate-pulse">Chargement de l'état des conteneurs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-red-600" />
          <h1 className="text-xl font-bold">System Health & Docker Monitor</h1>
        </div>
        <button onClick={fetchHealth} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Métriques Globales */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Services Up", value: health?.servicesUp, icon: Activity, color: "text-emerald-500" },
          { label: "Ingestion Rate", value: health?.ingestionRate, icon: Database, color: "text-blue-500" },
          { label: "CPU Load", value: health?.avgCpu, icon: Cpu, color: "text-amber-500" },
          { label: "Storage", value: health?.storageUsed, icon: Server, color: "text-purple-500" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black">{stat.value || "N/A"}</p>
          </div>
        ))}
      </div>

      {/* Graphique de charge CPU en temps réel */}
      <div className="glass-card rounded-xl border border-white/5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">CPU Load History (Last 10 min)</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cpuHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "rgba(11, 18, 32, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", backdropFilter: "blur(8px)" }} />
              <Line type="monotone" dataKey="cpu" stroke="#f59e0b" strokeWidth={2} dot={false} animationDuration={300} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Liste des Services Docker */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="bg-white/5 px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold uppercase tracking-widest">Docker Containers</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-6 py-3 text-left">Container Name</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Uptime</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {health?.services?.map((s: any) => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs">{s.name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {s.status === 'running' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={`text-[10px] font-black uppercase ${s.status === 'running' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {s.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">{s.uptime}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    disabled={restarting === s.id}
                    onClick={() => handleRestart(s.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    {restarting === s.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Restart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
<<<<<<< HEAD
    <div className="glass-card overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-white/[0.03] px-4 py-3"><div className="flex items-center gap-2"><Server className="h-4 w-4 text-rose-500" /><h2 className="text-sm font-semibold text-white">Service Health</h2></div></div>
      <table className="w-full text-sm"><thead className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Uptime</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Throughput / Notes</th></tr></thead>
      <tbody className="divide-y divide-border">{(data.services || []).map((s: any) => <tr key={s.service} className="hover:bg-accent/20"><td className="px-4 py-3 font-semibold">{s.service}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${badge(s.status)}`}>{s.status}</span></td><td className="px-4 py-3 font-mono">{s.uptime}</td><td className="px-4 py-3 font-mono">{s.latency}</td><td className="px-4 py-3">{s.notes}</td></tr>)}</tbody></table>
    </div>
  </div>;
>>>>>>> 494bacd (Save workspace snapshot)
}
=======
  );
}
>>>>>>> cb91247 (Add admin system health endpoints for frontend dashboard)
