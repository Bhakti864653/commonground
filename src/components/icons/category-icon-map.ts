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
