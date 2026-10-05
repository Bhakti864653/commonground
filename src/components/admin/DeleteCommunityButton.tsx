"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteCommunity } from "@/lib/store/admin-community-actions";

const ERRORS = {
  not_found: "It was already deleted.",
  built_in: "Built-in communities can't be deleted.",
  has_cases: "Someone has reported in it since this page loaded, so it can't be deleted.",
} as const;

/**
 * Two clicks, like "Mark reviewed": deleting a community can't be undone. Only shown for a
 * community created at runtime that has no cases; the server checks both again.
 */
export function DeleteCommunityButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-coral/40 px-2 py-0.5 text-xs font-medium text-coral"
      >
        Delete
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-xs text-ink">Delete {name}? This can&rsquo;t be undone.</span>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        className="rounded-md border border-ink/15 px-2 py-0.5 text-xs font-medium text-ink"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await adminDeleteCommunity(id);
          setPending(false);
          if (result.ok) router.refresh();
          else setError(ERRORS[result.error]);
        }}
        className="rounded-md bg-coral px-2 py-0.5 text-xs font-medium text-cream disabled:opacity-50"
      >
        Yes, delete
      </button>
      {error && (
        <span role="alert" className="basis-full text-xs text-coral">
          {error}
        </span>
      )}
    </span>
  );
}
