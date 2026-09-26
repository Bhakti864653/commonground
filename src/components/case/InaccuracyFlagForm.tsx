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
        className="flex items-center justify-center gap-1.5 rounded-full border border-ink px-5 py-3 text-sm font-extrabold text-ink hover:bg-surface/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      >
        <Flag aria-hidden="true" className="h-3.5 w-3.5" />
        {t.heading[language]}
      </button>
    );
  }

  return (
    <div className="rounded-[17px] bg-surface/80 p-4">
      <p className="text-sm font-medium text-ink">{t.heading[language]}</p>
      <p className="mt-1 text-xs text-slate">{t.body[language]}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        aria-label={t.heading[language]}
        placeholder={t.notePlaceholder[language]}
        rows={2}
        className="mt-2 w-full rounded-[13px] border border-line bg-surface p-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
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
          className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-cream disabled:opacity-50"
        >
          {t.submit[language]}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-ink px-4 py-2 text-sm font-bold text-ink"
        >
          {UI_STRINGS.caseDetail.manage.cancelButton[language]}
        </button>
      </div>
    </div>
  );
}
