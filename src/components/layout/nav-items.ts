import { Home, MessageSquareText, Phone, Plus, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import { FIELD } from "@/lib/i18n/field-notes";
import { INFO } from "@/lib/i18n/community-info";
import type { LocalizedText } from "@/lib/i18n/languages";

export type NavItem = {
  key: string;
  label: LocalizedText;
  icon: LucideIcon;
  href: string;
  /** Other path prefixes that should also mark this item as the current page. */
  alsoActiveOn?: string[];
  /** Left out of the phone bottom bar, which only fits five; reachable from the footer there. */
  desktopOnly?: boolean;
};

/**
 * The reference's five destinations plus Contacts, each wired to a real route. Home is the
 * community dashboard at /home — "/" is the public introduction, outside the app shell.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: FIELD.shell.nav.home, icon: Home, href: "/home" },
  { key: "explore", label: FIELD.shell.nav.explore, icon: Search, href: "/activity", alsoActiveOn: ["/cases"] },
  { key: "submit", label: FIELD.shell.nav.submit, icon: Plus, href: "/report/new" },
  { key: "guide", label: FIELD.shell.nav.guide, icon: MessageSquareText, href: "/guide" },
  { key: "resources", label: INFO.resources.nav, icon: Phone, href: "/resources", desktopOnly: true },
  // The real, password-protected moderator workspace.
  { key: "moderation", label: FIELD.shell.nav.moderation, icon: ShieldCheck, href: "/admin" },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const path = item.href.split("?")[0];
  if (pathname === path || pathname.startsWith(`${path}/`)) return true;
  return (item.alsoActiveOn ?? []).some((prefix) => pathname.startsWith(prefix));
}
