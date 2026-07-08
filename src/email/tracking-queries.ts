"use server";

import { createSupabaseAdminClient } from "../server/runtime";

export type TrackingEvent = {
  id: string;
  created_at: string;
  resend_email_id: string;
  event_type: string;
  from_address: string | null;
  to_address: string | null;
  subject: string | null;
  brand: "menuary" | "bizery" | "orpheo" | "pynkstudio" | null;
  metadata: Record<string, unknown>;
};

/** Tutti gli eventi per un singolo resend_email_id (usato nel dettaglio email inviata). */
export async function getTrackingEventsForEmail(resendEmailId: string): Promise<TrackingEvent[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_tracking_events")
    .select("*")
    .eq("resend_email_id", resendEmailId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TrackingEvent[];
}

export type TrackingSummary = {
  openCount: number;
  clickCount: number;
  firstOpenedAt: string | null;
  lastClickedUrl: string | null;
};

export async function getTrackingSummariesForEmails(
  resendEmailIds: string[],
): Promise<Record<string, TrackingSummary>> {
  if (resendEmailIds.length === 0) return {};
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_tracking_events")
    .select("resend_email_id, event_type, created_at, metadata")
    .in("resend_email_id", resendEmailIds)
    .in("event_type", ["email.opened", "email.clicked"])
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const map: Record<string, TrackingSummary> = {};
  for (const row of (data ?? []) as unknown as TrackingEvent[]) {
    const id = row.resend_email_id;
    if (!map[id]) map[id] = { openCount: 0, clickCount: 0, firstOpenedAt: null, lastClickedUrl: null };
    const s = map[id];
    if (row.event_type === "email.opened") {
      s.openCount++;
      if (!s.firstOpenedAt) s.firstOpenedAt = row.created_at;
    } else if (row.event_type === "email.clicked") {
      s.clickCount++;
      const meta = row.metadata as Record<string, unknown>;
      const click = meta.click as Record<string, unknown> | undefined;
      if (click?.link) s.lastClickedUrl = String(click.link);
    }
  }
  return map;
}
