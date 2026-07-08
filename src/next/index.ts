import type { MailAppAdapter, SendMailInput } from "../core/index.js";

export { POST as sendEmailPOST } from "./routes/send.js";
export { GET as signatureGET } from "./routes/signature.js";
export { POST as inboundWebhookPOST } from "./routes/inbound-webhook.js";

export type JsonResponseFactory = {
  json: (body: unknown, init?: { status?: number }) => Response;
};

export function createSendEmailRoute(adapter: MailAppAdapter, responseFactory: JsonResponseFactory) {
  return async function POST(request: Request): Promise<Response> {
    let body: SendMailInput;
    try {
      body = (await request.json()) as SendMailInput;
    } catch {
      return responseFactory.json({ error: "Body non valido." }, { status: 400 });
    }

    if (!body.to || !body.subject || !body.html) {
      return responseFactory.json({ error: "to, subject e html sono richiesti." }, { status: 400 });
    }

    const result = await adapter.sendMail(body);
    if (!result.ok) {
      return responseFactory.json({ error: result.error ?? "Invio email fallito." }, { status: 502 });
    }

    return responseFactory.json({ ok: true, messageId: result.messageId });
  };
}
