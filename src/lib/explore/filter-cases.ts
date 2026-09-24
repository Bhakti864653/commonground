import type { PublicCase, ReportStatus } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";

export type CaseFilters = {
  query: string;
  type: "all" | "report" | "proposal";
  status: ReportStatus | "all";
  categoryId: string;
  /** An area id, "all", or "none" for cases whose resident preferred not to give an area. */
  areaId: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Filters the public case list. The search matches the case number, description, and the
 * category and area names in both languages, ignoring case and accents — so "inundacion"
 * finds "Inundación" and "norte" finds cases in "Área norte" / "Northern area".
 */
export function filterCases(cases: PublicCase[], filters: CaseFilters, community: CommunityConfig): PublicCase[] {
  const terms = normalize(filters.query).split(/\s+/).filter(Boolean);

  return cases.filter((c) => {
    if (filters.type !== "all" && c.type !== filters.type) return false;
    if (filters.status !== "all" && c.status !== filters.status) return false;
    if (filters.categoryId !== "all" && c.categoryId !== filters.categoryId) return false;
    if (filters.areaId === "none" && c.approximateArea.areaId) return false;
    if (filters.areaId !== "all" && filters.areaId !== "none" && c.approximateArea.areaId !== filters.areaId) return false;
    if (terms.length === 0) return true;

    const category = community.categories.find((cat) => cat.id === c.categoryId);
    const area = community.areas.find((a) => a.id === c.approximateArea.areaId);
    const haystack = normalize(
      [
        c.publicCaseNumber,
        c.description,
        category?.label,
        category?.labelEs,
        area?.label,
        area?.labelEs,
        c.approximateArea.label,
        c.approximateArea.labelEs,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}
