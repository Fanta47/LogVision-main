"use client";

<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Layers,
  Activity,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MlAnomaly } from "@/types/ml";

type Incident = {
  id: string;
  application_key: string;
  component_name: string;
  anomaly_count: number;
  max_score: number;
  severity: "Critical" | "Warning" | "Info";
  first_seen: string;
  last_seen: string;
  model_name: string;
  model_version: string;
};

function getSeverity(score: number, label: string): "Critical" | "Warning" | "Info" {
  if (label === "anomalous" || score >= 0.7) return "Critical";
  if (label === "suspicious" || score >= 0.3) return "Warning";
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

function buildIncidents(anomalies: MlAnomaly[]): Incident[] {
  const groups = new Map<string, MlAnomaly[]>();

  for (const item of anomalies) {
    const key = `${item.application_key}::${item.component_name}`;
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const [application_key, component_name] = key.split("::");

      const maxScore = Math.max(...items.map((item) => item.anomaly_score));

      const highestItem = items.reduce((max, item) =>
        item.anomaly_score > max.anomaly_score ? item : max
      );

      const sortedByStart = [...items].sort((a, b) =>
        a.start_timestamp.localeCompare(b.start_timestamp)
      );

      const sortedByEnd = [...items].sort((a, b) =>
        b.end_timestamp.localeCompare(a.end_timestamp)
      );

      return {
        id: `${application_key}-${component_name}`,
        application_key,
        component_name,
        anomaly_count: items.length,
        max_score: maxScore,
        severity: getSeverity(maxScore, highestItem.anomaly_label),
        first_seen: sortedByStart[0]?.start_timestamp || "",
        last_seen: sortedByEnd[0]?.end_timestamp || "",
        model_name: highestItem.model_name,
        model_version: highestItem.model_version,
      };
    })
    .sort((a, b) => b.max_score - a.max_score);
}

export default function IncidentsPage() {
  const [anomalies, setAnomalies] = useState<MlAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIncidents() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiGet<MlAnomaly[]>("/api/ml/anomalies?limit=500");
        setAnomalies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, []);

  const incidents = useMemo(() => buildIncidents(anomalies), [anomalies]);

  const stats = useMemo(() => {
    const critical = incidents.filter((item) => item.severity === "Critical").length;
    const warning = incidents.filter((item) => item.severity === "Warning").length;

    const maxScore =
      incidents.length > 0
        ? Math.max(...incidents.map((item) => item.max_score))
        : 0;

    return {
      total: incidents.length,
      critical,
      warning,
      maxScore,
    };
  }, [incidents]);

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-red-400">
          Operations
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Incidents
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Incidents candidats construits à partir des anomalies ML regroupées par
          application et composant.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Chargement des incidents depuis FastAPI...
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
                <p className="text-sm text-slate-400">Incident groups</p>
                <Layers className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.total}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-300">Critical incidents</p>
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-red-200">
                {stats.critical}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-300">Warning incidents</p>
                <AlertOctagon className="h-5 w-5 text-orange-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-orange-200">
                {stats.warning}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Highest score</p>
                <Activity className="h-5 w-5 text-slate-500" />
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
                  Candidate incidents
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Grouping rule: application_key + component_name
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
                    <th className="px-4 py-3">Anomalies</th>
                    <th className="px-4 py-3">Max score</th>
                    <th className="px-4 py-3">First seen</th>
                    <th className="px-4 py-3">Last seen</th>
                    <th className="px-4 py-3">Model</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {incidents.map((item) => (
                    <tr
                      key={item.id}
                      className="bg-[#070b12] transition hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            severityClass(item.severity),
                          ].join(" ")}
                        >
                          {item.severity}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-200">
                        {item.application_key}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.component_name}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.anomaly_count}
                      </td>

                      <td className="px-4 py-4 font-mono text-red-300">
                        {item.max_score.toFixed(6)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(item.first_seen)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(item.last_seen)}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {item.model_name}:{item.model_version}
                      </td>
                    </tr>
                  ))}

                  {incidents.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Aucun incident candidat trouvé.
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
import { useEffect, useState } from "react";
import { getManagerIncidents, updateIncidentStatus, assignIncidentOwner, getIncidentNotes, addIncidentNote } from "@/lib/api";
import { ShieldAlert, Clock, User, CheckCircle2, ChevronRight, Filter, Search, MoreHorizontal, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export default function IncidentManagementPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, any[]>>({});
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    const res = await getManagerIncidents({});
    if (res.data) setIncidents(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!notes[id]) {
      const res = await getIncidentNotes(id);
      if (res.data) setNotes(prev => ({ ...prev, [id]: res.data }));
    }
  };

  const handleAddNote = async (id: string) => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const res = await addIncidentNote(id, newNote);
    if (!res.error) {
      toast.success("Note ajoutée");
      setNewNote("");
      const updatedNotes = await getIncidentNotes(id);
      if (updatedNotes.data) setNotes(prev => ({ ...prev, [id]: updatedNotes.data }));
    }
    setAddingNote(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateIncidentStatus(id, newStatus);
    if (!res.error) {
      toast.success(`Incident marked as ${newStatus}`);
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
    }
  };

  const handleAssign = async (id: string) => {
    const owner = prompt("Entrez le nom du responsable :");
    if (!owner) return;
    const res = await assignIncidentOwner(id, owner);
    if (!res.error) {
      toast.success(`Assigned to ${owner}`);
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, owner } : inc));
    }
  };

  const filtered = incidents.filter(i => 
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.application_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold text-white">Incident Management</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Resolution workflow & ownership</p>
          </div>
        </div>
        <div className="flex gap-2 bg-secondary/30 p-1 rounded-lg border border-white/5">
          <div className="px-3 py-1 text-[10px] font-bold text-amber-500 uppercase">Open: {incidents.filter(i => i.status === 'open').length}</div>
          <div className="px-3 py-1 text-[10px] font-bold text-emerald-500 border-l border-white/10 uppercase">Resolved: {incidents.filter(i => i.status === 'resolved').length}</div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter incidents by title or application..."
          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-3 pl-10 text-sm outline-none focus:ring-1 focus:ring-amber-500 text-white"
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="p-20 text-center text-muted-foreground animate-pulse">Loading active cases...</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-20 text-center text-muted-foreground italic border border-white/5 rounded-2xl">No incidents requiring attention.</div>
        ) : (
          filtered.map((inc) => (
            <div key={inc.id} className="glass-card group overflow-hidden rounded-2xl border border-white/5 transition-all">
              <div className="flex items-center justify-between p-5 hover:bg-white/[0.02]">
              <div className="flex items-center gap-5 flex-1">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${inc.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">{inc.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${inc.status === 'open' ? 'bg-red-500/20 text-red-500' : inc.status === 'investigating' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                      {inc.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono uppercase"><Clock className="h-3 w-3" /> {new Date(inc.created_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1 font-bold text-slate-400 uppercase tracking-tighter">{inc.application_key}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Ownership</span>
                  <button 
                    onClick={() => handleAssign(inc.id)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-amber-500 transition-colors"
                  >
                    <User className="h-3.5 w-3.5" />
                    {inc.owner || "Unassigned"}
                  </button>
                </div>

                <div className="flex gap-2">
                  {inc.status !== 'resolved' ? (
                    <button 
                      onClick={() => handleStatusChange(inc.id, 'resolved')}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                      title="Resolve Incident"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center text-emerald-500">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  )}
                  <button 
                    onClick={() => toggleExpand(inc.id)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${expandedId === inc.id ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'}`}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                </div>
              </div>
              </div>

              {expandedId === inc.id && (
                <div className="border-t border-white/5 bg-black/20 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Discussion & Notes d'intervention</h4>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {notes[inc.id]?.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground py-4 text-center">Aucune note de collaboration pour le moment.</p>
                      ) : (
                        notes[inc.id]?.map((note: any, idx: number) => (
                          <div key={idx} className="rounded-xl bg-white/5 p-3 border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-amber-500">{note.author || 'Analyste IT'}</span>
                              <span className="text-[9px] text-muted-foreground">{new Date(note.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{note.text || note.note}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="relative pt-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Ajouter une instruction technique ou une mise à jour..."
                      className="w-full rounded-xl border border-white/10 bg-secondary/50 p-4 text-xs outline-none focus:ring-1 focus:ring-amber-500 text-white resize-none"
                      rows={2}
                    />
                    <button 
                      onClick={() => handleAddNote(inc.id)}
                      disabled={addingNote || !newNote.trim()}
                      title="Send Note" className="absolute bottom-4 right-4 rounded-lg bg-amber-500 p-2 text-[#05080d] hover:scale-110 shadow-lg shadow-amber-900/40 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {addingNote ? <MoreHorizontal className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
>>>>>>> 494bacd (Save workspace snapshot)
    </div>
  );
}