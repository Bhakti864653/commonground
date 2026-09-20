"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

export function CaseLookupForm() {
  const { language } = useLanguage();
  const router = useRouter();
  const [value, setValue] = useState("");
  const t = UI_STRINGS.caseLookup;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        router.push(`/cases/${encodeURIComponent(trimmed)}`);
      }}
      className="mt-2 flex gap-2"
    >
      <label className="sr-only" htmlFor="case-lookup">
        {t.heading[language]}
      </label>
      <input
        id="case-lookup"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t.placeholder[language]}
        className="w-full rounded-md border border-ink/15 bg-cream px-3 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream"
      >
        {t.submit[language]}
      </button>
    </form>
  );
}
