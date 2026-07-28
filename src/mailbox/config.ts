/**
 * Configuration for the mailbox runtime.
 *
 * The mailbox modules carry the behavior (threading, search, assignment, push,
 * Resend I/O); the host app supplies its own domains, mailbox identities and
 * table names. Nothing here is specific to a single project.
 */

/** A selectable sender identity in the compose form. */
export type MailFromOption = {
  id: string;
  label: string;
  /** Full RFC 5322 sender, e.g. `BITE <hello@example.com>`. */
  from: string;
  brand: string;
};

export type MailboxTables = {
  inbound: string;
  sent: string;
  trackingEvents: string;
  spamSenders: string;
  profiles: string;
  userRoles: string;
  adminAliases: string;
  pushSubscriptions: string;
  notificationPreferences: string;
};

export type MailboxInput = {
  /** Domain used for ordinary/human mailboxes. */
  ordinaryDomain: string;
  /** Domain used for automated/transactional traffic, when separate. */
  automaticDomain?: string;
  fromOptions: readonly MailFromOption[];
  /** Brand recorded for mail on `ordinaryDomain`. Defaults to the first option's brand. */
  ordinaryBrand?: string;
  /** Brand recorded for mail on `automaticDomain`. */
  automaticBrand?: string;
  tables?: Partial<MailboxTables>;
  /** RPC that rebuilds the admin alias table before assignment. */
  refreshAliasesRpc?: string | null;
  /** RPC used to check a role, called as `rpc(name, { _user_id, _role })`. */
  roleCheckRpc?: string;
  adminRole?: string;
  /** Locale used to build date search tokens. */
  searchLocale?: string;
  /** Subject shown when an inbound message carries none. */
  noSubjectLabel?: string;
  /** Builds the deep link used by mail push notifications. */
  messageUrl?: (messageId: string | null) => string;
  pageSize?: number;
  /** Rows scanned when a search query is present. */
  searchResultLimit?: number;
  /** Total raw attachment bytes accepted by an outbound send. */
  maxAttachmentBytes?: number;
};

export type MailboxConfig = {
  ordinaryDomain: string;
  automaticDomain: string | null;
  fromOptions: readonly MailFromOption[];
  ordinaryBrand: string;
  automaticBrand: string;
  tables: MailboxTables;
  refreshAliasesRpc: string | null;
  roleCheckRpc: string;
  adminRole: string;
  searchLocale: string;
  noSubjectLabel: string;
  messageUrl: (messageId: string | null) => string;
  pageSize: number;
  searchResultLimit: number;
  maxAttachmentBytes: number;
};

const DEFAULT_TABLES: MailboxTables = {
  inbound: "inbound_emails",
  sent: "sent_emails",
  trackingEvents: "email_tracking_events",
  spamSenders: "email_spam_senders",
  profiles: "profiles",
  userRoles: "user_roles",
  adminAliases: "admin_email_aliases",
  pushSubscriptions: "push_subscriptions",
  notificationPreferences: "email_notification_preferences",
};

export function resolveMailboxConfig(input: MailboxInput): MailboxConfig {
  if (!input.ordinaryDomain) throw new Error("mailbox_ordinary_domain_required");
  if (!input.fromOptions?.length) throw new Error("mailbox_from_options_required");

  return {
    ordinaryDomain: input.ordinaryDomain,
    automaticDomain: input.automaticDomain ?? null,
    fromOptions: input.fromOptions,
    ordinaryBrand: input.ordinaryBrand ?? input.fromOptions[0].brand,
    automaticBrand: input.automaticBrand ?? `${input.ordinaryBrand ?? input.fromOptions[0].brand}_automatic`,
    tables: { ...DEFAULT_TABLES, ...(input.tables ?? {}) },
    refreshAliasesRpc:
      input.refreshAliasesRpc === undefined ? "refresh_admin_email_aliases" : input.refreshAliasesRpc,
    roleCheckRpc: input.roleCheckRpc ?? "has_role",
    adminRole: input.adminRole ?? "admin",
    searchLocale: input.searchLocale ?? "it-IT",
    noSubjectLabel: input.noSubjectLabel ?? "(nessun oggetto)",
    messageUrl: input.messageUrl ?? ((id) => (id ? `/admin/mail?message=${encodeURIComponent(id)}` : "/admin/mail")),
    pageSize: input.pageSize ?? 40,
    searchResultLimit: input.searchResultLimit ?? 500,
    maxAttachmentBytes: input.maxAttachmentBytes ?? 3 * 1024 * 1024,
  };
}

/** Returns the configured option for `id`, falling back to the first one. */
export function fromOptionById(config: MailboxConfig, id: string | undefined): MailFromOption {
  return config.fromOptions.find((option) => option.id === id) ?? config.fromOptions[0];
}

/** Every domain the mailbox considers its own. */
export function mailboxDomains(config: MailboxConfig): string[] {
  return [config.ordinaryDomain, ...(config.automaticDomain ? [config.automaticDomain] : [])];
}
