"use client";

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