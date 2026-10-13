import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AdminNav, BackToPipeline } from "./AdminNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { CurrentModerator } from "@/lib/admin/auth";

/** "Explicitly labeled as a prototype everywhere it appears" — MODERATION.md. */
export function AdminShell({ children, moderator }: { children: ReactNode; moderator: CurrentModerator }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-coral/30 bg-coral/5 px-4 py-3">
        <div>
          <Link href="/admin/pipeline" className="text-sm font-semibold text-ink">
            CommonGround — Moderator
          </Link>
          <p className="text-xs text-slate">
            Nothing is ever sent outside CommonGround. Every action is recorded
            {moderator.email ? ` under your name. Signed in as ${moderator.email}${moderator.role === "owner" ? " (owner)" : ""}.` : ". Signed in with the shared access code."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminNav />
          <ThemeToggle />
          <AdminLogoutButton />
        </div>
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        <BackToPipeline />
        <div>{children}</div>
      </main>
    </div>
  );
}
