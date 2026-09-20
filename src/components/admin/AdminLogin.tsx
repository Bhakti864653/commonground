"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/lib/admin/actions";

/**
 * English-only, unlike the rest of the app: this is an internal single-operator tool
 * (MODERATION.md "Access"), not resident-facing product surface, so it doesn't carry the
 * same bilingual requirement.
 */
export function AdminLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4">
      <p className="text-sm font-medium text-slate">CommonGround — Admin prototype</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(false);
          const ok = await loginAdmin(code);
          if (ok) {
            router.refresh();
          } else {
            setError(true);
            setSubmitting(false);
          }
        }}
        className="flex w-full flex-col gap-2"
      >
        <label htmlFor="admin-code" className="text-sm font-medium text-ink">
          Access code
        </label>
        <input
          id="admin-code"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          className="rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        />
        {error && <p className="text-xs text-coral">Incorrect code.</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-md bg-teal px-3 py-2 text-sm font-medium text-cream disabled:opacity-50"
        >
          {submitting ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
