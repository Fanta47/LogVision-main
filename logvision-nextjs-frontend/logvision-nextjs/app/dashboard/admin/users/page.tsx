<<<<<<< HEAD
﻿import { Users, Wrench } from "lucide-react";

const users = [
  { name: "Admin User", role: "admin" },
  { name: "Manager User", role: "manager" },
  { name: "Analyst User", role: "user" },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Admin Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestion des utilisateurs et acces.</p>
        </div>
      </div>

      <div className="glass-card rounded-lg p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Name</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.name} className="border-t border-border">
                <td className="py-3">{u.name}</td>
                <td className="uppercase">{u.role}</td>
                <td>Active</td>
              </tr>
            ))}
=======
﻿﻿"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ShieldCheck, ShieldOff, Trash2, UserCog, X, Clock } from "lucide-react";
import { createAdminUser, deleteAdminUser, disableAdminUser, enableAdminUser, getAdminUsers, updateAdminUser } from "@/lib/api";
import { SlideToDeleteModal } from "@/components/SlideToDeleteModal";

type UserRole = "Admin" | "Manager" | "Analyst";
type UserStatus = "active" | "inactive" | "suspended";

type Row = {
  id: number;
  user: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
};

type Draft = { user: string; email: string; password: string; role: UserRole };

const ROLE_BADGE: Record<UserRole, string> = {
  Admin: "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.2)]",
  Manager: "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  Analyst: "bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
};

const STATUS_BADGE: Record<UserStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
  inactive: "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.2)]",
  suspended: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
};

const EMPTY_DRAFT: Draft = { user: "", email: "", password: "", role: "Analyst" };

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [demo, setDemo] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | UserRole>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | UserStatus>("All");
  const [modal, setModal] = useState<null | "create" | "edit">(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [rowToDelete, setRowToDelete] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  useEffect(() => {
    getAdminUsers().then((r) => {
      setRows((r.data as Row[]) || []);
      setDemo(r.usingFallback);
    });
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const userName = (r.user || "").toLowerCase();
      const userEmail = (r.email || "").toLowerCase();
      const okSearch = userName.includes(search.toLowerCase()) || userEmail.includes(search.toLowerCase());
      const okRole = roleFilter === "All" || r.role === roleFilter;
      const okStatus = statusFilter === "All" || r.status === statusFilter;
      return okSearch && okRole && okStatus;
    });
  }, [rows, search, roleFilter, statusFilter]);

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setEmailError("");
    setModal("create");
  }

  function openEdit(row: Row) {
    setEditing(row);
    setDraft({ user: row.user, email: row.email, password: "", role: row.role });
    setEmailError("");
    setModal("edit");
  }

  function handleEmailChange(val: string) {
    const email = val.trim();
    setDraft({ ...draft, email: val });
    
    if (rows.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      setEmailError("Cet email est déjà utilisé par un autre utilisateur.");
    } else {
      setEmailError("");
    }
  }

  async function onCreate() {
    const cleanUser = draft.user.trim();
    const cleanEmail = draft.email.trim().toLowerCase();
    const cleanPass = draft.password.trim();

    if (!cleanUser || !cleanEmail || cleanPass.length < 8 || emailError) {
      alert("Veuillez remplir tous les champs (Nom, Email, Mot de passe).");
      return;
    }

    if (!cleanEmail.endsWith("@vermeg.com")) {
      alert("L'adresse email doit obligatoirement appartenir au domaine @vermeg.com");
      return;
    }

    setLoading(true);
    const res = await createAdminUser({ email: cleanEmail, name: cleanUser, password: cleanPass, role: draft.role });
    if (res.error) {
      setLoading(false);
      if (res.error === "user_exists") {
        alert("Un utilisateur avec cet email existe déjà.");
        return;
      }
      if (res.error === "unavailable") {
        alert("Erreur : Le backend n'est pas lancé ou est injoignable (Docker).");
      } else {
        alert(`Erreur lors de la création : ${res.error}`);
      }
      return;
    }
    // refetch authoritative list from server
    const list = await getAdminUsers();
    setRows((list.data as Row[]) || []);
    setDemo(list.usingFallback);
    setModal(null);
    setLoading(false);
  }

  async function onEdit() {
    if (!editing) return;
    setLoading(true);
    const res = await updateAdminUser(editing.id, { role: draft.role });
    
    if (res.error) {
      alert(`Erreur lors de la mise à jour : ${res.error}`);
      setLoading(false);
      return;
    }

    const list = await getAdminUsers();
    setRows((list.data as Row[]) || []);
    setDemo(list.usingFallback);
    setModal(null);
    setLoading(false);
  }

  async function onToggleStatus(row: Row) {
    setLoading(true);
    const res = row.status === "active" 
      ? await disableAdminUser(row.id) 
      : await enableAdminUser(row.id);

    if (res.error) {
      alert(`Impossible de changer le statut : ${res.error}`);
      setLoading(false);
      return;
    }

    // Refresh list to see actual status from Postgres
    const list = await getAdminUsers();
    setRows((list.data as Row[]) || []);
    setLoading(false);
  }

  function openDeleteConfirm(row: Row) {
    setRowToDelete(row);
  }

  async function onConfirmDelete() {
    if (!rowToDelete) return;
    setLoading(true);
    const res = await deleteAdminUser(rowToDelete.id);
    
    if (res.error) {
      alert(`Impossible de supprimer : ${res.error === "not_found" ? "Utilisateur introuvable dans Postgres" : res.error}`);
      setLoading(false);
      return;
    }

    // Refresh list to verify deletion in Postgres
    const list = await getAdminUsers();
    setRows((list.data as Row[]) || []);
    setDemo(list.usingFallback);
    setRowToDelete(null);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {demo && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">Backend unavailable, showing demo data.</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Gestion des utilisateurs</h1>
          <p className="mt-1 text-xs text-muted-foreground font-medium uppercase tracking-tighter opacity-70">{rows.length} utilisateur{rows.length > 1 ? "s" : ""} enregistrés</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all animate-pulse-subtle">
          <Plus className="mr-1 inline h-3 w-3" />Nouvel utilisateur
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Rechercher par nom ou email..." 
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 pl-9 text-sm focus:ring-1 focus:ring-red-600 outline-none transition-all" 
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "All" | UserRole)} className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600 transition-all">
          <option value="All">Tous les rôles</option>
          <option value="Admin">Administrateurs</option>
          <option value="Manager">Managers</option>
          <option value="Analyst">Analystes</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | UserStatus)} className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600 transition-all">
          <option value="All">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
          <option value="suspended">Suspendus</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden rounded-xl border border-border/50 shadow-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-white/5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Utilisateur</th>
              <th className="px-5 py-4">Rôle</th>
              <th className="px-5 py-4">Statut</th>
              <th className="px-5 py-4">Dernière activité</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black border border-white/10 ${r.role === 'Admin' ? 'bg-red-500/20 text-red-500' : 'bg-secondary text-muted-foreground'}`}>
                      {(r.user || "??").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold tracking-tight">{r.user || "Utilisateur"}</p>
                      <p className="text-[11px] text-muted-foreground/70">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter ${ROLE_BADGE[r.role]}`}>
                    {r.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter ${STATUS_BADGE[r.status]}`}>
                    <span className={`h-1 w-1 rounded-full bg-current ${r.status === 'active' && 'animate-pulse'}`} />
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-mono">
                    <Clock className="h-3 w-3 opacity-40" /> {r.lastActive}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => openEdit(r)} 
                      className="p-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-red-500 transition-all"
                      title="Modifier"
                    >
                      <UserCog className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onToggleStatus(r)} 
                      className={`p-2 rounded-lg transition-all ${r.status === 'active' ? 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                      title={r.status === "active" ? "Désactiver" : "Activer"}
                    >
                      {r.status === "active" ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={() => openDeleteConfirm(r)} 
                      className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun résultat pour ces filtres.</td></tr>}
>>>>>>> 494bacd (Save workspace snapshot)
          </tbody>
        </table>
      </div>

<<<<<<< HEAD
      <div className="glass-card rounded-lg p-5">
        <div className="flex items-center gap-2 text-primary">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Under Construction</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Provisioning SSO, invitations et audit trails seront branches ici.</p>
      </div>
=======
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-[#0b111a] p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{modal === "create" ? "Nouvel utilisateur" : "Modifier utilisateur"}</h2><button onClick={() => setModal(null)}><X className="h-4 w-4" /></button></div>
            <div className="space-y-3">
              {modal === "create" && (
                <>
                  <input value={draft.user} onChange={(e) => setDraft({ ...draft, user: e.target.value })} placeholder="Nom complet" className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm" />
                  <div className="space-y-1">
                    <input value={draft.email} onChange={(e) => handleEmailChange(e.target.value)} placeholder="Email" className={`w-full rounded border bg-secondary px-3 py-2 text-sm ${emailError ? 'border-red-500' : 'border-border'}`} />
                    {emailError && <p className="text-[10px] text-red-400">{emailError}</p>}
                  </div>
                  <input value={draft.password} type="password" onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="Mot de passe initial" className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm" />
                </>
              )}
              {modal === "edit" && <p className="text-sm text-muted-foreground">Modification du rôle pour <span className="font-semibold text-foreground">{editing?.user}</span></p>}
              <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })} className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm">
                <option value="Admin">Admin</option><option value="Manager">Manager</option><option value="Analyst">Analyst</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button disabled={loading} onClick={() => setModal(null)} className="rounded border border-border px-3 py-2 text-sm disabled:opacity-50">Annuler</button>
              <button 
                disabled={loading || (modal === "create" && !!emailError)} 
                onClick={modal === "create" ? onCreate : onEdit} 
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all disabled:opacity-50"
              >
                {loading ? "Traitement..." : (modal === "create" ? "Créer" : "Enregistrer")}
              </button>
            </div>
          </div>
        </div>
      )}

      <SlideToDeleteModal 
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={onConfirmDelete}
        itemName={rowToDelete?.user || ""}
      />
>>>>>>> 494bacd (Save workspace snapshot)
    </div>
  );
}
