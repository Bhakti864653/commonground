"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { reportInaccuracy } from "@/lib/store/actions";

export function InaccuracyFlagForm({ caseNumber }: { caseNumber: string }) {
  const { language } = useLanguage();
  const t = UI_STRINGS.caseDetail.inaccuracy;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  if (status === "done") {
    return <p className="text-sm font-medium text-teal">{t.success[language]}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate hover:text-ink"
      >
        <Flag aria-hidden="true" className="h-3.5 w-3.5" />
        {t.heading[language]}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-ink/10 p-4">
      <p className="text-sm font-medium text-ink">{t.heading[language]}</p>
      <p className="mt-1 text-xs text-slate">{t.body[language]}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label={t.heading[language]}
        placeholder={t.notePlaceholder[language]}
        rows={2}
        className="mt-2 w-full rounded-md border border-ink/15 bg-cream p-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      />
      {status === "error" && <p className="mt-1 text-xs text-coral">{t.error[language]}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            setStatus("submitting");
            const ok = await reportInaccuracy(caseNumber, note || undefined);
            setStatus(ok ? "done" : "error");
          }}
          disabled={status === "submitting"}
          className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50"
        >
          {t.submit[language]}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink"
        >
          {UI_STRINGS.caseDetail.manage.cancelButton[language]}
        </button>
      </div>
    </div>
  );
}
