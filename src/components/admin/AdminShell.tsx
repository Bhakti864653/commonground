import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "./AdminLogoutButton";

/** "Explicitly labeled as a prototype everywhere it appears" — MODERATION.md. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="flex items-center justify-between gap-3 border-b border-coral/30 bg-coral/5 px-4 py-3">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-ink">
            CommonGround — Admin (local prototype)
          </Link>
          <p className="text-xs text-slate">
            Never forwards anything externally. Every action is recorded.
          </p>
        </div>
        <AdminLogoutButton />
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
