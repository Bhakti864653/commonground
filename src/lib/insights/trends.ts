import type { PublicCase } from "@/lib/schema/report";

export type Trend = {
  communityId: string;
  categoryId: string;
  areaId: string | undefined;
  count: number;
  caseNumbers: string[];
  windowDays: number;
};

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MIN_COUNT = 3;

/**
 * Purely a count of same category+area cases within a rolling window — an aggregate signal,
 * never anything that could read as a danger/urgency score for a neighborhood (3D_EXPERIENCE.md's
 * same constraint on the Pulse view applies here too, even though this isn't 3D).
 */
export function detectTrends(
  cases: PublicCase[],
  now: () => Date = () => new Date(),
  windowDays: number = DEFAULT_WINDOW_DAYS,
  minCount: number = DEFAULT_MIN_COUNT,
): Trend[] {
  const cutoff = now().getTime() - windowDays * 24 * 60 * 60 * 1000;
  const recent = cases.filter((c) => new Date(c.createdAt).getTime() >= cutoff);

  // Keyed by community too — see duplicate-clusters.ts for why this matters even when today's
  // only caller happens to already pre-filter to one community.
  const buckets = new Map<string, PublicCase[]>();
  for (const c of recent) {
    const key = `${c.communityId}:${c.categoryId}:${c.approximateArea.areaId ?? "none"}`;
    const list = buckets.get(key);
    if (list) list.push(c);
    else buckets.set(key, [c]);
  }

  const trends: Trend[] = [];
  for (const bucketCases of buckets.values()) {
    if (bucketCases.length < minCount) continue;
    trends.push({
      communityId: bucketCases[0].communityId,
      categoryId: bucketCases[0].categoryId,
      areaId: bucketCases[0].approximateArea.areaId,
      count: bucketCases.length,
      caseNumbers: bucketCases.map((c) => c.publicCaseNumber),
      windowDays,
    });
  }
  return trends.sort((a, b) => b.count - a.count);
}
