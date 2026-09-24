import type { AreaConfig } from "@/lib/schema/community";
import type { ApproximateArea } from "@/lib/schema/report";
import type { Language } from "@/lib/i18n/dictionary";
import { labelOf } from "@/lib/i18n/labels";

/**
 * A resident picks one of the community's own named areas, or explicitly declines — never a
 * free-text address or exact coordinates (spec §11/§26). The case keeps the area's name in every
 * language the community has it in (`label` is always English, `labelEs` Spanish), so it reads
 * correctly whatever language a visitor later views it in. Pure so the "prefer not to say" and
 * multilingual-label paths are unit-testable without rendering anything.
 */
export function buildApproximateArea(area: AreaConfig | null): ApproximateArea {
  if (!area) {
    return {
      kind: "prefer_not_to_say",
      label: "Prefer not to say",
      labelEs: "Prefiero no decirlo",
      labels: { pt: "Prefiro não dizer", fr: "Je préfère ne pas le dire", zh: "不愿透露" },
    };
  }
  return {
    kind: area.kind,
    areaId: area.id,
    label: area.label,
    labelEs: area.labelEs,
    ...(area.labels ? { labels: area.labels } : {}),
  };
}

export function formatApproximateAreaLabel(area: ApproximateArea, language: Language): string {
  return labelOf(area, language);
}
