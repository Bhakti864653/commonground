import {
  Compass,
  FileText,
  Home,
  LayoutList,
  Lightbulb,
  MessageCircleQuestion,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

/**
 * `href: null` means the destination is real per the design system's target nav, but its
 * page is a later phase (Activity/Reports/Proposals/Guide/Settings all land in Phase 3+) —
 * rendered as a disabled "coming soon" item rather than a dead link, matching CommonGround's
 * own rule against implying functionality that isn't real yet.
 */
export type NavItem = {
  key: string;
  label: (typeof UI_STRINGS.nav)[keyof typeof UI_STRINGS.nav];
  icon: LucideIcon;
  href: string | null;
};

export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { key: "home", label: UI_STRINGS.nav.home, icon: Home, href: "/" },
  { key: "activity", label: UI_STRINGS.nav.activity, icon: LayoutList, href: null },
  { key: "reports", label: UI_STRINGS.nav.reports, icon: FileText, href: null },
  { key: "proposals", label: UI_STRINGS.nav.proposals, icon: Lightbulb, href: null },
  { key: "guide", label: UI_STRINGS.nav.guide, icon: MessageCircleQuestion, href: null },
  { key: "how-it-works", label: UI_STRINGS.nav.howItWorks, icon: Compass, href: "/how-it-works" },
  { key: "settings", label: UI_STRINGS.nav.settings, icon: Settings, href: null },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { key: "home", label: UI_STRINGS.nav.home, icon: Home, href: "/" },
  { key: "explore", label: UI_STRINGS.nav.explore, icon: Compass, href: null },
  { key: "create", label: UI_STRINGS.nav.create, icon: Plus, href: null },
  { key: "guide", label: UI_STRINGS.nav.guide, icon: MessageCircleQuestion, href: null },
  { key: "more", label: UI_STRINGS.nav.more, icon: Settings, href: null },
];
