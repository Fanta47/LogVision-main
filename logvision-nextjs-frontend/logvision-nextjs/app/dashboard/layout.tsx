import { DashboardShell } from "@/components/DashboardShell";
<<<<<<< HEAD
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <DashboardShell>{children}</DashboardShell>; }
=======
import RouteGuard from "@/components/RouteGuard";
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <RouteGuard><DashboardShell>{children}</DashboardShell></RouteGuard>; }
>>>>>>> 494bacd (Save workspace snapshot)
