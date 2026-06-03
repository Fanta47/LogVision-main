"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
<<<<<<< HEAD
import { getSession, SessionUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

=======
import { dashboardPathForRole, getCurrentUser, SessionUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

function canAccess(pathname: string, role: SessionUser["role"]) {
  if (pathname.startsWith("/dashboard/admin")) return role === "admin";
  if (pathname.startsWith("/dashboard/manager")) return role === "manager";
  return true;
}

>>>>>>> 494bacd (Save workspace snapshot)
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
<<<<<<< HEAD
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
=======
    let active = true;

    (async () => {
      const current = await getCurrentUser();

      if (!active) return;

      if (!current) {
        router.push("/login");
        return;
      }

      const sessionUser: SessionUser = {
        name: current.name,
        email: current.email,
        role: current.role,
        initials: current.initials || current.name.slice(0, 2).toUpperCase(),
      };

      setUser(sessionUser);

      if (!canAccess(pathname, sessionUser.role)) {
        router.push(dashboardPathForRole(sessionUser.role));
        return;
      }

      if (pathname === "/dashboard") {
        const roleHome = dashboardPathForRole(sessionUser.role);
        if (roleHome !== "/dashboard") router.push(roleHome);
      }
    })();

    return () => {
      active = false;
    };
>>>>>>> 494bacd (Save workspace snapshot)
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
<<<<<<< HEAD

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} />

        <main className="flex-1 overflow-y-auto bg-[#05080d] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
=======
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto bg-[#05080d] p-6">{children}</main>
      </div>
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
