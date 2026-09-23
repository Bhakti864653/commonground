import { Compass, Home, MessageCircleQuestion, Plus, Waypoints, type LucideIcon } from "lucide-react";
import { EXPERIENCE } from "@/lib/i18n/experience";

export type NavItem = {
  key: string;
  label: { es: string; en: string };
  icon: LucideIcon;
  href: string;
  /** Other paths that should also mark this item as the current page. */
  alsoActiveOn?: string[];
};

/**
 * Only destinations that really exist — no disabled "coming soon" items in the primary nav.
 * Report/propose live behind the header's primary action and the mobile "Create" button.
 */
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { key: "home", label: EXPERIENCE.nav.home, icon: Home, href: "/" },
  { key: "activity", label: EXPERIENCE.nav.activity, icon: Compass, href: "/activity", alsoActiveOn: ["/cases"] },
  { key: "guide", label: EXPERIENCE.nav.guide, icon: MessageCircleQuestion, href: "/guide" },
  { key: "agents", label: EXPERIENCE.nav.howGuideWorks, icon: Waypoints, href: "/guide/how-it-works" },
  { key: "how-it-works", label: EXPERIENCE.nav.howItWorks, icon: Compass, href: "/how-it-works" },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { key: "home", label: EXPERIENCE.nav.home, icon: Home, href: "/" },
  { key: "activity", label: EXPERIENCE.nav.activity, icon: Compass, href: "/activity", alsoActiveOn: ["/cases"] },
  { key: "create", label: EXPERIENCE.nav.create, icon: Plus, href: "/report/new" },
  { key: "guide", label: EXPERIENCE.nav.guide, icon: MessageCircleQuestion, href: "/guide" },
  { key: "agents", label: EXPERIENCE.nav.agents, icon: Waypoints, href: "/guide/how-it-works" },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const path = item.href.split("?")[0];
  if (pathname === path) return true;
  return (item.alsoActiveOn ?? []).some((prefix) => pathname.startsWith(prefix));
}
