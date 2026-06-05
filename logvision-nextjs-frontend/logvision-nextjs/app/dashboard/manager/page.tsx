<<<<<<< HEAD
export default function ManagerPage() {
  return <div className="space-y-6"><div><h1 className="text-xl font-bold">Manager Console</h1><p className="mt-1 text-sm text-muted-foreground">Strategic view of risk, SLA adherence, and backlog pressure.</p></div><div className="grid gap-4 md:grid-cols-2"><div className="glass-card animate-slide-up rounded-lg p-5"><h2 className="font-medium">Team Risk</h2><p className="mt-2 text-sm text-muted-foreground">Cross-service anomaly risk and backlog.</p></div><div className="glass-card animate-slide-up rounded-lg p-5"><h2 className="font-medium">SLA Compliance</h2><p className="mt-2 text-sm text-muted-foreground">SLA status by application and component.</p></div></div></div>;
=======
"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertOctagon, TrendingUp, Users, Brain, ArrowRight, Check, Activity, ShieldAlert, Zap, Search, ExternalLink, Layers, RotateCcw, Eye, EyeOff, Layout, RefreshCw, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { getManagerOverview, getRiskByApplication, getAdminConfiguration, getManagerTeam } from "@/lib/api";
import { PerformanceCorrelationChart } from "@/components/Charts";
import { toast } from "sonner";

const getRiskWidthClass = (risk: number) => {
  const normalized = Math.min(100, Math.max(0, Math.round(risk / 5) * 5));
  const classes: Record<number, string> = {
    0: "w-[0%]",
    5: "w-[5%]",
    10: "w-[10%]",
    15: "w-[15%]",
    20: "w-[20%]",
    25: "w-[25%]",
    30: "w-[30%]",
    35: "w-[35%]",
    40: "w-[40%]",
    45: "w-[45%]",
    50: "w-[50%]",
    55: "w-[55%]",
    60: "w-[60%]",
    65: "w-[65%]",
    70: "w-[70%]",
    75: "w-[75%]",
    80: "w-[80%]",
    85: "w-[85%]",
    90: "w-[90%]",
    95: "w-[95%]",
    100: "w-[100%]",
  };

  return classes[normalized] ?? "w-[0%]";
};

const MOCK_AI_ACTIONS = [
  { id: 1, title: "Isolate megacash persistence node-04", impact: "High", reason: "Memory leak pattern identical to May 12 incident.", applied: false },
  { id: 2, title: "Scale megacustody slalogger replicas", impact: "Medium", reason: "P99 latency increasing with traffic spike.", applied: false },
  { id: 3, title: "Flush cache on megacor iodevices", impact: "High", reason: "Consistency anomalies detected in sequence #412.", applied: false },
  { id: 4, title: "Rollback megacommon default v2.4.1", impact: "Low", reason: "Minor CSS breakage detected in reporting UI.", applied: false },
];

export default function ManagerPage() {
  const [overview, setOverview] = useState({
    totalAnomalies: 0, stabilityScore: 0, mttr: "0m", activeEngineers: "0/0", crashRisk: 0
  });
  const [apps, setApps] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [aiActions, setAiActions] = useState(MOCK_AI_ACTIONS);
  const [confirmAction, setConfirmAction] = useState<any>(null);
  const [kibanaUrl, setKibanaUrl] = useState("http://localhost:5601/app/dashboards#/view/main-strategic-overview");
  const [kibanaEnabled, setKibanaEnabled] = useState(true);
  const [showKibana, setShowKibana] = useState(true);
  const [selectedDashboard, setSelectedDashboard] = useState("overview");
  const [kibanaRefreshKey, setKibanaRefreshKey] = useState(0);
  const [isKibanaLoading, setIsKibanaLoading] = useState(true);
  const [isKibanaFullscreen, setIsKibanaFullscreen] = useState(false);
  const [chartDays, setChartDays] = useState(14);
  const [filters, setFilters] = useState({ range: "24h", application_key: "all" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleKibanaVisibility = () => {
    const next = !showKibana;
    setShowKibana(next);
    const saved = localStorage.getItem("logvision_prefs");
    const p = saved ? JSON.parse(saved) : {};
    localStorage.setItem("logvision_prefs", JSON.stringify({ ...p, showKibana: next }));
  };

  const resetFilters = () => {
    const defaultFilters = { range: "24h", application_key: "all" };
    setFilters(defaultFilters);
    void loadData(defaultFilters);
  };

  const loadData = async (f = filters) => {
    setIsLoading(true);
    try {
      const [appsRes, overviewRes, teamRes] = await Promise.all([
        getRiskByApplication(),
        getManagerOverview(f.range, f.application_key),
        getManagerTeam()
      ]);

      setApps(Array.isArray(appsRes.data) ? appsRes.data : []);
      if (overviewRes.data) setOverview(overviewRes.data);
      setTeam(Array.isArray(teamRes.data) ? teamRes.data : []);
      setError(overviewRes.error || appsRes.error || teamRes.error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load visibility preference from user profile settings
    const savedPrefs = localStorage.getItem("logvision_prefs");
    if (savedPrefs) {
      const p = JSON.parse(savedPrefs);
      if (p.showKibana !== undefined) setShowKibana(p.showKibana);
    }

    loadData();
    getAdminConfiguration().then(r => {
      if (r.data?.parameters?.kibana_url) {
        setKibanaUrl(r.data.parameters.kibana_url);
      }
      if (r.data?.flags) {
        setKibanaEnabled(r.data.flags.kibana_integration !== false);
      }
    });
  }, []);

  const applyAction = (action: any) => {
    const tid = toast.loading(`Applying action: ${action.title}...`);
    setTimeout(() => {
      setAiActions(prev => prev.map(a => a.id === action.id ? { ...a, applied: true } : a));
      toast.success("Applied ✓", { id: tid });
      setConfirmAction(null);
    }, 1200);
  };

  const refreshKibana = () => {
    setIsKibanaLoading(true);
    setKibanaRefreshKey(prev => prev + 1);
  };

  // Mock dashboards list for selection
  const dashboards = [
    { id: "overview", name: "Strategic Overview", path: "overview" },
    { id: "traffic", name: "Network & Flow", path: "_network" },
    { id: "security", name: "Security Threats", path: "_security" },
    { id: "ml", name: "ML Anomaly Trends", path: "_ml" },
    { id: "performance", name: "SLA & Performance", path: "_performance" },
  ];

  if (isLoading && overview.totalAnomalies === 0) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Strategic View...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Strategic Overview (KPIs) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-amber-500">Strategic Overview</h1>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground opacity-60">Decision support & global risk posture</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-secondary/30 px-2 py-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="App Filter" 
              className="w-24 bg-transparent text-[10px] font-bold uppercase outline-none"
              value={filters.application_key === "all" ? "" : filters.application_key}
              onChange={(e) => setFilters({...filters, application_key: e.target.value || "all"})}
            />
          </div>
          <select 
            value={filters.range} title="Time Range"
            onChange={(e) => setFilters({...filters, range: e.target.value})}
            className="rounded-lg border border-white/5 bg-secondary/30 px-2 py-1.5 text-[10px] font-black uppercase outline-none cursor-pointer"
          >
            <option value="1h">Last 1h</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <button onClick={() => loadData()} className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-black uppercase text-[#05080d] shadow-lg">Apply</button>
          <button 
            onClick={resetFilters} 
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
            title="Reset to default (24h, all apps)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5 border border-white/5">
            <Activity className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Live: logbert_v1</span>
          </div>

          {/* Kibana Integrated Controls */}
          {kibanaEnabled && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/30 p-1 border border-white/5 ml-2">
            <button
              onClick={toggleKibanaVisibility}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-black uppercase transition-all ${showKibana ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-white'}`}
              title={showKibana ? "Hide Kibana" : "Show Kibana"}
            >
              {showKibana ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              Kibana View
            </button>
            {showKibana && (
              <select
                aria-label="Select Kibana dashboard"
                value={selectedDashboard}
                onChange={(e) => {
                  setIsKibanaLoading(true);
                  setSelectedDashboard(e.target.value);
                }}
                className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer text-blue-400 border-l border-white/10 pl-2"
              >
                {dashboards.map(d => (
                  <option key={d.id} value={d.id} className="bg-[#0b1220]">{d.name}</option>
                ))}
              </select>
            )}
            <div className="h-4 w-px bg-white/10 mx-1" />
            <button 
              onClick={() => window.open(kibanaUrl, '_blank')}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-black uppercase text-blue-400 hover:bg-blue-500/10 transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Go to Kibana
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Kibana Embedded Dashboard (Primary Strategic Component) with Smooth Transition */}
      <div className={`grid transition-all duration-500 ease-in-out overflow-hidden ${
        showKibana && kibanaEnabled 
          ? "grid-rows-[1fr] opacity-100 mb-6" 
          : "grid-rows-[0fr] opacity-0 mb-0 pointer-events-none"
      }`}>
        <div className={`min-h-0 glass-card overflow-hidden transition-all duration-500 ${
          isKibanaFullscreen 
            ? 'fixed inset-0 z-[110] !m-0 rounded-none bg-[#05080d] border-0' 
            : 'rounded-2xl border border-blue-500/20 bg-blue-500/5'
        }`}>
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-3">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Embedded Kibana: {dashboards.find(d => d.id === selectedDashboard)?.name}</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
              <button 
                onClick={refreshKibana}
                className="flex items-center gap-1 hover:text-blue-400 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
              <button 
                onClick={() => setIsKibanaFullscreen(!isKibanaFullscreen)}
                className="flex items-center gap-1 hover:text-blue-400 transition-colors"
              >
                {isKibanaFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                {isKibanaFullscreen ? "Exit Fullscreen" : "Fullscreen Toggle"}
              </button>
              <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Encrypted Tunnel</span>
            </div>
          </div>
          <div className={`relative w-full bg-black/20 ${isKibanaFullscreen ? 'h-[calc(100vh-45px)]' : 'h-[500px]'}`}>
            {isKibanaLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-400/70">Synchronizing Data...</span>
              </div>
            )}
            <iframe
              key={kibanaRefreshKey}
              onLoad={() => setIsKibanaLoading(false)}
              src={`${kibanaUrl}${kibanaUrl.includes('?') ? '&' : kibanaUrl.includes('#') ? '' : '?'}embed=true${
                dashboards.find(d => d.id === selectedDashboard)?.path 
                ? (kibanaUrl.includes('?') || kibanaUrl.includes('#') ? '&' : '?') + 'dashboard=' + dashboards.find(d => d.id === selectedDashboard)?.path 
                : ''
              }`}
              className="h-full w-full border-0 opacity-80 hover:opacity-100 transition-opacity"
              title="Kibana Dashboard"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Anomalies (7d)" value={String(overview.totalAnomalies)} change="-9% vs last week" changeType="positive" icon={AlertOctagon} />
        <StatCard title="Stability Score" value={String(overview.stabilityScore)} change="Target ≥ 90" changeType="neutral" icon={TrendingUp} />
        <StatCard title="MTTR" value={overview.mttr} change="-3m improvement" changeType="positive" icon={Zap} />
        <StatCard title="Active Engineers" value={overview.activeEngineers} change="Team readiness" changeType="neutral" icon={Users} />
      </div>

      {/* 2. Jauge de risque + Corrélation performance */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Global Crash Risk (24h)</h3>
          <div className="relative flex items-center justify-center">
             <svg className="h-40 w-40 -rotate-90">
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray={440} strokeDashoffset={440 - (440 * (overview.crashRisk || 0)) / 100} strokeLinecap="round" className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
             </svg>
             <div className="absolute flex flex-col items-center">
                <span className="font-mono text-4xl font-black">{overview.crashRisk}%</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">High Risk</span>
             </div>
          </div>
        </div>
        <div className="glass-card lg:col-span-2 rounded-2xl border border-white/5 p-6 min-h-[380px]">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Performance Correlation</h3>
            <div className="flex gap-1 rounded-lg bg-white/5 p-1">
              {[7, 14].map((d) => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`rounded-md px-3 py-1 text-[10px] font-black uppercase transition-all ${
                    chartDays === d 
                      ? "bg-amber-500 text-[#05080d] shadow-[0_0_10px_rgba(245,158,11,0.4)]" 
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <PerformanceCorrelationChart days={chartDays} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 3. Application Risk Breakdown */}
        <div className="glass-card lg:col-span-2 rounded-2xl border border-white/5 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Application Risk Breakdown</h3>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-5">
            {apps.map(app => (
              <div key={app.name} className="group relative">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${app.status === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : app.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className="font-mono text-xs font-bold text-foreground">{app.name}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">({app.anomalies} anomalies)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase ${app.status === 'critical' ? 'text-red-500' : app.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>{app.risk}% {app.status}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full transition-all duration-1000 ${app.status === 'critical' ? 'bg-red-500' : app.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'} ${getRiskWidthClass(app.risk)}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Decision Support */}
        <div className="glass-card rounded-2xl border border-white/5 p-6 bg-amber-600/5">
          <div className="mb-6 flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">AI Decision Support</h3>
          </div>
          <div className="space-y-3">
            {aiActions.map(action => (
              <div key={action.id} className={`rounded-xl border p-3 transition-all ${action.applied ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-background/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${action.impact === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>{action.impact} Impact</span>
                      <span className="text-xs font-bold tracking-tight">{action.title}</span>
                    </div>
                    <p className="text-[10px] leading-tight text-muted-foreground opacity-70">{action.reason}</p>
                  </div>
                  <button 
                    onClick={() => setConfirmAction(action)}
                    disabled={action.applied}
                    className={`shrink-0 rounded-lg p-2 transition-all ${action.applied ? 'text-emerald-500' : 'bg-amber-600 text-white hover:scale-110 shadow-lg shadow-amber-900/20'}`}
                  >
                    {action.applied ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Team Performance */}
      <div className="glass-card rounded-2xl border border-white/5 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Incident Response Team</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
              <tr>
                <th className="pb-4 pr-4">Engineer</th>
                <th className="pb-4 pr-4 text-center">Incidents (7d)</th>
                <th className="pb-4 pr-4 text-center">Avg MTTR</th>
                <th className="pb-4">Current Workload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {team.map(eng => (
                <tr key={eng.name} className="group transition-colors hover:bg-white/5">
                  <td className="py-4 pr-4 font-bold">{eng.name}</td>
                  <td className="py-4 pr-4 text-center font-mono">{eng.incidents}</td>
                  <td className="py-4 pr-4 text-center font-mono text-emerald-400">{eng.mttr}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className={`h-full transition-all duration-1000 ${eng.workload >= 80 ? 'bg-red-500' : eng.workload >= 60 ? 'bg-amber-500' : 'bg-emerald-500'} ${getRiskWidthClass(eng.workload)}`} />
                      </div>
                      <span className={`w-8 font-mono text-[10px] font-bold ${eng.workload >= 80 ? 'text-red-500' : 'text-muted-foreground'}`}>{eng.workload}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmation IA */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
           <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black tracking-tight mb-2">Confirm Strategic Action</h3>
              <p className="text-sm text-muted-foreground mb-1 font-bold text-foreground">{confirmAction.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">{confirmAction.reason}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">Cancel</button>
                <button onClick={() => applyAction(confirmAction)} className="flex-1 rounded-xl bg-amber-600 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:scale-105 transition-all">Confirm Application</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
>>>>>>> 494bacd (Save workspace snapshot)
}
