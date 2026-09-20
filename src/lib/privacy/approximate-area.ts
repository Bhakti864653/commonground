import type { AreaConfig } from "@/lib/schema/community";
import type { ApproximateArea } from "@/lib/schema/report";
import type { Language } from "@/lib/i18n/dictionary";

/**
 * A resident picks one of the community's own named areas, or explicitly declines — never a
 * free-text address or exact coordinates (spec §11/§26). Pure so the "prefer not to say" and
 * bilingual-label paths are unit-testable without rendering anything.
 */
export function buildApproximateArea(
  area: AreaConfig | null,
  language: Language,
): ApproximateArea {
  if (!area) {
    return {
      kind: "prefer_not_to_say",
      label: "Prefer not to say",
      labelEs: "Prefiero no decirlo",
    };
  }
  return {
    kind: area.kind,
    areaId: area.id,
    label: language === "es" ? area.labelEs : area.label,
    labelEs: area.labelEs,
  };
}

export function formatApproximateAreaLabel(area: ApproximateArea, language: Language): string {
  if (language === "es" && area.labelEs) return area.labelEs;
  return area.label;
}
