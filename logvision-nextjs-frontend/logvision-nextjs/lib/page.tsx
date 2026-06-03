"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getManagerAnomalies, downloadReport } from "@/lib/api";
import { AlertCircle, Database, Search, FileDown, BrainCircuit } from "lucide-react";

export default function ManagerAnomaliesPage() {
  const [data, setData] = useState<any>({ items: [], score_status: "loading" });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    application_key: "all",
    component_name: "all",
    start_date: "",
    end_date: ""
  });

  useEffect(() => {
    loadAnomalies();
  }, []);

  const loadAnomalies = async (f = filters) => {
    setLoading(true);
    const res = await getManagerAnomalies({ 
      model: "logbert_like_distilbert_iforest",
      ...f
    });
    setData(res.data);
    setLoading(false);
  };

  if (data.score_status === "waiting_for_postgres_scores") {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <div className="rounded-full bg-amber-500/10 p-6">
          <Database className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold">Data Import Pending</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          ML runtime is registered, but sequence scores have not been imported into PostgreSQL yet. 
          System is waiting for background worker to process <code className="text-xs bg-secondary px-1">logbert_v1_full_scores.csv</code>.
        </p>
        <button onClick={() => loadAnomalies()} className="rounded-lg bg-secondary px-4 py-2 text-xs font-bold uppercase">Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-red-600" />
          <h1 className="text-xl font-bold">Anomaly Detection Engine</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="text" 
            placeholder="App Key" title="Application Key Filter"
            className="rounded border border-border bg-secondary/50 px-2 py-1 text-xs outline-none"
            value={filters.application_key === "all" ? "" : filters.application_key}
            onChange={(e) => setFilters({...filters, application_key: e.target.value || "all"})}
          />
          <input 
            type="text" 
            placeholder="Service" title="Service/Component Filter"
            className="rounded border border-border bg-secondary/50 px-2 py-1 text-xs outline-none"
            value={filters.component_name === "all" ? "" : filters.component_name}
            onChange={(e) => setFilters({...filters, component_name: e.target.value || "all"})}
          />
          <input 
            type="date" title="Start Date"
            className="rounded border border-border bg-secondary/50 px-2 py-1 text-xs outline-none"
            value={filters.start_date}
            onChange={(e) => setFilters({...filters, start_date: e.target.value})}
          />
          <input 
            type="date" title="End Date"
            className="rounded border border-border bg-secondary/50 px-2 py-1 text-xs outline-none"
            value={filters.end_date}
            onChange={(e) => setFilters({...filters, end_date: e.target.value})}
          />
          <button type="button" onClick={() => loadAnomalies()} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg">
            <Search className="h-4 w-4" /> Apply Filters
          </button>
          <button 
            onClick={() => downloadReport('anomalies')}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white"
          >
            <FileDown className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">
            <tr>
              <th className="p-4">Sequence UID</th>
              <th className="p-4 text-center">Final Score</th>
              <th className="p-4">App Key</th>
              <th className="p-4">Component</th>
              <th className="p-4">Events</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {data.items.map((item: any) => (
              <tr key={item.sequence_uid} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-mono text-xs text-blue-400">{item.sequence_uid.split('-')[0]}...</td>
                <td className="p-4 text-center">
                  <span className={`rounded-full px-2 py-0.5 font-bold ${item.final_anomaly_score > 0.8 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {(item.final_anomaly_score * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="p-4">{item.application_key}</td>
                <td className="p-4 text-xs text-muted-foreground">{item.component_name}</td>
                <td className="p-4 font-mono text-xs">{item.event_ids.split(',').length} logs</td>
                <td className="p-4 text-right">
                  <Link 
                    href={`/dashboard/logs?sequence_uid=${item.sequence_uid}`}
                    className="text-red-500 hover:underline text-xs font-bold"
                  >
                    View Related Logs
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
