"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { deleteSubmission } from "@/lib/store/actions";

export function DeleteSubmission({
  caseNumber,
  managementToken,
  onDeleted,
}: {
  caseNumber: string;
  managementToken: string;
  onDeleted: () => void;
}) {
  const { language } = useLanguage();
  const t = UI_STRINGS.caseDetail.manage;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="rounded-lg border border-coral/25 p-4">
      <p className="text-sm font-medium text-ink">{t.heading[language]}</p>
      {error && <p className="mt-1 text-xs text-coral">{t.error[language]}</p>}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2 flex items-center gap-1.5 rounded-md border border-coral/40 px-3 py-1.5 text-sm font-medium text-coral"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          {t.deleteButton[language]}
        </button>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-ink">{t.confirmPrompt[language]}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setError(false);
                const ok = await deleteSubmission(caseNumber, managementToken);
                if (ok) {
                  onDeleted();
                } else {
                  setError(true);
                  setDeleting(false);
                }
              }}
              className="rounded-md bg-coral px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50"
            >
              {t.confirmButton[language]}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink"
            >
              {t.cancelButton[language]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
