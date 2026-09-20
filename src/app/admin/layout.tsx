import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return <AdminLogin />;
  }
  return <AdminShell>{children}</AdminShell>;
}
