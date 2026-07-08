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

export function parseEmailAddress(value: string): { name: string | null; address: string } {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) return { name: null, address: trimmed.toLowerCase() };
  const name = match[1]?.trim().replace(/^"|"$/g, "") || null;
  return { name, address: match[2].trim().toLowerCase() };
}

export function activeMailDomain(domains: string[]): string | null {
  return domains.find((domain) =>
    !domain.includes("localhost") &&
    !domain.endsWith(".local") &&
    domain !== "127.0.0.1"
  ) ?? null;
}
