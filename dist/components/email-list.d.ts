import type { InboundEmail } from "../email/inbound-types";
import type { TrackingSummary } from "../email/tracking-queries";
type Props = {
    emails: InboundEmail[];
    selectedId: string | null;
    onSelect: (email: InboundEmail) => void;
    trackingMap?: Record<string, TrackingSummary>;
    sentStatusMap?: Record<string, string | null | undefined>;
    threadCountMap?: Record<string, number>;
    threadUnreadMap?: Record<string, number>;
    threadAttachmentMap?: Record<string, number>;
};
export declare function EmailList({ emails, selectedId, onSelect, trackingMap, sentStatusMap, threadCountMap, threadUnreadMap, threadAttachmentMap }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=email-list.d.ts.map