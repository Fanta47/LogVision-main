<<<<<<< HEAD
export default function ProfilePage() {
  return <div className="space-y-6"><div><h1 className="text-xl font-bold">Profile</h1><p className="mt-1 text-sm text-muted-foreground">Frontend demo profile. Replace with Keycloak user info when auth is connected.</p></div><div className="glass-card animate-slide-up rounded-lg p-5 text-sm text-muted-foreground">Authentication is currently local demo auth. Keep Keycloak validation in FastAPI for production.</div></div>;
=======
"use client";

import { useEffect, useState, useMemo } from "react";
import { User, Mail, Lock, Save, Shield, Palette, Bell, Volume2, Monitor, Calendar, Eye, EyeOff } from "lucide-react";
import { getProfile, updateProfile, updatePassword } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { toast } from "sonner";

export default function ProfilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"En ligne" | "Occupé" | "Hors-ligne">("En ligne"); // Default status
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [accountForm, setAccountForm] = useState({ name: "", email: "", department: "" });
  const [securityForm, setSecurityForm] = useState({ current: "", new: "", confirm: "" });
  const [prefs, setPrefs] = useState({ emailNotif: true, criticalAudio: true, desktopAlerts: false, weeklyDigest: true, showKibana: true });

  const sessionUser = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getSession();
  }, []);

  useEffect(() => {
    const savedPrefs = localStorage.getItem("logvision_prefs");
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));

    const savedStatus = localStorage.getItem("logvision_status");
    if (savedStatus) setStatus(savedStatus as "En ligne" | "Occupé" | "Hors-ligne");


    getProfile().then((res) => {
      if (res.data) {
        setData(res.data);
        setAccountForm({ name: res.data.user, email: res.data.email, department: res.data.department || "IT Operations" });
      }
      setLoading(false);
    });
  }, []);

  const passwordStrength = useMemo(() => {
    const pass = securityForm.new;
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  }, [securityForm.new]);

  const strengthColors = ["bg-transparent", "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500"];
  const strengthLabels = ["", "Faible", "Moyen", "Bon", "Excellent"];

  const togglePref = (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    localStorage.setItem("logvision_prefs", JSON.stringify(newPrefs));
  };

  const handleStatusChange = (newStatus: "En ligne" | "Occupé" | "Hors-ligne") => {
    setStatus(newStatus);
    localStorage.setItem("logvision_status", newStatus);
  };


  async function handleAccountUpdate() {
    if (!accountForm.email.toLowerCase().endsWith("@vermeg.com")) {
      toast.error("L'adresse email doit obligatoirement appartenir au domaine @vermeg.com");
      return;
    }

    setSaving(true);
    const res = await updateProfile(accountForm);
    if (!res.error) toast.success("Profil mis à jour");
    setSaving(false);
  }

  async function handlePasswordUpdate() {
    if (securityForm.new !== securityForm.confirm) return toast.error("Erreur de confirmation");
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(securityForm.new)) {
      return toast.error("Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.");
    }

    setSaving(true);
    const res = await updatePassword({ old: securityForm.current, new: securityForm.new });
    if (!res.error) {
      toast.success("Mot de passe modifié");
      setSecurityForm({ current: "", new: "", confirm: "" });
    } else toast.error(res.error);
    setSaving(false);
  }

  if (loading) return <div className="p-12 text-center animate-pulse text-muted-foreground">Initialisation du profil...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Header Sticky */}
      {/* Définition des styles par rôle pour la cohérence visuelle */}
      {(() => {
        // Prioritize session role as truth, fall back to API data or default
        const roleRaw = (sessionUser?.role || data?.role || "Analyst").toLowerCase();
        
        // Standardize role names for theme mapping
        const role = (
          roleRaw === "admin" ? "Admin" : 
          roleRaw === "manager" ? "Manager" : "Analyst"
        ) as "Admin" | "Manager" | "Analyst";

        const roleStyles = {
          Admin: { bg: "bg-red-600/20", text: "text-red-500", border: "border-red-500/30", shadow: "shadow-red-900/20", badge: "bg-red-600" },
          Manager: { bg: "bg-amber-600/20", text: "text-amber-500", border: "border-amber-500/30", shadow: "shadow-amber-900/20", badge: "bg-amber-600" },
          Analyst: { bg: "bg-cyan-600/20", text: "text-cyan-400", border: "border-cyan-500/30", shadow: "shadow-cyan-900/20", badge: "bg-cyan-600" },
        }[role as "Admin" | "Manager" | "Analyst"] || { bg: "bg-emerald-600/20", text: "text-emerald-500", border: "border-emerald-500/30", shadow: "shadow-emerald-900/20", badge: "bg-emerald-600" };

        const displayName = data?.user || sessionUser?.name || "User";

        return (
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/50 bg-background/80 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-full text-xl font-black border shadow-lg transition-all ${roleStyles.bg} ${roleStyles.text} ${roleStyles.border} ${roleStyles.shadow}`}>
            {role === "Admin" ? "A" : (displayName[0] || "U").toUpperCase()}
            <span className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === "En ligne" ? "bg-emerald-400" : status === "Occupé" ? "bg-amber-400" : "bg-red-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-background ${status === "En ligne" ? "bg-emerald-500" : status === "Occupé" ? "bg-amber-500" : "bg-red-600"}`}></span>
            </span>
          </div>
          <div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-1 font-black uppercase text-[10px] text-white shadow-lg transition-colors ${roleStyles.badge}`}>{role}</span>
                <span className="text-lg font-black tracking-tight text-white">{displayName}</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{data?.email || sessionUser?.email}</span>
              <select 
                value={status} title="Account Status"
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="bg-transparent border-none p-0 text-[10px] font-bold uppercase text-muted-foreground outline-none cursor-pointer hover:text-foreground transition-colors"
              >
                <option value="En ligne" className="bg-[#0b1220]">En ligne</option>
                <option value="Occupé" className="bg-[#0b1220]">Occupé</option>
                <option value="Hors-ligne" className="bg-[#0b1220]">Hors-ligne</option>
              </select>
            </div>
          </div>
        </div>
      </div>
        );
      })()}

      {/* Carte Compte */}
      <div className="glass-card rounded-xl p-6 space-y-5 border border-border/50">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter text-primary"><User className="h-4 w-4" /> Identité</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input value={accountForm.name} onChange={e => setAccountForm({...accountForm, name: e.target.value})} placeholder="Nom" className="rounded border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600" />
          <input value={accountForm.department} onChange={e => setAccountForm({...accountForm, department: e.target.value})} placeholder="Département" className="rounded border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600" />
        </div>
        <button onClick={handleAccountUpdate} disabled={saving} title="Save Identity Changes" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all">
          <Save className="h-4 w-4" /> Sauvegarder
        </button>
      </div>

      {/* Carte Préférences */}
      <div className="glass-card rounded-xl p-6 space-y-4 border border-border/50">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter text-primary"><Palette className="h-4 w-4" /> Préférences</div>
        <div className="divide-y divide-border/30">
          {[
            { id: 'emailNotif', label: 'Email Notifications', icon: Bell },
            { id: 'criticalAudio', label: 'Audio Alerts', icon: Volume2 },
            { id: 'desktopAlerts', label: 'Desktop Alerts', icon: Monitor },
            { id: 'weeklyDigest', label: 'Weekly Digest', icon: Calendar },
            { id: 'showKibana', label: 'Show Kibana Dashboards', icon: Eye },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3"><item.icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{item.label}</span></div>
              <button 
                onClick={() => togglePref(item.id as any)}
                className={`relative h-5 w-10 rounded-full transition-colors ${prefs[item.id as keyof typeof prefs] ? 'bg-emerald-500' : 'bg-red-600'}`}
              >
                <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${prefs[item.id as keyof typeof prefs] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Carte Sécurité */}
      <div className="glass-card rounded-xl p-6 space-y-5 border border-border/50">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter text-primary"><Shield className="h-4 w-4" /> Sécurité</div>
        <div className="space-y-3">
          <div className="relative">
            <input type={showCurrent ? "text" : "password"} placeholder="Mot de passe actuel" value={securityForm.current} onChange={e => setSecurityForm({...securityForm, current: e.target.value})} className="w-full rounded border border-border bg-secondary/50 pl-3 pr-10 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600" />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${showCurrent ? "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "text-muted-foreground hover:text-foreground"}`}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="relative">
                <input type={showNew ? "text" : "password"} placeholder="Nouveau" value={securityForm.new} onChange={e => setSecurityForm({...securityForm, new: e.target.value})} className="w-full rounded border border-border bg-secondary/50 pl-3 pr-10 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600" />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${showNew ? "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {securityForm.new && (
                <div className="space-y-1">
                  <div className="flex h-1 w-full gap-1 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full transition-all duration-500 ${strengthColors[passwordStrength]}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} role="progressbar" aria-valuenow={passwordStrength} aria-valuemin={0} aria-valuemax={4} />
                  </div>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${passwordStrength <= 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                    Force: {strengthLabels[passwordStrength]}
                  </p>
                </div>
              )}
            </div>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} placeholder="Confirmer" value={securityForm.confirm} onChange={e => setSecurityForm({...securityForm, confirm: e.target.value})} className="w-full rounded border border-border bg-secondary/50 pl-3 pr-10 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600" />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all ${showConfirm ? "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "text-muted-foreground hover:text-foreground"}`}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <button onClick={handlePasswordUpdate} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all">
          Changer le mot de passe
        </button>
      </div>
    </div>
  );
>>>>>>> 494bacd (Save workspace snapshot)
}
