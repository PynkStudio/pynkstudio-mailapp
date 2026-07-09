export { POST as sendEmailPOST } from "./routes/send.js";
export { GET as signatureGET } from "./routes/signature.js";
export { POST as inboundWebhookPOST } from "./routes/inbound-webhook.js";
export function createSendEmailRoute(adapter, responseFactory) {
    return async function POST(request) {
        let body;
        try {
            body = (await request.json());
        }
        catch {
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
//# sourceMappingURL=index.js.map