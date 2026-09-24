import { Home, MessageSquareText, Plus, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import { FIELD } from "@/lib/i18n/field-notes";

export type NavItem = {
  key: string;
  label: { es: string; en: string };
  icon: LucideIcon;
  href: string;
  /** Other path prefixes that should also mark this item as the current page. */
  alsoActiveOn?: string[];
};

/** The reference's five destinations, each wired to a real route. */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: FIELD.shell.nav.home, icon: Home, href: "/" },
  { key: "explore", label: FIELD.shell.nav.explore, icon: Search, href: "/activity", alsoActiveOn: ["/cases"] },
  { key: "submit", label: FIELD.shell.nav.submit, icon: Plus, href: "/report/new" },
  { key: "guide", label: FIELD.shell.nav.guide, icon: MessageSquareText, href: "/guide" },
  // The real, password-protected moderator workspace.
  { key: "moderation", label: FIELD.shell.nav.moderation, icon: ShieldCheck, href: "/admin" },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const path = item.href.split("?")[0];
  if (path === "/") return pathname === "/";
  if (pathname === path || pathname.startsWith(`${path}/`)) return true;
  return (item.alsoActiveOn ?? []).some((prefix) => pathname.startsWith(prefix));
}
