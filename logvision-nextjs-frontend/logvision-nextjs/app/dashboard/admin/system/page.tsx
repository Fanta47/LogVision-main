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

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes("healthy") || s.includes("up")) return "text-emerald-300 bg-emerald-500/15";
  if (s.includes("degraded") || s.includes("warning")) return "text-amber-300 bg-amber-500/15";
  return "text-red-300 bg-red-500/15";
}

export default function AdminSystemPage() {
  const [data, setData] = useState<any>(null);
  const [demo, setDemo] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [restarting, setRestarting] = useState(false);
  const [restartMsg, setRestartMsg] = useState("");
  const load = () => getAdminSystemHealth().then((r) => { setData(r.data); setDemo(r.usingFallback); });
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (data?.restartableServices?.length && !selectedService) {
      setSelectedService(data.restartableServices[0].id);
    }
  }, [data, selectedService]);
  if (!data) return null;

  // Calcul des états critiques
  const cpuValue = parseInt(data.avgCpu) || 0;
  const isCpuCritical = cpuValue > 80;

  const storageParts = (data.storageUsed || "").split('/');
  const isStorageCritical = storageParts.length === 2 
    ? (parseFloat(storageParts[0]) / parseFloat(storageParts[1])) > 0.9 
    : false;

  async function restartSelected() {
    if (!selectedService) return;
    setRestarting(true);
    setRestartMsg("");
    const res = await restartAdminService(selectedService);
    if (res.error || !res.data?.ok) {
      setRestartMsg("Restart failed. Check backend Docker access.");
    } else {
      setRestartMsg("Service restart requested.");
      setTimeout(load, 2000);
    }
    setRestarting(false);
  }

  return <div className="space-y-6">
    {demo && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">Backend unavailable, showing demo data.</div>}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-blue-500" />
        <div><h1 className="text-xl font-bold">System Monitoring</h1><p className="mt-1 text-sm text-muted-foreground">Platform health and ingestion pipeline status</p></div>
      </div>
      <div className="flex gap-2">
        <button onClick={load} className="rounded-md border border-cyan-500/50 text-cyan-400 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/10 transition-all"><RefreshCw className="mr-1 inline h-3 w-3" />Actualiser</button>
        <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="rounded-md border border-amber-500/50 bg-[#0b1220] px-2 py-2 text-xs font-bold text-amber-200 outline-none">{(data.restartableServices || []).map((s: any) => <option key={s.id} value={s.id} className="bg-[#0b1220] text-slate-100">{s.id}</option>)}</select>
        <button onClick={restartSelected} disabled={restarting || !selectedService} className="rounded-md bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-500 disabled:opacity-50 transition-all">
          {restarting ? "Redémarrage..." : "Restart Server"}
        </button>
      </div>
    </div>
    {restartMsg && <p className="text-xs text-amber-200">{restartMsg}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-emerald-300/80">Services Up</p>
          <Activity className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="mt-4 text-3xl font-bold text-white">{data.servicesUp}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">Platform health</p>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-blue-300/80">Ingestion Rate</p>
          <Wifi className="h-5 w-5 text-blue-400" />
        </div>
        <p className="mt-4 text-3xl font-bold text-white">{data.ingestionRate}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-500">Within capacity</p>
      </div>

      <div className={`rounded-2xl border p-5 transition-all duration-500 ${
        isStorageCritical
          ? "border-red-500/50 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
          : "border-indigo-500/20 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
      }`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${isStorageCritical ? "text-red-300" : "text-indigo-300/80"}`}>Storage Used</p>
          <HardDrive className={`h-5 w-5 ${isStorageCritical ? "text-red-400" : "text-indigo-400"}`} />
        </div>
        <p className="mt-4 text-3xl font-bold text-white">{data.storageUsed}</p>
        <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${isStorageCritical ? "text-red-500" : "text-indigo-500"}`}>{isStorageCritical ? "Critical" : "Current storage"}</p>
      </div>

      <div className={`rounded-2xl border p-5 transition-all duration-500 ${
        isCpuCritical
          ? "border-red-500/50 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
          : "border-amber-500/20 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
      }`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${isCpuCritical ? "text-red-300" : "text-amber-300/80"}`}>Avg CPU</p>
          <Cpu className={`h-5 w-5 ${isCpuCritical ? "text-red-400" : "text-amber-400"}`} />
        </div>
        <p className="mt-4 text-3xl font-bold text-white">{data.avgCpu}</p>
        <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${isCpuCritical ? "text-red-500" : "text-amber-500"}`}>
          {isCpuCritical ? "Critical" : "Healthy"}
        </p>
      </div>
    </div>
    <div className="glass-card overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-white/[0.03] px-4 py-3"><div className="flex items-center gap-2"><Server className="h-4 w-4 text-rose-500" /><h2 className="text-sm font-semibold text-white">Service Health</h2></div></div>
      <table className="w-full text-sm"><thead className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Uptime</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Throughput / Notes</th></tr></thead>
      <tbody className="divide-y divide-border">{(data.services || []).map((s: any) => <tr key={s.service} className="hover:bg-accent/20"><td className="px-4 py-3 font-semibold">{s.service}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${badge(s.status)}`}>{s.status}</span></td><td className="px-4 py-3 font-mono">{s.uptime}</td><td className="px-4 py-3 font-mono">{s.latency}</td><td className="px-4 py-3">{s.notes}</td></tr>)}</tbody></table>
    </div>
  </div>;
>>>>>>> 494bacd (Save workspace snapshot)
}
