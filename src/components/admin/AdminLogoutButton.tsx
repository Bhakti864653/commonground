"use client";

import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/lib/admin/actions";

export function AdminLogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await logoutAdmin();
        router.refresh();
      }}
      className="shrink-0 rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink"
    >
      Log out
    </button>
  );
}
