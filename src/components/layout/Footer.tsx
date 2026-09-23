import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { LogoMark } from "./Logo";

/**
 * Required on every page (CLAUDE.md "Project identity") — rendered in both languages
 * regardless of the active UI language, since it's a legal/trust disclosure, not app copy.
 */
export function Footer() {
  return (
    <footer className="border-t border-ink/10 px-4 pb-28 pt-8 xl:pb-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center text-xs leading-relaxed text-slate">
        <LogoMark className="h-7 w-7 opacity-80" />
        <p>{UI_STRINGS.footer.independenceEs}</p>
        <p>{UI_STRINGS.footer.independenceEn}</p>
      </div>
    </footer>
  );
}
