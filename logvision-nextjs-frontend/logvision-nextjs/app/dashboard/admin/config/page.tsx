<<<<<<< HEAD
﻿import { Settings2, Wrench } from "lucide-react";

export default function AdminConfigPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Admin Config</h1>
          <p className="mt-1 text-sm text-muted-foreground">Parametres plateforme et integrations.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-lg p-5">
          <h2 className="font-medium">Elasticsearch</h2>
          <p className="mt-2 text-sm text-muted-foreground">Index pattern, retention, snapshot policy.</p>
        </div>
        <div className="glass-card rounded-lg p-5">
          <h2 className="font-medium">PostgreSQL</h2>
          <p className="mt-2 text-sm text-muted-foreground">ETL watermark, vacuum windows, analytics schema.</p>
        </div>
      </div>

      <div className="glass-card rounded-lg p-5">
        <div className="flex items-center gap-2 text-primary">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Under Construction</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">UI d edition de configuration securisee avec validation et historique bientot disponible.</p>
      </div>
    </div>
  );
}
=======
﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import { useEffect, useState } from "react";
import { Settings2, Save, Activity, Cpu, Clock, ToggleLeft, Brain, ShieldAlert, BarChart3, KeyRound, LogOut, ExternalLink } from "lucide-react";
import { getAdminConfiguration, updateAdminConfiguration } from "@/lib/api";
import { toast } from "sonner";

const FLAG_METADATA: Record<string, { label: string; desc: string; icon: any }> = {
  ml_predictions_enabled: { label: 'ML Predictions', desc: 'Modèles prédictifs pour anticiper les pannes système.', icon: Brain },
  keycloak_sso_enabled: { label: 'Keycloak SSO', desc: 'Authentification unique via le portail Vermeg.', icon: KeyRound },
  kibana_integration: { label: 'Kibana Integration', desc: 'Visualisation native des dashboards Kibana.', icon: BarChart3 },
  auto_incident_creation: { label: 'Auto Incident', desc: 'Génération automatique d\'incidents sur alertes critiques.', icon: ShieldAlert },
  debug_mode: { label: 'Debug Mode', desc: 'Activation des logs détaillés pour le diagnostic.', icon: Settings2 },
};

export default function AdminConfigPage() {
  const [data, setData] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminConfiguration().then((r) => {
      setData(r.data);
      setOriginal(JSON.parse(JSON.stringify(r.data)));
      setDemo(r.usingFallback);
      setLoading(false);
    });
  }, []);

  const isDirty = JSON.stringify(data) !== JSON.stringify(original);

  async function onSave() {
    await updateAdminConfiguration(data);
    setOriginal(JSON.parse(JSON.stringify(data)));
    toast.success("Configuration sauvegardée");
  }

  if (loading) return <div className="p-12 text-center">Chargement de la console...</div>;

  return (
    <div className="space-y-6">
      {demo && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">Mode Démo actif.</div>}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-red-600" />
          <div>
            <h1 className="text-xl font-bold">Configuration Plateforme</h1>
            <p className="text-xs text-muted-foreground">Paramètres système et fonctionnalités.</p>
          </div>
        </div>
        <button 
          disabled={!isDirty} 
          onClick={onSave}
          className={`flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all ${!isDirty && 'opacity-50 pointer-events-none'}`}
        >
          <Save className="h-4 w-4" /> Enregistrer
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Paramètres Système */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider border-b border-border/50 pb-3 text-red-500">
            <Activity className="h-4 w-4 text-blue-500" /> System Parameters
          </div>
          {[
            { id: 'log_retention_days', label: 'Rétention logs', desc: 'Durée de conservation avant archivage automatique.', icon: Clock, unit: 'jours' },
            { id: 'max_ingestion_rate', label: 'Débit ingestion max', desc: 'Limite de traitement en temps réel du cluster.', icon: Cpu, unit: 'eps' },
            { id: 'alert_cooldown_minutes', label: 'Cooldown alertes', desc: 'Délai minimum entre deux notifications identiques.', icon: Activity, unit: 'min' },
            { id: 'logout_timeout_seconds', label: 'Timeout déconnexion', desc: 'Délai de fermeture automatique de la session sur la popup.', icon: LogOut, unit: 'sec' },
            { id: 'kibana_url', label: 'URL Kibana', desc: 'Lien vers le dashboard externe Kibana.', icon: ExternalLink, unit: 'url' },
          ].map(item => (
            <div key={item.id} className="flex items-center justify-between py-4 border-b border-border/20 last:border-0 group transition-all">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-500 transition-colors" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/70 ml-5">{item.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <input 
                    type={item.id === 'kibana_url' ? "text" : "number"} title={item.label}
                    value={data.parameters[item.id]} 
                    onChange={e => {
                      const val = item.id === 'kibana_url' ? e.target.value : parseInt(e.target.value);
                      setData({...data, parameters: {...data.parameters, [item.id]: val}});
                    }}
                    className={`${item.id === 'kibana_url' ? 'w-64' : 'w-28'} rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-right font-mono text-xs font-bold outline-none focus:ring-1 focus:ring-red-600 hover:border-red-600/50 hover:shadow-[0_0_10px_rgba(220,38,38,0.15)] transition-all pr-12`}
                  />
                  <span className="absolute right-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-background border border-border text-muted-foreground pointer-events-none group-hover:text-red-400 group-hover:border-red-600/30">
                    {item.unit}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Flags */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider border-b border-border/50 pb-3 text-red-500">
            <ToggleLeft className="h-4 w-4 text-indigo-500" /> Feature Flags
          </div>
          {Object.entries(data.flags).map(([k, v]) => {
            const meta = FLAG_METADATA[k] || { label: k.replace(/_/g, ' '), desc: 'Option système.', icon: Settings2 };
            const Icon = meta.icon;
            const enabled = Boolean(v);
            return (
              <div key={k} className="flex items-center justify-between py-4 border-b border-border/20 last:border-0 group transition-all">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-500 transition-colors" />
                    <span className="text-sm font-semibold">{meta.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 ml-5">{meta.desc}</span>
                  {enabled && (
                    <div className="flex items-center gap-1.5 ml-5 mt-1.5 transition-all">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Service Opérationnel</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setData({...data, flags: {...data.flags, [k]: !enabled}})} title={`Toggle ${meta.label}`}
                  className={`relative h-5 w-10 rounded-full transition-all duration-300 ${enabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.2)]'}`}
                >
                  <div className={`absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
