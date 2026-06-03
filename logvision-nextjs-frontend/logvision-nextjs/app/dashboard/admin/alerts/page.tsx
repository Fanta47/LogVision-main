<<<<<<< HEAD
﻿import { Bell, Wrench } from "lucide-react";

const rules = [
  { name: "Critical Error Burst", state: "Enabled" },
  { name: "SLA Timeout", state: "Enabled" },
  { name: "Auth Failure Spike", state: "Disabled" },
];

export default function AdminAlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Admin Alert Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Regles de detection et notifications.</p>
        </div>
      </div>

      <div className="glass-card rounded-lg p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Rule</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.name} className="border-t border-border">
                <td className="py-3">{r.name}</td>
                <td>{r.state}</td>
=======
﻿﻿﻿﻿﻿"use client";

import { useEffect, useState } from "react";
import { X, BellRing, Zap, Plus, Trash2, Edit, CheckCircle2, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { createAdminAlertRule, getAdminAlertRules } from "@/lib/api";

type Severity = "critical" | "warning";
type Rule = {
  id: string;
  name: string;
  metric: string;
  condition: string;
  window: string;
  severity: Severity;
  channels: string[];
  enabled: boolean;
};

export default function AdminAlertRulesPage() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [demo, setDemo] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Rule, "id" | "enabled">>({ name: "", metric: "", condition: "", window: "", severity: "warning", channels: ["Internal"] });

  useEffect(() => {
    getAdminAlertRules().then((r) => {
      setRows((r.data as Rule[]) || []);
      setDemo(r.usingFallback);
    });
  }, []);

  async function createRule() {
    await createAdminAlertRule(draft);
    const created: Rule = { id: `R-${Date.now()}`, enabled: true, ...draft };
    setRows((prev) => [created, ...prev]);
    setOpen(false);
    setDraft({ name: "", metric: "", condition: "", window: "", severity: "warning", channels: ["Internal"] });
  }

  function toggleChannel(channel: string) {
    setDraft((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel) ? prev.channels.filter((c) => c !== channel) : [...prev.channels, channel],
    }));
  }

  return (
    <div className="space-y-6 pb-10">
      {demo && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-200">Mode Démo : Données simulées actives</div>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="h-6 w-6 text-red-600" />
          <div>
            <h1 className="text-xl font-bold">Alert Configuration</h1>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-tighter text-muted-foreground opacity-70">Configuration des seuils et canaux de notification</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all animate-pulse-subtle">
          <Plus className="mr-1 inline h-3.5 w-3.5" /> New Rule
        </button>
      </div>

      <div className="glass-card overflow-hidden rounded-xl border border-border/50 shadow-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-white/5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Rule</th>
              <th className="px-5 py-4">Metric</th>
              <th className="px-5 py-4">Threshold</th>
              <th className="px-5 py-4 text-center">Severity</th>
              <th className="px-5 py-4">Channels</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold tracking-tight text-foreground">{r.name}</span>
                    <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground uppercase opacity-60">
                      <Clock className="h-2.5 w-2.5" /> Fenêtre: {r.window}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <code className="rounded bg-secondary/50 px-2 py-1 text-[11px] font-mono text-blue-400 border border-white/5">{r.metric}</code>
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-black text-red-400">{r.condition}</span>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                    r.severity === "critical" 
                    ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.2)]" 
                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  }`}>
                    {r.severity}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    {r.channels.map(c => (
                      <span key={c} className="rounded border border-white/10 bg-secondary/30 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${r.enabled ? "bg-emerald-500" : "bg-red-600"}`}>
                    {r.enabled && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75"></span>}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-red-500 transition-all">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
>>>>>>> 494bacd (Save workspace snapshot)
              </tr>
            ))}
          </tbody>
        </table>
      </div>

<<<<<<< HEAD
      <div className="glass-card rounded-lg p-5">
        <div className="flex items-center gap-2 text-primary">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Under Construction</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Canaux Teams, Slack, Email et strategies d escalation seront ajoutes.</p>
      </div>
=======
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-border bg-[#0b111a] p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">New Rule</h2><button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button></div>
            <div className="space-y-3">
              <input className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm" placeholder="Rule name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm" placeholder="Metric" value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} />
              <input className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm" placeholder="Condition" value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })} />
              <input className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm" placeholder="Window" value={draft.window} onChange={(e) => setDraft({ ...draft, window: e.target.value })} />
              <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as Severity })} className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm"><option value="warning">warning</option><option value="critical">critical</option></select>
              <div className="flex flex-wrap gap-2">{["Internal", "Email", "SMS", "Slack", "PagerDuty"].map((c) => <button key={c} onClick={() => toggleChannel(c)} className={`rounded border px-2 py-1 text-xs ${draft.channels.includes(c) ? "border-primary text-primary" : "border-border"}`}>{c}</button>)}</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded border border-border px-3 py-2 text-xs">Cancel</button>
              <button onClick={createRule} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all animate-pulse-subtle">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
>>>>>>> 494bacd (Save workspace snapshot)
    </div>
  );
}
