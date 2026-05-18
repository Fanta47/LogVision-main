"use client";

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
                  : "text-slate-400 hover:bg-[#101722]/80 hover:text-slate-100",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5 transition",
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