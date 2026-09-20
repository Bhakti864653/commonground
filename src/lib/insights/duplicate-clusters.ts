import type { PublicCase } from "@/lib/schema/report";

/**
 * Rule-based, no LLM call — per the spec's own instruction for this first version. Tokenizes
 * to a bag of words (stripped of accents, short/trivial tokens dropped) and scores by
 * intersection-over-union. Crude on purpose: explainable and cheap, matching this whole
 * project family's established preference for rule-based over black-box where it's honestly
 * sufficient (see uni-app-tracker's/Concord's own DEVLOGs).
 */
function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return new Set(normalized.split(/[^a-z0-9]+/).filter((word) => word.length > 2));
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type DuplicateCluster = {
  caseNumbers: string[];
  communityId: string;
  categoryId: string;
  areaId: string | undefined;
  /** The lowest pairwise score inside the cluster — a conservative confidence, not an average. */
  score: number;
};

const DEFAULT_THRESHOLD = 0.3;

/**
 * Only ever reads cases and returns clusters — never mutates anything. A moderator decides
 * what, if anything, to do with a cluster (see the admin UI's "Mark as duplicate" action,
 * which calls the exact same `markDuplicate` function the manual form does).
 */
export function findDuplicateClusters(
  cases: PublicCase[],
  threshold = DEFAULT_THRESHOLD,
): DuplicateCluster[] {
  const eligible = cases.filter((c) => !c.isDuplicateOf);

  // Keyed by community too, not just category+area — two communities can otherwise share a
  // category id (both Santiago and Riverbend have an "other" category) or, in principle, an
  // area id, and clustering across communities would be a real bug, not a cosmetic one.
  const buckets = new Map<string, PublicCase[]>();
  for (const c of eligible) {
    const key = `${c.communityId}:${c.categoryId}:${c.approximateArea.areaId ?? "none"}`;
    const list = buckets.get(key);
    if (list) list.push(c);
    else buckets.set(key, [c]);
  }

  const clusters: DuplicateCluster[] = [];

  for (const bucketCases of buckets.values()) {
    if (bucketCases.length < 2) continue;

    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let root = parent.get(x) ?? x;
      while (parent.get(root) && parent.get(root) !== root) root = parent.get(root)!;
      parent.set(x, root);
      return root;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    const pairScores = new Map<string, number>();
    for (const c of bucketCases) find(c.publicCaseNumber);

    for (let i = 0; i < bucketCases.length; i++) {
      for (let j = i + 1; j < bucketCases.length; j++) {
        const score = jaccardSimilarity(bucketCases[i].description, bucketCases[j].description);
        if (score >= threshold) {
          union(bucketCases[i].publicCaseNumber, bucketCases[j].publicCaseNumber);
          pairScores.set(
            `${bucketCases[i].publicCaseNumber}|${bucketCases[j].publicCaseNumber}`,
            score,
          );
        }
      }
    }

    const groups = new Map<string, string[]>();
    for (const c of bucketCases) {
      const root = find(c.publicCaseNumber);
      const list = groups.get(root);
      if (list) list.push(c.publicCaseNumber);
      else groups.set(root, [c.publicCaseNumber]);
    }

    for (const caseNumbers of groups.values()) {
      if (caseNumbers.length < 2) continue;
      let minScore = 1;
      for (const [pairKey, score] of pairScores) {
        const [a, b] = pairKey.split("|");
        if (caseNumbers.includes(a) && caseNumbers.includes(b)) {
          minScore = Math.min(minScore, score);
        }
      }
      const first = bucketCases.find((c) => c.publicCaseNumber === caseNumbers[0])!;
      clusters.push({
        caseNumbers,
        communityId: first.communityId,
        categoryId: first.categoryId,
        areaId: first.approximateArea.areaId,
        score: minScore,
      });
    }
  }

  return clusters;
}
