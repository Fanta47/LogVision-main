"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getMLUploads, forceResyncPipeline } from "@/lib/api";
import { Activity, Database, Cpu, CheckCircle2, ChevronRight, Loader2, Terminal, AlertCircle, Clock, Brain, RefreshCw, Timer } from "lucide-react";
import { toast } from "sonner";

const STAGES = [
  { id: 'uploaded', label: 'Raw / Waiting', icon: Clock },
  { id: 'parsing', label: 'ELK Parsing', icon: Terminal },
  { id: 'indexing', label: 'Elastic Indexing', icon: Database },
  { id: 'exporting', label: 'DB Export', icon: ChevronRight },
  { id: 'predicting', label: 'ML Predicting', icon: Brain },
  { id: 'reindexing', label: 'Re-indexing', icon: Activity },
  { id: 'suggesting', label: 'AI Insights', icon: Cpu },
  { id: 'done', label: 'Fully Treated', icon: CheckCircle2 },
];

export default function AdminDashboard() {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const isFirstLoad = useRef(true);
  const alertedUids = useRef<Set<string>>(new Set());

  // Horloge interne pour mettre à jour les compteurs chaque seconde sans refetch API
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Calcul du temps écoulé depuis l'ingestion
  const getElapsedTime = useCallback((startTime: string) => {
    if (!startTime) return "0s";
    const start = new Date(startTime).getTime();
    const diff = Math.floor((now.getTime() - start) / 1000);
    
    if (diff < 0) return "0s";
    if (diff < 60) return `${diff}s`;
    
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  }, [now]);

  useEffect(() => {
    const poll = async () => {
      const res = await getMLUploads();
      const jobs = res.data || [];

      if (isFirstLoad.current) {
        // Initialise la liste des jobs déjà terminés sans déclencher d'alerte
        jobs.forEach((j: any) => {
          if (j.status === "done") alertedUids.current.add(j.upload_uid);
        });
        isFirstLoad.current = false;
      } else {
        // Détecte les nouveaux passages à l'état 'done'
        jobs.forEach((job: any) => {
          if (job.status === "done" && !alertedUids.current.has(job.upload_uid)) {
            toast.success("Pipeline terminé", {
              description: `Le fichier ${job.original_file_name} a été entièrement traité et analysé par LogVision.`,
              icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
            });
            alertedUids.current.add(job.upload_uid);
          }
        });
      }

      setActiveJobs(jobs);
    };
    poll();
    const inv = setInterval(poll, 5000);
    return () => clearInterval(inv);
  }, []);

  const handleResync = async (uid: string) => {
    const tid = toast.loading("Resyncing pipeline stage...");
    try {
      const res = await forceResyncPipeline(uid);
      if (res.status === "started") {
        toast.success("Pipeline stage restarted", { id: tid });
      } else {
        toast.error("Failed to restart stage", { id: tid });
      }
    } catch (err) {
      toast.error("Error connecting to engine", { id: tid });
    }
  };

  const processingJobs = activeJobs.filter(j => j.status !== 'uploaded' && j.status !== 'done');
  const completedJobs = activeJobs.filter(j => j.status === 'done');

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Admin Control Center</h1>
        <p className="text-xs text-muted-foreground font-bold">Monitor log lifecycles from ingestion to AI suggestions</p>
      </div>

      <div className="grid gap-6">
        <div className="glass-card rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-red-500">Live Ingestion Pipeline</h2>
            <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase text-red-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Active Monitoring
            </div>
          </div>

          <div className="space-y-8">
            {processingJobs.length > 0 ? (
              processingJobs.map((job) => (
                <div key={job.upload_uid} className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-white/5 p-2 font-mono text-[10px] text-slate-400">
                        {job.upload_uid.slice(-6)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{job.original_file_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{job.application_key} / {job.component_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-xs font-black text-amber-500 italic">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> 
                          <span>Processing Stage: {job.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] not-italic text-slate-400">
                          <Timer className="h-3 w-3 opacity-50" />
                          {getElapsedTime(job.uploaded_at)}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleResync(job.upload_uid)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all"
                      >
                        <RefreshCw className="h-3 w-3" /> Force Re-sync
                      </button>
                    </div>
                  </div>

                  <div className="relative flex justify-between">
                    {/* Ligne de connexion */}
                    <div className="absolute top-4 left-0 h-[2px] w-full bg-white/5 -z-10" />
                    
                    {STAGES.filter(s => s.id !== 'uploaded' && s.id !== 'done').map((step, idx) => {
                      const isCurrent = job.status === step.id;
                      const isPast = STAGES.findIndex(s => s.id === job.status) > STAGES.findIndex(s => s.id === step.id);
                      const StepIcon = step.icon;
                      
                      return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                            isCurrent ? "border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : 
                            isPast ? "border-emerald-500 bg-emerald-500/20 text-emerald-500" : "border-white/10 bg-[#05080d] text-slate-700"
                          }`}>
                            {isPast ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${isCurrent ? "text-red-500" : "text-slate-500"}`}>
                            {step.label.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <AlertCircle className="h-10 w-10 mb-2" />
                <p className="text-xs font-black uppercase tracking-widest">No active background pipelines</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}