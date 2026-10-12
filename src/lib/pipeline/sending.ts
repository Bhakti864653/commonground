/**
 * Sending is OFF, and there is no way to send anything.
 *
 * `SENDING_ENABLED` must be exactly the string "true" to even reach the delivery branch, and it
 * defaults to off. Even with it on, CommonGround has no delivery channel: there is no email,
 * WhatsApp, SMS or HTTP code anywhere in the app, so `deliverOutboxItem` refuses instead of
 * sending. Turning sending on for real would need an official agreement with the office, verified
 * contacts, and a reviewed delivery channel — none of which exist in this student demo.
 *
 * pipeline/__tests__/sending.test.ts proves that the whole approve-to-outbox path makes no
 * network call, with the flag off and on.
 */
export function isSendingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SENDING_ENABLED === "true";
}

export type DeliveryResult =
  | { delivered: false; mode: "dry_run" }
  | { delivered: false; mode: "refused"; reason: string };

export async function deliverOutboxItem(
  _item: { id: string },
  env: Record<string, string | undefined> = process.env,
): Promise<DeliveryResult> {
  if (!isSendingEnabled(env)) return { delivered: false, mode: "dry_run" };
  return {
    delivered: false,
    mode: "refused",
    reason: "SENDING_ENABLED is on, but CommonGround has no delivery channel. Nothing was sent.",
  };
}

/** The status every outbox item carries — the database only allows this one value. */
export const OUTBOX_DRY_RUN_STATUS = "dry_run" as const;
export const OUTBOX_STATUS_LABEL = "Ready to send – demo mode (not sent)";
