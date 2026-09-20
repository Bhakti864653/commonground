import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function ResidentAppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
