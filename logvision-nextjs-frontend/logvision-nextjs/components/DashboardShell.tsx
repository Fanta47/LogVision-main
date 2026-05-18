"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession, SessionUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const s = getSession();

    if (!s) {
      router.push("/login");
      return;
    }

    setUser(s);

    if (pathname === "/dashboard" && s.role === "admin") {
      router.push("/dashboard/admin/system");
      return;
    }

    if (pathname === "/dashboard" && s.role === "manager") {
      router.push("/dashboard/manager");
      return;
    }
  }, [router, pathname]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05080d] text-sm text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#05080d] text-slate-100">
      <Sidebar role={user.role} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} />

        <main className="flex-1 overflow-y-auto bg-[#05080d] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}