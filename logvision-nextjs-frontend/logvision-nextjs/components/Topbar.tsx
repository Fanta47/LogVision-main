"use client";
<<<<<<< HEAD
import { Search, LogOut, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout, roleLabel, SessionUser } from "@/lib/auth";
export function Topbar({ user }: { user: SessionUser }) {
  const router = useRouter();
  return <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input placeholder="Search logs, anomalies, dashboards..." className="h-8 w-80 rounded-md bg-secondary pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
    <div className="flex items-center gap-4"><Bell className="h-4 w-4 text-muted-foreground" /><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{user.initials}</div><div className="hidden flex-col leading-tight md:flex"><span className="text-xs font-medium">{user.name}</span><span className="text-[10px] text-muted-foreground">{roleLabel(user.role)}</span></div><span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">{user.role}</span></div><button onClick={() => { logout(); router.push("/login"); }} className="text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /></button></div>
  </header>;
=======
import { useState } from "react";
import { Search, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout, SessionUser } from "@/lib/auth";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LogoutConfirmation } from "@/components/LogoutConfirmation";

export function Topbar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleConfirmLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#05080d]/80 px-6 backdrop-blur-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input placeholder="Rechercher des logs, anomalies..." className="h-9 w-96 rounded-full border border-white/10 bg-white/5 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-600 focus:w-[500px] transition-all duration-300" />
      </div>

      <div className="flex items-center gap-6">
        <NotificationsBell />
        
        <div className="flex items-center gap-3 border-r border-white/10 pr-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white">
            {user.initials}
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase shadow-lg ${user.role === 'admin' ? 'bg-red-600 text-white shadow-red-600/40' : 'bg-emerald-500 text-white'}`}>
            {user.role}
          </span>
        </div>

        <button 
          onClick={() => setShowLogoutConfirm(true)} 
          className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          Quitter
        </button>
      </div>

      <LogoutConfirmation 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={handleConfirmLogout} 
      />
    </header>
  );
>>>>>>> 494bacd (Save workspace snapshot)
}
