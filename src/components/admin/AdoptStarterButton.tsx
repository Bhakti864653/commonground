"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAdoptStarterCommunity } from "@/lib/store/admin-community-actions";

/** Two clicks: marking a community reviewed removes its "not reviewed" notice for residents. */
export function AdoptStarterButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="rounded-md border border-teal/40 px-2 py-0.5 text-xs font-medium text-teal">
        Mark reviewed
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-xs text-ink">You&rsquo;ll moderate its reports?</span>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-ink/15 px-2 py-0.5 text-xs font-medium text-ink">
        Cancel
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await adminAdoptStarterCommunity(id);
          setPending(false);
          router.refresh();
        }}
        className="rounded-md bg-teal px-2 py-0.5 text-xs font-medium text-cream disabled:opacity-50"
      >
        Yes, mark reviewed
      </button>
    </span>
  );
}
