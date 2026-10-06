"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAddModerator, adminRemoveModerator } from "@/lib/admin/moderator-actions";

const ADD_ERRORS = {
  invalid: "That doesn't look like an email address.",
  exists: "That person is already a moderator.",
} as const;

/** The owner's form for adding a moderator by their Google email. */
export function AddModeratorForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setMessage(null);
        const result = await adminAddModerator({ email, name });
        setPending(false);
        if (result.ok) {
          setEmail("");
          setName("");
          setMessage(`Added ${result.moderator.email}. They can now sign in with Google.`);
          router.refresh();
        } else {
          setMessage(ADD_ERRORS[result.error]);
        }
      }}
      className="flex flex-col gap-3 rounded-[20px] bg-surface p-5"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-medium text-ink">
          Google email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-sm font-medium text-ink">
          Name (optional)
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>
      <button type="submit" disabled={pending} className="w-max rounded-md bg-teal px-4 py-2 text-sm font-medium text-cream disabled:opacity-50">
        {pending ? "Adding..." : "Add moderator"}
      </button>
      {message && (
        <p role="status" className="text-sm text-ink">
          {message}
        </p>
      )}
    </form>
  );
}

/** Two clicks, like deleting a community. */
export function RemoveModeratorButton({ email }: { email: string }) {
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
        Remove
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-xs text-ink">Remove {email}? They&rsquo;ll be signed out right away.</span>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-ink/15 px-2 py-0.5 text-xs font-medium text-ink">
        Cancel
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await adminRemoveModerator(email);
          setPending(false);
          if (result.ok || result.error === "not_found") router.refresh();
          else setError("The owner can't be removed.");
        }}
        className="rounded-md bg-coral px-2 py-0.5 text-xs font-medium text-cream disabled:opacity-50"
      >
        Yes, remove
      </button>
      {error && <span className="text-xs text-coral">{error}</span>}
    </span>
  );
}
