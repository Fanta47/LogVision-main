<<<<<<< HEAD
export default function ManagerPage() {
  return <div className="space-y-6"><div><h1 className="text-xl font-bold">Manager Console</h1><p className="mt-1 text-sm text-muted-foreground">Strategic view of risk, SLA adherence, and backlog pressure.</p></div><div className="grid gap-4 md:grid-cols-2"><div className="glass-card animate-slide-up rounded-lg p-5"><h2 className="font-medium">Team Risk</h2><p className="mt-2 text-sm text-muted-foreground">Cross-service anomaly risk and backlog.</p></div><div className="glass-card animate-slide-up rounded-lg p-5"><h2 className="font-medium">SLA Compliance</h2><p className="mt-2 text-sm text-muted-foreground">SLA status by application and component.</p></div></div></div>;
=======
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  ExternalLink,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getManagerOverview, getManagerTeam } from "@/lib/api";

type ManagerOverview = {
  totalAnomalies: number;
  stabilityScore: number;
  mttr: string;
  activeEngineers: string;
  crashRisk: number;
  totalLogs: string;
  monitoredApps: number;
  systemHealth: string;
};

type TeamMember = {
  id?: string | number;
  name?: string;
  role?: string;
  status?: string;
  workload?: number;
};

const overviewCards = [
  {
    key: "totalAnomalies",
    label: "Anomalies",
    icon: AlertTriangle,
    tone: "text-red-300 border-red-500/20 bg-red-500/10",
  },
  {
    key: "stabilityScore",
    label: "Stability score",
    icon: ShieldCheck,
    tone: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10",
    suffix: "%",
  },
  {
    key: "mttr",
    label: "MTTR",
    icon: Clock,
    tone: "text-sky-300 border-sky-500/20 bg-sky-500/10",
  },
  {
    key: "crashRisk",
    label: "Crash risk",
    icon: Activity,
    tone: "text-amber-300 border-amber-500/20 bg-amber-500/10",
    suffix: "%",
  },
] as const;

export default function ManagerPage() {
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [range, setRange] = useState("24h");
  const [loading, setLoading] = useState(true);
  const kibanaUrl = process.env.NEXT_PUBLIC_KIBANA_DASHBOARD_URL || "";

  useEffect(() => {
    async function loadManagerData() {
      setLoading(true);

      const [overviewRes, teamRes] = await Promise.all([
        getManagerOverview(range),
        getManagerTeam(),
      ]);

      setOverview(overviewRes.data as ManagerOverview);
      setTeam((teamRes.data as TeamMember[]) || []);
      setLoading(false);
    }

    loadManagerData();
  }, [range]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-red-500" />
          <div>
            <h1 className="text-xl font-bold text-white">Manager Dashboard</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
              Operations health and team workload
            </p>
          </div>
        </div>

        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-bold uppercase text-slate-300 outline-none focus:ring-1 focus:ring-red-500"
          title="Time range"
        >
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
        </select>
      </div>

      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          Loading manager metrics...
        </div>
      )}

      {!loading && overview && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => {
              const Icon = card.icon;
              const value = overview[card.key];

              return (
                <div
                  key={card.key}
                  className={`rounded-xl border p-5 shadow-2xl ${card.tone}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-300">{card.label}</p>
                    <Icon className="h-5 w-5 opacity-80" />
                  </div>
                  <p className="mt-4 text-3xl font-black text-white">
                    {value}
                    {"suffix" in card ? card.suffix : ""}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="glass-card rounded-xl border border-white/5 p-5 xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    System overview
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Current operational summary for monitored applications.
                  </p>
                </div>
                <Activity className="h-5 w-5 text-red-400" />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Health
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {overview.systemHealth}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Logs
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {overview.totalLogs}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Apps
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {overview.monitoredApps}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl border border-white/5 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Quick access
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manager work queues.
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-slate-500" />
              </div>

              <div className="space-y-3">
                {[
                  ["/dashboard/alerts", "Alerts"],
                  ["/dashboard/incidents", "Incidents"],
                  ["/dashboard/anomalies", "Anomalies"],
                  ["/dashboard/reports", "Reports"],
                  ["/dashboard/kibana", "Kibana"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
                  >
                    <span>{label}</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl border border-white/5 p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Kibana dashboards
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Visualisation des scores ML exportés vers Elasticsearch.
                </p>
              </div>

              {kibanaUrl && (
                <a
                  href={kibanaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#05080d] transition-all hover:scale-105"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Kibana
                </a>
              )}
            </div>

            {!kibanaUrl ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
                NEXT_PUBLIC_KIBANA_DASHBOARD_URL is not configured.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#05080d]">
                <iframe
                  src={kibanaUrl}
                  title="Kibana ML dashboards"
                  className="h-[760px] w-full"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl border border-white/5 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Team</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active engineers: {overview.activeEngineers}
                </p>
              </div>
              <Users className="h-5 w-5 text-slate-500" />
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Workload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {team.map((member, index) => (
                    <tr key={member.id ?? index} className="hover:bg-white/5">
                      <td className="px-4 py-4 font-semibold text-slate-200">
                        {member.name || "Unassigned"}
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {member.role || "Engineer"}
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {member.status || "available"}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-300">
                        {member.workload ?? 0}%
                      </td>
                    </tr>
                  ))}

                  {team.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No team workload data available.
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
>>>>>>> 494bacd (Save workspace snapshot)
}
