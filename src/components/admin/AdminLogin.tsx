"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdmin } from "@/lib/admin/actions";
import type { LoginProblem } from "@/lib/admin/google-routes";

const PROBLEMS: Record<LoginProblem, string> = {
  not_moderator: "That Google account isn't on the moderator list. Ask the owner to add it, then try again.",
  cancelled: "Sign-in was cancelled.",
  failed: "Sign-in didn't work. Please try again.",
  unavailable: "Google sign-in isn't set up yet.",
};

/**
 * English-only, unlike the rest of the app: this is an internal moderator tool
 * (MODERATION.md "Access"), not resident-facing product surface, so it doesn't carry the
 * same multilingual requirement. Moderators sign in with Google; the shared access code stays
 * as a fallback only while ADMIN_ACCESS_CODE is set.
 */
export function AdminLogin({ googleEnabled, codeEnabled }: { googleEnabled: boolean; codeEnabled: boolean }) {
  const router = useRouter();
  const problemParam = useSearchParams().get("login");
  const problem = problemParam && problemParam in PROBLEMS ? PROBLEMS[problemParam as LoginProblem] : null;
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4">
      <p className="text-sm font-medium text-slate">CommonGround — Moderators</p>
      {problem && (
        <p role="alert" className="w-full rounded-md border border-coral/40 bg-coral/5 px-3 py-2 text-sm text-ink">
          {problem}
        </p>
      )}
      {googleEnabled && (
        <a
          href="/api/auth/google"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-ink/20 bg-white px-3 py-2.5 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f7f7f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[18px] w-[18px]">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Sign in with Google
        </a>
      )}
      {googleEnabled && codeEnabled && <p className="text-xs text-slate">or, until everyone uses Google</p>}
      {codeEnabled && (
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
            autoFocus={!googleEnabled}
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
      )}
      {!googleEnabled && !codeEnabled && <p className="text-sm text-ink">Moderator sign-in isn&apos;t set up on this server.</p>}
    </div>
  );
}
