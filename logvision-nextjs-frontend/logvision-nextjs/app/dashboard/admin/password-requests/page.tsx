"use client";

import { useEffect, useState, useMemo } from "react";
import { Check, X, Clock, Key, ShieldAlert, Search, Copy, Eye, EyeOff, ArrowUpDown } from "lucide-react";
import {
  approvePasswordResetRequest,
  getPasswordResetRequests,
  rejectPasswordResetRequest,
} from "@/lib/api";
import { toast } from "sonner";

type PasswordRequestRow = {
  id: number;
  email: string;
  username?: string | null;
  reason?: string | null;
  has_requested_password?: boolean;
  requested_at: string;
  status: "pending" | "approved" | "rejected" | string;
};

export default function PasswordRequestsPage() {
  const [rows, setRows] = useState<PasswordRequestRow[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getPasswordResetRequests().then((r) => {
      setRows((r.data || []) as PasswordRequestRow[]);
      setDemo(r.usingFallback);
    });
  }, []);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      const matchesSearch = 
        r.email.toLowerCase().includes(search.toLowerCase()) || 
        (r.username || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.requested_at).getTime();
      const dateB = new Date(b.requested_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [rows, search, statusFilter, sortOrder]);

  const pendingCount = useMemo(() => {
    return rows.filter(r => r.status === "pending").length;
  }, [rows]);

  function openApproveModal(id: number) {
    setApproveId(id);
    setAdminComment("");
    setNewPassword("");
    setFormError(null);
    setResultPassword(null);
    setShowPassword(false);
    setCopied(false);
  }

  function closeApproveModal() {
    if (loading) return;
    setApproveId(null);
    setFormError(null);
  }

  async function confirmApprove() {
    if (approveId == null) return;
    if (newPassword.trim() && newPassword.trim().length < 8) {
      setFormError("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    setLoading(true);
    setFormError(null);
    try {
      const res = await approvePasswordResetRequest(
        approveId,
        adminComment.trim() || undefined,
        newPassword.trim() || undefined
      );
      setRows((prev) =>
        prev.map((x) => (x.id === approveId ? { ...x, status: "approved" } : x))
      );
      const temp = (res.data as { temporary_password?: string })?.temporary_password;
      setResultPassword(temp || null);
    } catch {
      setFormError("Echec de l'approbation. Verifiez le backend puis reessayez.");
    } finally {
      setLoading(false);
    }
  }

  function openRejectModal(id: number) {
    setRejectId(id);
    setAdminComment("");
    setFormError(null);
  }

  async function confirmReject() {
    if (rejectId == null) return;
    setLoading(true);
    setFormError(null);
    try {
      await rejectPasswordResetRequest(rejectId, adminComment.trim() || undefined);
      setRows((prev) =>
        prev.map((x) => (x.id === rejectId ? { ...x, status: "rejected" } : x))
      );
      toast.success("Demande rejetée");
      setRejectId(null);
    } catch {
      setFormError("Échec du rejet. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPassword() {
    if (!resultPassword) return;
    try {
      await navigator.clipboard.writeText(resultPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFormError("Impossible de copier automatiquement.");
    }
  }

  return (
    <div className="space-y-6">
      {demo && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          Backend unavailable, showing demo data.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-red-600" />
        <div>
          <h1 className="text-xl font-bold">Demandes de réinitialisation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérer les demandes de changement de mot de passe des utilisateurs.
          </p>
        </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 shadow-[0_0_15px_rgba(220,38,38,0.15)] animate-pulse-subtle">
            <span className="h-2 w-2 rounded-full bg-red-600"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{pendingCount} en attente</span>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email ou username..."
            className="w-full rounded border border-border bg-secondary px-3 py-2 pl-9 pr-8 text-sm focus:ring-1 focus:ring-red-600 outline-none transition-all"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-white/10 text-muted-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-border bg-secondary px-3 py-2 text-sm focus:ring-1 focus:ring-red-600 outline-none cursor-pointer transition-all"
        >
          <option value="All">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden rounded-xl border border-border/50 shadow-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-white/5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Requested password</th>
              <th className="px-3 py-2">
                <button 
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Requested at
                  <ArrowUpDown className={`h-3 w-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                </button>
              </th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-accent/20">
                <td 
                  className="px-3 py-3 font-medium cursor-pointer hover:text-red-500 transition-colors"
                  title="Filtrer par cet email"
                  onClick={() => setSearch(r.email)}
                >
                  {r.email}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{r.username || "-"}</td>
                <td className="px-3 py-3 italic text-xs max-w-[200px] truncate" title={r.reason || ""}>{r.reason || "-"}</td>
                <td className="px-3 py-3">
                  {r.has_requested_password ? (
                    <div className="flex items-center gap-1 text-red-400">
                      <Key className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase">Proposé</span>
                    </div>
                  ) : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 opacity-50" /> {new Date(r.requested_at).toLocaleString("fr-FR")}</div>
                </td>
                <td className="px-3 py-2">
                  <span
                    onClick={() => setStatusFilter(r.status === statusFilter ? "All" : r.status)}
                    title={r.status === statusFilter ? "Retirer le filtre" : `Filtrer par ${r.status}`}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                      "cursor-pointer transition-transform active:scale-95 " +
                      r.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        : r.status === "rejected"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.2)]"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse-subtle"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openApproveModal(r.id)}
                      disabled={r.status !== "pending"}
                      className="text-emerald-500 hover:scale-125 transition-transform disabled:opacity-30 disabled:hover:scale-100"
                      title="Approuver"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openRejectModal(r.id)}
                      disabled={r.status !== "pending"}
                      className="text-red-500 hover:scale-125 transition-transform disabled:opacity-30 disabled:hover:scale-100"
                      title="Rejeter"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground italic">
                  Aucune demande ne correspond à vos critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {approveId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl shadow-black">
            <h2 className="text-lg font-semibold">Approuver la demande</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Définissez un mot de passe ou laissez vide pour une génération sécurisée.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs uppercase text-muted-foreground">
                  Commentaire admin (optionnel)
                </label>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-muted-foreground">
                  Nouveau mot de passe (optionnel)
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Au moins 8 caracteres"
                  className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm focus:ring-1 focus:ring-red-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400"
                >
                  {showPassword ? "Masquer" : "Afficher"} les caractères
                </button>
              </div>

              {formError && <p className="text-xs text-red-400">{formError}</p>}
              {resultPassword && (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  <p>
                    Mot de passe applique:{" "}
                    <span className="font-mono font-bold">{showPassword ? resultPassword : "••••••••••••"}</span>
                  </p>
                  <button type="button" onClick={copyPassword} className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase underline">
                    <Copy className="h-3 w-3" /> Copier
                  </button>
                  {copied && <p className="mt-1 text-[11px] text-emerald-200">Copie effectuee.</p>}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeApproveModal}
                disabled={loading}
                className="rounded border border-border px-3 py-2 text-sm"
              >
                Fermer
              </button>
              <button
                onClick={confirmApprove}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all disabled:opacity-50"
              >
                {loading ? "Traitement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl shadow-black">
            <h2 className="text-lg font-semibold text-red-500">Rejeter la demande</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Indiquez la raison du rejet. Ce commentaire sera visible par l'utilisateur.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs uppercase text-muted-foreground">
                  Commentaire de rejet
                </label>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm focus:ring-1 focus:ring-red-600 outline-none"
                  rows={4}
                  placeholder="Ex: Identité non vérifiée, demande hors processus..."
                />
              </div>
              {formError && <p className="text-xs text-red-400">{formError}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRejectId(null)}
                disabled={loading}
                className="rounded border border-border px-3 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={confirmReject}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all"
              >
                {loading ? "Traitement..." : "Confirmer le rejet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
