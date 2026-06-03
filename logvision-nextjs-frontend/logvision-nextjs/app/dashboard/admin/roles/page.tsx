<<<<<<< HEAD
﻿import { Shield, Wrench } from "lucide-react";

const roles = [
  { name: "admin", perms: "system, users, config" },
  { name: "manager", perms: "reports, predictions, incidents" },
  { name: "user", perms: "ingest, logs, anomalies" },
];

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Admin Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Matrice des permissions par role.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((r) => (
          <div key={r.name} className="glass-card animate-slide-up rounded-lg p-5">
            <h2 className="text-base font-semibold uppercase">{r.name}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{r.perms}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-lg p-5">
        <div className="flex items-center gap-2 text-primary">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Under Construction</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Editeur dynamique RBAC et heritage de permissions bientot disponibles.</p>
=======
﻿﻿"use client";
import { useState } from "react";
import { Info, Save, Shield, ShieldAlert, ShieldCheck, Lock } from "lucide-react";
import { updateRoleMatrix } from "@/lib/api";
import { toast } from "sonner";

const PERM_INFO: Record<string, string> = {
  "View Dashboard": "Permet d'accéder à la vue d'ensemble, aux graphiques et aux métriques de performance globales.",
  "View Logs": "Donne accès à la consultation, au filtrage et à l'exportation des logs bruts du système.",
  "Acknowledge Alerts": "Autorise l'utilisateur à marquer des alertes comme traitées pour arrêter les notifications.",
  "Manage Users": "Droit de créer, modifier les détails ou révoquer l'accès des comptes utilisateurs.",
  "Manage Roles": "Permet de modifier cette matrice de permissions et de définir les capacités de chaque rôle.",
  "Manage Alert Rules": "Droit de configurer les seuils de détection (ex: CPU > 80%) et les destinataires des alertes.",
  "Manage Configuration": "Accès aux réglages critiques (rétention, SSO, débug) et aux commutateurs de fonctionnalités.",
  "Run ML Prediction": "Permet de déclencher manuellement les modèles d'IA pour analyser les risques futurs.",
  "View Reports": "Accès aux audits système, rapports de conformité et bilans de santé de la plateforme."
};

export default function AdminRolesPage() {
  const perms = ["View Dashboard","View Logs","Acknowledge Alerts","Manage Users","Manage Roles","Manage Alert Rules","Manage Configuration","Run ML Prediction","View Reports"];
  const [grid, setGrid] = useState([
    { role: "Admin", allow: new Set(perms) },
    { role: "Manager", allow: new Set(["View Dashboard", "View Logs", "Acknowledge Alerts", "Run ML Prediction", "View Reports"]) },
    { role: "Analyst", allow: new Set(["View Dashboard", "View Logs", "Acknowledge Alerts", "View Reports"]) }
  ]);
  const [loading, setLoading] = useState(false);

  const toggle = (idx: number, perm: string) => {
    setGrid(g => g.map((r, i) => {
      if (i !== idx) return r;
      const next = new Set(r.allow);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return { ...r, allow: next };
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = grid.map(r => ({ role: r.role, permissions: Array.from(r.allow) }));
    const res = await updateRoleMatrix('permissions', payload);
    if (!res.error) toast.success("Configuration des rôles mise à jour avec succès");
    else toast.error("Échec de la sauvegarde des modifications");
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lock className="h-6 w-6 text-red-600" />
          <div>
            <h1 className="text-xl font-bold">Role Management</h1>
            <p className="mt-1 text-xs text-muted-foreground font-medium uppercase tracking-tighter opacity-70">Matrice des permissions et capacités système</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all animate-pulse-subtle disabled:opacity-50"
        >
          <Save className="mr-2 inline h-3.5 w-3.5" />
          {loading ? "Saving..." : "Sauvegarder"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {grid.map(r => {
          const colorClass = r.role === 'Admin' ? 'text-red-500 border-red-500/20 shadow-red-500/10' : r.role === 'Manager' ? 'text-amber-500 border-amber-500/20 shadow-amber-500/10' : 'text-emerald-500 border-emerald-500/20 shadow-emerald-500/10';
          const Icon = r.role === 'Admin' ? ShieldAlert : r.role === 'Manager' ? Shield : ShieldCheck;
          return (
            <div key={r.role} className={`glass-card group rounded-xl border p-5 transition-all hover:scale-[1.02] ${colorClass}`}>
              <div className="flex items-center justify-between">
                <Icon className="h-8 w-8 opacity-80" />
                <span className="text-2xl font-black">{r.allow.size}</span>
              </div>
              <div className="mt-4">
                <p className="text-sm font-black uppercase tracking-widest opacity-90">{r.role}</p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <div 
                    className={`h-full bg-current transition-all duration-1000 ${r.role === 'Admin' ? 'shadow-[0_0_8px_rgba(220,38,38,0.5)]' : ''}`} 
                    style={{ width: `${(r.allow.size / perms.length) * 100}%` } as React.CSSProperties}
                  />
                </div>
                <p className="mt-2 text-[10px] font-medium text-muted-foreground uppercase">Capacités accordées</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card overflow-hidden rounded-xl border border-border/50 shadow-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-6 py-4 text-left">Permission Matrix</th>
              {grid.map(r => (
                <th key={r.role} className={`px-6 py-4 text-center ${r.role === 'Admin' ? 'text-red-500' : r.role === 'Manager' ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {r.role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perms.map(p => (
              <tr key={p} className="border-t border-border/30 hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 relative">
                  <div className="flex items-center gap-2 cursor-help">
                    <span className="font-semibold tracking-tight text-foreground/80 group-hover:text-white transition-colors">{p}</span>
                    <Info className="h-3 w-3 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Tooltip stylisé */}
                  <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute left-full top-1/2 -translate-y-1/2 ml-4 z-50 w-64 p-3 rounded-xl border border-white/10 bg-[#0b1220]/95 text-[11px] leading-relaxed text-slate-200 shadow-2xl backdrop-blur-xl transition-all duration-200 pointer-events-none">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-red-500">Documentation</div>
                    {PERM_INFO[p]}
                  </div>
                </td>
                {grid.map((r, i) => (
                  <td key={r.role} className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <input 
                        type="checkbox" 
                        checked={r.allow.has(p)} 
                        onChange={() => toggle(i, p)} 
                        className={`h-5 w-5 cursor-pointer rounded-md transition-all ${r.role === 'Admin' ? 'accent-red-600' : r.role === 'Manager' ? 'accent-amber-500' : 'accent-emerald-500'} hover:scale-110`} 
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
>>>>>>> 494bacd (Save workspace snapshot)
      </div>
    </div>
  );
}
