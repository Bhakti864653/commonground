import { z } from "zod";
import { PrioritySchema } from "@/lib/pipeline/types";

/**
 * The office side: departments that receive referrals and act on them. Built, but switched off
 * (OFFICE_PORTAL_ENABLED). Offices only ever see their own referrals, through `OfficeReferralView`
 * — an explicit allow-list of public-safe fields, never moderator-only data.
 */

export const OFFICE_STATUSES = ["new", "received", "in_progress", "resolved", "not_our_department"] as const;
export const OfficeStatusSchema = z.enum(OFFICE_STATUSES);
export type OfficeStatus = z.infer<typeof OfficeStatusSchema>;

export const OFFICE_STATUS_LABELS: Record<OfficeStatus, string> = {
  new: "New",
  received: "Received",
  in_progress: "In progress",
  resolved: "Resolved",
  not_our_department: "Not our department",
};

/** The moves an office may make. Resolved and "not ours" are handed to moderators. */
export const NEXT_STATUSES: Record<OfficeStatus, OfficeStatus[]> = {
  new: ["received", "not_our_department"],
  received: ["in_progress", "not_our_department"],
  in_progress: ["resolved", "not_our_department"],
  resolved: [],
  not_our_department: [],
};

export const OfficeReferralSchema = z.object({
  id: z.string(),
  caseNumber: z.string(),
  communityId: z.string(),
  officeId: z.string(),
  status: OfficeStatusSchema,
  declineReason: z.string().optional(),
  /** Example data: only the demo office page can act on it; the real portal never shows it. */
  isDemo: z.boolean(),
  createdAt: z.string(),
  statusChangedAt: z.string(),
  outboxId: z.string().optional(),
});
export type OfficeReferral = z.infer<typeof OfficeReferralSchema>;

export const OfficeNoteSchema = z.object({
  id: z.string(),
  referralId: z.string(),
  caseNumber: z.string(),
  officeId: z.string(),
  /** public: shown on the case page after a moderator approves it; private: moderators only. */
  kind: z.enum(["public", "private"]),
  text: z.string().min(1).max(1000),
  author: z.string(),
  createdAt: z.string(),
});
export type OfficeNote = z.infer<typeof OfficeNoteSchema>;

export const OfficeAccountSchema = z.object({
  email: z.string(),
  officeId: z.string(),
  name: z.string(),
  invitedBy: z.string(),
  createdAt: z.string(),
  disabledAt: z.string().optional(),
});
export type OfficeAccount = z.infer<typeof OfficeAccountSchema>;

/** Everything an office is allowed to see about a referral. Nothing else is ever sent to it. */
export type OfficeReferralView = {
  id: string;
  caseNumber: string;
  category: string;
  categoryEs: string;
  zone: string;
  description: string;
  priority: z.infer<typeof PrioritySchema> | null;
  daysOpen: number;
  residentCount: number;
  publicUrl: string;
  status: OfficeStatus;
  declineReason: string | null;
  receivedAt: string;
  statusChangedAt: string;
  /** This office's own notes on this referral (never anyone else's). */
  notes: Array<{ kind: "public" | "private"; text: string; createdAt: string }>;
};

/** Who is acting in the office portal: a real office account, or a moderator playing an example office. */
export type OfficeActor = { officeId: string; actor: string; demo: boolean };
