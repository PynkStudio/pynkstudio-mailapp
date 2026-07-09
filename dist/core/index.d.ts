export type MailBrand = string;
export type MailTenant = {
    id: string;
    name: string;
    domains: string[];
    vertical?: string;
};
export type MailUser = {
    id: string;
    email?: string | null;
};
export type MailSender = {
    from: string;
    replyTo?: string;
    brand?: MailBrand;
};
export type MailAttachment = {
    filename: string;
    content: string;
    contentType?: string;
};
export type SendMailInput = {
    to: string | string[];
    subject: string;
    html: string;
    tenantId?: string;
    replyTo?: string;
    fromOverride?: string;
    attachments?: MailAttachment[];
};
export type SendMailResult = {
    ok: boolean;
    messageId?: string;
    error?: string;
};
export type MailAppAdapter = {
    resolveTenant: (tenantId: string) => Promise<MailTenant | null> | MailTenant | null;
    resolveSender: (tenantId?: string) => Promise<MailSender> | MailSender;
    sendMail: (input: SendMailInput) => Promise<SendMailResult>;
};
export declare function parseEmailAddress(value: string): {
    name: string | null;
    address: string;
};
export declare function activeMailDomain(domains: string[]): string | null;
//# sourceMappingURL=index.d.ts.map