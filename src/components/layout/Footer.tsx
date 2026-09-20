import { UI_STRINGS } from "@/lib/i18n/dictionary";

/**
 * Required on every page (CLAUDE.md "Project identity") — rendered in both languages
 * regardless of the active UI language, since it's a legal/trust disclosure, not app copy.
 */
export function Footer() {
  return (
    <footer className="border-t border-ink/10 px-4 py-6 pb-24 text-center text-xs text-slate md:pb-6">
      <p>{UI_STRINGS.footer.independenceEs}</p>
      <p className="mt-1">{UI_STRINGS.footer.independenceEn}</p>
    </footer>
  );
}
