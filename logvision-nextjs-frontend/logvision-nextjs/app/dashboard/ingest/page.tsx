"use client";

<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  FileText,
  FolderOpen,
  Database,
  Server,
} from "lucide-react";
import { apiGet } from "@/lib/api";

type UploadRecord = {
  upload_uid: string;
  original_file_name: string;
  stored_file_name: string;
  stored_path: string;
  application_key: string;
  component_name: string;
  uploaded_at: string;
  status: string;
};

type HealthResponse = {
  status?: string;
  app_name?: string;
  environment?: string;
  database?: string;
};

function formatDate(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function statusClass(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes("uploaded") ||
    value.includes("processed") ||
    value.includes("done") ||
    value.includes("success") ||
    value.includes("completed")
  ) {
    return "border-green-500/40 bg-green-500/10 text-green-300";
  }

  if (
    value.includes("error") ||
    value.includes("failed") ||
    value.includes("rejected")
  ) {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-orange-500/40 bg-orange-500/10 text-orange-300";
}

export default function IngestionPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIngestion() {
      try {
        setLoading(true);
        setError(null);

        const [uploadsData, healthData] = await Promise.all([
          apiGet<UploadRecord[]>("/api/logs/uploads"),
          apiGet<HealthResponse>("/health"),
        ]);

        setUploads(Array.isArray(uploadsData) ? uploadsData : []);
        setHealth(healthData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadIngestion();
  }, []);

  const stats = useMemo(() => {
    const uploaded = uploads.filter(
      (item) => item.status?.toLowerCase() === "uploaded"
    ).length;

    const applications = new Set(
      uploads
        .map((item) => item.application_key)
        .filter((value) => value && value.trim() !== "")
    );

    const components = new Set(
      uploads
        .map((item) => item.component_name)
        .filter((value) => value && value.trim() !== "")
    );

    return {
      totalUploads: uploads.length,
      uploaded,
      applications: applications.size,
      components: components.size,
    };
  }, [uploads]);

  return (
    <div className="min-h-full bg-[#05080d] text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-red-400">
          Intelligence
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Ingestion
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Suivi des fichiers de logs uploadés dans LogVision. Les données sont
          chargées depuis /api/logs/uploads et /health.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Chargement de l’état d’ingestion depuis FastAPI...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          Erreur : {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Total uploads</p>
                <Upload className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.totalUploads}
              </p>
            </div>

            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-300">Uploaded</p>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <p className="mt-4 text-3xl font-bold text-green-200">
                {stats.uploaded}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Applications</p>
                <Database className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.applications}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Components</p>
                <FolderOpen className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {stats.components}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Upload history
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Historique réel des fichiers reçus par le backend.
                  </p>
                </div>
                <FileText className="h-5 w-5 text-slate-500" />
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Original file</th>
                      <th className="px-4 py-3">Application</th>
                      <th className="px-4 py-3">Component</th>
                      <th className="px-4 py-3">Uploaded at</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {uploads.map((item) => (
                      <tr
                        key={item.upload_uid}
                        className="bg-[#070b12] transition hover:bg-white/[0.04]"
                      >
                        <td className="px-4 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                              statusClass(item.status),
                            ].join(" ")}
                          >
                            {item.status || "N/A"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-200">
                            {item.original_file_name || "N/A"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            {item.upload_uid}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.application_key || "N/A"}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.component_name || "N/A"}
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(item.uploaded_at)}
                        </td>
                      </tr>
                    ))}

                    {uploads.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          Aucun upload trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Backend health
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Statut retourné par /health.
                  </p>
                </div>
                <Server className="h-5 w-5 text-slate-500" />
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 text-lg font-semibold text-green-300">
                    {health?.status || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Application
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-200">
                    {health?.app_name || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Environment
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-200">
                    {health?.environment || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Database
                  </p>
                  <p className="mt-2 text-sm font-medium text-green-300">
                    {health?.database || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-400" />
              <div>
                <h2 className="text-sm font-semibold text-orange-200">
                  Note technique
                </h2>
                <p className="mt-1 text-sm text-orange-100/80">
                  Le statut “uploaded” confirme que le fichier est reçu par le
                  backend. Il ne prouve pas à lui seul que tous les événements
                  ont déjà été parsés, indexés, insérés en base et scorés par le
                  pipeline ML.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
=======
import { useState } from "react";
import { Upload, FileCheck2, FileX2, Loader2, Database, Terminal } from "lucide-react";
import { toast } from "sonner";
import { uploadLogFile } from "@/lib/api";

const TARGETS = [
  { application_key: "MegaCash", component_name: "Persistence", desc: "MegaCash persistence logs" },
  { application_key: "MegaCash", component_name: "MegaCashSLALogger", desc: "MegaCash SLA logs" },
  { application_key: "MegaCor", component_name: "Persistence", desc: "MegaCor persistence logs" },
  { application_key: "MegaCor", component_name: "BasicStruct", desc: "MegaCor BasicStruct logs" },
  { application_key: "MegaCommon", component_name: "Persistence", desc: "MegaCommon persistence logs" },
  { application_key: "MegaCustody", component_name: "LifeCycleLog", desc: "MegaCustody lifecycle logs" },
];

export default function LogIngestionPage() {
  const [selectedTarget, setSelectedTarget] = useState(TARGETS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [ingesting, setIngesting] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setIngesting(true);
    const tid = toast.loading("Uploading log file to backend...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("application_key", selectedTarget.application_key);
      formData.append("component_name", selectedTarget.component_name);

      const res = await uploadLogFile(formData);
      if (res.error) throw new Error(res.error);

      setIngesting(false);
      setFile(null);
      toast.success(`Uploaded ${res.data?.stored_file_name ?? file.name}`, { id: tid });
    } catch (err) {
      setIngesting(false);
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: tid });
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-white">Log Ingestion</h1>
        <p className="text-xs text-muted-foreground">Upload log files per application for parsing, validation, and AI analysis</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Étape 1: Application Selection */}
          <div className="glass-card rounded-2xl border border-white/5 p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-4 flex items-center gap-2">
              <Database className="h-3 w-3" /> Step 1: Target Application
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {TARGETS.map((target) => {
                const id = `${target.application_key}/${target.component_name}`;
                const active = selectedTarget.application_key === target.application_key && selectedTarget.component_name === target.component_name;
                return (
                <button
                  key={id}
                  onClick={() => setSelectedTarget(target)}
                  className={`flex flex-col gap-1 p-4 rounded-xl border text-left transition-all ${
                    active
                      ? "bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                      : "bg-white/5 border-white/5 hover:border-white/10"
                  }`}
                >
                  <span className={`font-mono text-xs font-bold ${active ? "text-cyan-400" : "text-slate-300"}`}>{id}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{target.desc}</span>
                </button>
                );
              })}
            </div>
          </div>

          {/* Étape 2: Drop Zone */}
          <div className="glass-card rounded-2xl border border-white/5 p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-4 flex items-center gap-2">
              <Upload className="h-3 w-3" /> Step 2: Upload Source
            </h3>
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-10 hover:bg-cyan-500/5 hover:border-cyan-500/40 cursor-pointer transition-all">
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".log,.txt"
              />
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500 mb-4">
                <Terminal className="h-8 w-8" />
              </div>
              <span className="text-sm font-bold text-slate-200">
                {file ? `Ready: ${file.name}` : "Drop log file here, or click to browse"}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">Supports .log and .txt files accepted by the backend.</span>
            </label>
          </div>
        </div>

        {/* Sidebar Status & Action */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Validation Preview</h3>
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <FileCheck2 className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase">Format Validated</span>
                </div>

                {ingesting && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-cyan-500 animate-pulse">Uploading to FastAPI...</span>
                      <span className="text-muted-foreground">pending</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full w-1/2 animate-pulse bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]" 
                      />
                    </div>
                  </div>
                )}

                <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] text-slate-400 overflow-hidden">
                  <div className="text-cyan-500 mb-2">// Backend target</div>
                  <div>application_key={selectedTarget.application_key}</div>
                  <div>component_name={selectedTarget.component_name}</div>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={ingesting}
                  className="w-full rounded-xl bg-cyan-500 py-3 text-[10px] font-black uppercase tracking-widest text-[#05080d] shadow-lg shadow-cyan-900/40 hover:scale-105 transition-all"
                >
                  {ingesting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Start Ingestion"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 border border-white/5 border-dashed rounded-xl">
                <FileX2 className="h-8 w-8 text-muted-foreground/20" />
                <span className="text-[10px] font-black uppercase text-muted-foreground/30 mt-2">Waiting for input</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
