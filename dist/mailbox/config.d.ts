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
export declare function resolveMailboxConfig(input: MailboxInput): MailboxConfig;
/** Returns the configured option for `id`, falling back to the first one. */
export declare function fromOptionById(config: MailboxConfig, id: string | undefined): MailFromOption;
/** Every domain the mailbox considers its own. */
export declare function mailboxDomains(config: MailboxConfig): string[];
//# sourceMappingURL=config.d.ts.map