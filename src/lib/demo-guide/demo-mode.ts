import "server-only";
import { cookies } from "next/headers";

/** Same name as DEMO_GUIDE_COOKIE in store.ts (a client module, so not imported here). */
const COOKIE = "cg_demo_guide_v2";

/**
 * True while this moderator has the demo guide on (store.ts sets the cookie). The moderator
 * screens then show example cases only, so a demo or recording never shows a resident's report.
 */
export async function isDemoGuideOn(): Promise<boolean> {
  return (await cookies()).get(COOKIE)?.value === "1";
}

/** While the guide is on, keeps only example cases (by each case's own flag); otherwise the list as it is. */
export function onlyExamples<T>(items: T[], isExample: (item: T) => boolean, on: boolean): T[] {
  return on ? items.filter(isExample) : items;
}
