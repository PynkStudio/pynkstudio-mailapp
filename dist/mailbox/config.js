/**
 * Configuration for the mailbox runtime.
 *
 * The mailbox modules carry the behavior (threading, search, assignment, push,
 * Resend I/O); the host app supplies its own domains, mailbox identities and
 * table names. Nothing here is specific to a single project.
 */
const DEFAULT_TABLES = {
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
export function resolveMailboxConfig(input) {
    if (!input.ordinaryDomain)
        throw new Error("mailbox_ordinary_domain_required");
    if (!input.fromOptions?.length)
        throw new Error("mailbox_from_options_required");
    return {
        ordinaryDomain: input.ordinaryDomain,
        automaticDomain: input.automaticDomain ?? null,
        fromOptions: input.fromOptions,
        ordinaryBrand: input.ordinaryBrand ?? input.fromOptions[0].brand,
        automaticBrand: input.automaticBrand ?? `${input.ordinaryBrand ?? input.fromOptions[0].brand}_automatic`,
        tables: { ...DEFAULT_TABLES, ...(input.tables ?? {}) },
        refreshAliasesRpc: input.refreshAliasesRpc === undefined ? "refresh_admin_email_aliases" : input.refreshAliasesRpc,
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
export function fromOptionById(config, id) {
    return config.fromOptions.find((option) => option.id === id) ?? config.fromOptions[0];
}
/** Every domain the mailbox considers its own. */
export function mailboxDomains(config) {
    return [config.ordinaryDomain, ...(config.automaticDomain ? [config.automaticDomain] : [])];
}
//# sourceMappingURL=config.js.map