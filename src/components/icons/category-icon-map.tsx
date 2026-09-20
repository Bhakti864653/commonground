import {
  Bus,
  Droplet,
  Lightbulb,
  MoreHorizontal,
  Route,
  Trash2,
  Trees,
  type LucideIcon,
} from "lucide-react";
import type { ReactElement, SVGProps } from "react";

/**
 * CategoryConfig.icon is a free-form string (per-community data, see src/data/communities/) —
 * this maps the known keys to a real icon and falls back to a neutral marker for anything a
 * future community config introduces, so an unrecognized key never crashes rendering.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  droplet: Droplet,
  trash: Trash2,
  road: Route,
  "more-horizontal": MoreHorizontal,
  lightbulb: Lightbulb,
  trees: Trees,
  bus: Bus,
};

export function getCategoryIcon(key: string): LucideIcon {
  return ICON_MAP[key] ?? MoreHorizontal;
}

/**
 * Use this (not `getCategoryIcon` + `<Icon />`) whenever the render happens directly in a
 * component's own body rather than inside a `.map()`/callback — this repo's
 * `react-hooks/static-components` lint rule flags a capitalized variable assigned from a
 * function call and then used as a JSX tag at that scope, even though the underlying lookup is
 * a stable static map, not something actually re-created each render. Returning an already-
 * built element sidesteps the rule entirely.
 */
export function renderCategoryIcon(key: string, props?: SVGProps<SVGSVGElement>): ReactElement {
  const Icon = getCategoryIcon(key);
  return <Icon aria-hidden="true" {...props} />;
}
