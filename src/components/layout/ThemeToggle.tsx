"use client";

import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { useTheme } from "@/lib/theme/use-theme";

/**
 * Same look and convention as LanguageToggle: the label names what the button switches *to*,
 * and the icon is always paired with text (DESIGN_SYSTEM: never an icon alone).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? UI_STRINGS.themeToggle.toLight : UI_STRINGS.themeToggle.toDark;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`${UI_STRINGS.themeToggle.ariaLabel[language]}: ${label[language]}`}
      // Until the theme is known on the client (one frame during hydration), keep the button's
      // space reserved but hidden, so it never shows the wrong label first.
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${theme === null ? "invisible" : ""} ${className ?? ""}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label[language]}
    </button>
  );
}
