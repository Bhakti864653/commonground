"use client";

import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { useTheme } from "@/lib/theme/use-theme";

/**
 * The label names what the button switches *to*, and the icon is always paired with text
 * (DESIGN_SYSTEM: never an icon alone). `onDark` for the sidebar.
 */
export function ThemeToggle({ className, onDark = false }: { className?: string; onDark?: boolean }) {
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
      // Hidden (but space-reserving) until the theme is known on the client, so it never shows
      // the wrong label for a frame during hydration.
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onDark
          ? "border-sidebar-text/30 text-sidebar-text hover:bg-sidebar-hover hover:text-white focus-visible:outline-lime"
          : "border-line text-ink hover:bg-mint focus-visible:outline-teal"
      } ${theme === null ? "invisible" : ""} ${className ?? ""}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {label[language]}
    </button>
  );
}
