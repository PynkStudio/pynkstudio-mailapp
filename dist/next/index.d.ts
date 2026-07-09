import type { MailAppAdapter } from "../core/index.js";
export { POST as sendEmailPOST } from "./routes/send.js";
export { GET as signatureGET } from "./routes/signature.js";
export { POST as inboundWebhookPOST } from "./routes/inbound-webhook.js";
export type JsonResponseFactory = {
    json: (body: unknown, init?: {
        status?: number;
    }) => Response;
};
export declare function createSendEmailRoute(adapter: MailAppAdapter, responseFactory: JsonResponseFactory): (request: Request) => Promise<Response>;
//# sourceMappingURL=index.d.ts.map