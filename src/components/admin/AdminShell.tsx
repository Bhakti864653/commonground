import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** "Explicitly labeled as a prototype everywhere it appears" — MODERATION.md. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-coral/30 bg-coral/5 px-4 py-3">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-ink">
            CommonGround — Admin (local prototype)
          </Link>
          <p className="text-xs text-slate">
            Never forwards anything externally. Every action is recorded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Admin" className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/admin" className="rounded-full px-3 py-1.5 text-ink hover:bg-mint">
              Cases
            </Link>
            <Link href="/admin/communities" className="rounded-full px-3 py-1.5 text-ink hover:bg-mint">
              Communities
            </Link>
            <Link href="/admin/sources" className="rounded-full px-3 py-1.5 text-ink hover:bg-mint">
              Sources &amp; contacts
            </Link>
          </nav>
          <ThemeToggle />
          <AdminLogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
