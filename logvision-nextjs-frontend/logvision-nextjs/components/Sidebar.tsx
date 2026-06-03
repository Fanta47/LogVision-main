<<<<<<< HEAD
﻿"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Search,
  Clock3,
  Upload,
  BarChart3,
  User,
} from "lucide-react";

type SidebarProps = {
  role?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const operations: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Logs", href: "/dashboard/logs", icon: FileText },
  { label: "Alerts", href: "/dashboard/alerts", icon: AlertTriangle },
  { label: "Anomalies", href: "/dashboard/anomalies", icon: Search },
  { label: "Incidents", href: "/dashboard/incidents", icon: Clock3 },
];

const intelligence: NavItem[] = [
  { label: "Ingestion", href: "/dashboard/ingest", icon: Upload },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

const account: NavItem[] = [
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <section className="mt-8">
      <p className="px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {title}
      </p>

      <nav className="mt-3 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-semibold transition",
                active
                  ? "bg-[#101722] text-red-400"
=======
"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, AlertTriangle, Search, Clock3, Upload, BarChart3, User, Shield, Settings2, Bell, Server, TrendingUp, Brain, KeyRound, ChevronLeft, ChevronRight } from "lucide-react";
import { VermegAnimatedLogo } from "@/components/VermegAnimatedLogo";

type SidebarProps = { role?: string };
type NavItem = { label: string; href: string; icon: React.ElementType; color: string };

const userNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400" },
  { label: "Logs", href: "/dashboard/logs", icon: FileText, color: "text-blue-400" },
  { label: "Alerts", href: "/dashboard/alerts", icon: AlertTriangle, color: "text-blue-400" },
  { label: "Anomalies", href: "/dashboard/anomalies", icon: Search, color: "text-blue-400" },
  { label: "Incidents", href: "/dashboard/incidents", icon: Clock3, color: "text-blue-400" },
  { label: "Ingestion Logs", href: "/dashboard/ingest", icon: Upload, color: "text-blue-400" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, color: "text-blue-400" },
  { label: "Profile", href: "/dashboard/profile", icon: User, color: "text-blue-400" }
];

const managerNav: NavItem[] = [
  { label: "Strategic View", href: "/dashboard/manager", icon: TrendingUp, color: "text-amber-500" },
  { label: "Logs", href: "/dashboard/logs", icon: FileText, color: "text-amber-500" },
  { label: "Alerts", href: "/dashboard/alerts", icon: AlertTriangle, color: "text-amber-500" },
  { label: "Anomalies", href: "/dashboard/anomalies", icon: Search, color: "text-amber-500" },
  { label: "Incidents", href: "/dashboard/incidents", icon: Clock3, color: "text-amber-500" },
  { label: "Predictions", href: "/dashboard/predictions", icon: Brain, color: "text-amber-500" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, color: "text-amber-500" },
  { label: "Profile", href: "/dashboard/profile", icon: User, color: "text-amber-500" }
];

const adminNav: NavItem[] = [
  { label: "System Health", href: "/dashboard/admin/system", icon: Server, color: "text-rose-500" },
  { label: "Users", href: "/dashboard/admin/users", icon: User, color: "text-rose-500" },
  { label: "Roles", href: "/dashboard/admin/roles", icon: Shield, color: "text-rose-500" },
  { label: "Alert Rules", href: "/dashboard/admin/alert-rules", icon: Bell, color: "text-red-500" },
  { label: "Password Requests", href: "/dashboard/admin/password-requests", icon: KeyRound, color: "text-red-500" },
  { label: "Configuration", href: "/dashboard/admin/configuration", icon: Settings2, color: "text-red-500" },
  { label: "Profile", href: "/dashboard/profile", icon: User, color: "text-red-500" }
];

function isActive(pathname: string, href: string) { return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`); }
export function Sidebar({ role = "user" }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const items =
    role === "admin" ? adminNav : role === "manager" ? managerNav : userNav;

  const activeColorClass = role === "admin" ? "text-red-400" : role === "manager" ? "text-amber-400" : "text-blue-400";
  const activeGlowClass =
    role === "admin"
      ? "shadow-[0_0_15px_rgba(220,38,38,0.15)] border border-red-500/20"
      : role === "manager"
      ? "shadow-[0_0_15px_rgba(245,158,11,0.15)] border border-amber-500/20"
      : "shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-blue-500/20";

  return (
    <aside className={`relative flex h-screen shrink-0 flex-col border-r border-white/10 bg-[#05080d] transition-all duration-300 ${isCollapsed ? "w-[80px]" : "w-[300px]"}`}>
      <div className={`flex h-[78px] items-center border-b border-white/10 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "justify-center px-8"}`}>
        <VermegAnimatedLogo size={isCollapsed ? "sm" : "md"} />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={[
                `group flex items-center rounded-lg py-3 text-[15px] font-semibold transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "gap-3 px-4"}`,
                active
                  ? `bg-[#101722] ${activeColorClass} ${activeGlowClass}`
>>>>>>> 494bacd (Save workspace snapshot)
                  : "text-slate-400 hover:bg-[#101722]/80 hover:text-slate-100",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5 transition",
<<<<<<< HEAD
                  active ? "text-red-400" : "text-slate-500 group-hover:text-red-400",
                ].join(" ")}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[300px] shrink-0 flex-col border-r border-white/10 bg-[#05080d]">
      <div className="flex h-[78px] items-center border-b border-white/10 px-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-2 skew-x-[-15deg] bg-red-500" />
          <span className="text-3xl font-bold tracking-[0.18em] text-white">
            logvision
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <NavSection title="Operations" items={operations} pathname={pathname} />
        <NavSection title="Intelligence" items={intelligence} pathname={pathname} />
        <NavSection title="Account" items={account} pathname={pathname} />
      </div>
    </aside>
  );
}
=======
                  active ? activeColorClass : `${item.color} group-hover:opacity-80`,
                ].join(" ")}
              />
              {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-center rounded-lg bg-white/5 py-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-inner"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
