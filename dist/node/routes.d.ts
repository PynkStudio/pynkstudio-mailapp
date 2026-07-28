/**
 * Ready-made Node/Vercel handlers for the mailbox endpoints.
 *
 * Each factory takes the host context and returns a `(req, res)` function, so a
 * consumer's route file is a single re-export.
 */
import { type MailboxNodeContext } from "./context.js";
import { type MailboxNodeRequest, type MailboxNodeResponse } from "./http.js";
export type MailboxNodeHandler = (req: MailboxNodeRequest, res: MailboxNodeResponse) => Promise<void>;
/** `GET /api/email/inbox?view=&page=&q=` */
export declare function createInboxHandler(ctx: MailboxNodeContext): MailboxNodeHandler;
/** `POST /api/email/send` */
export declare function createSendHandler(ctx: MailboxNodeContext): MailboxNodeHandler;
/** `POST /api/email/message` with `{ id, action }` */
export declare function createMessageActionHandler(ctx: MailboxNodeContext): MailboxNodeHandler;
/** `GET /api/email/attachment?messageId=&attachmentId=` */
export declare function createAttachmentHandler(ctx: MailboxNodeContext): MailboxNodeHandler;
/** `POST /api/webhooks/email/inbound` — Resend inbound + delivery events. */
export declare function createInboundWebhookHandler(ctx: MailboxNodeContext): MailboxNodeHandler;
//# sourceMappingURL=routes.d.ts.map