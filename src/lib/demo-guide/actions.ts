"use server";

import { isAdminAuthenticated } from "@/lib/admin/auth";
import { DEMO_STEPS, TEST_COUNT, type DemoStep } from "./steps";

/**
 * The demo guide's steps — only for a signed-in moderator. Anyone else gets null, so the steps
 * never reach a visitor's browser (they live in a server-only module).
 */
export async function getDemoGuideAction(): Promise<DemoStep[] | null> {
  if (!(await isAdminAuthenticated())) return null;
  return DEMO_STEPS.map((s) => ({ ...s, click: s.click.map((line) => line.replace("TEST_COUNT", String(TEST_COUNT))) }));
}
