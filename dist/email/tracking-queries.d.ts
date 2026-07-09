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
export declare function getTrackingEventsForEmail(resendEmailId: string): Promise<TrackingEvent[]>;
export type TrackingSummary = {
    openCount: number;
    clickCount: number;
    firstOpenedAt: string | null;
    lastClickedUrl: string | null;
};
export declare function getTrackingSummariesForEmails(resendEmailIds: string[]): Promise<Record<string, TrackingSummary>>;
//# sourceMappingURL=tracking-queries.d.ts.map