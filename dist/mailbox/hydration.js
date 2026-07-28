/**
 * Fills in what the list query cannot return on its own: assignee profiles,
 * bodies for legacy rows stored before the webhook fetched them, and the full
 * conversation behind each thread key.
 */
import { normalizeHeaders } from "./message-id.js";
import { retrieveReceivedEmailContent } from "./resend-client.js";
/** Attaches the assignee profile to each inbound row that names one. */
export async function hydrateInboundAssignments(db, config, messages) {
    const profileIds = Array.from(new Set(messages
        .map((message) => message.assigned_to_profile_id)
        .filter((value) => Boolean(value))));
    if (profileIds.length === 0)
        return messages;
    const { data, error } = await db.from(config.tables.profiles).select("id,name,email").in("id", profileIds);
    if (error)
        throw error;
    const profilesById = new Map((data ?? []).map((profile) => [profile.id, profile]));
    return messages.map((message) => ({
        ...message,
        assigned_profile: message.assigned_to_profile_id
            ? profilesById.get(message.assigned_to_profile_id) ?? null
            : null,
    }));
}
/**
 * Backfills bodies for rows saved before the webhook started retrieving content
 * from Resend. Only touches rows that have no body but do carry a Resend id, and
 * persists what it finds so the fetch happens once.
 */
export async function hydrateMissingInboundBodies(db, config, messages, apiKey) {
    return Promise.all(messages.map(async (message) => {
        if (message.text_body || message.html_body || !message.resend_email_id)
            return message;
        const content = await retrieveReceivedEmailContent(apiKey, message.resend_email_id, {
            logPrefix: "[mailbox/inbox]",
        }).catch((error) => {
            console.error("[mailbox/inbox] received email fetch failed", error);
            return null;
        });
        if (!content?.text && !content?.html)
            return message;
        const patch = {
            text_body: typeof content.text === "string" ? content.text : null,
            html_body: typeof content.html === "string" ? content.html : null,
            ...(typeof content.message_id === "string" && !message.message_id
                ? { message_id: content.message_id }
                : {}),
            ...(content.headers ? { headers: normalizeHeaders(content.headers) } : {}),
            ...(Array.isArray(content.attachments) ? { attachments: content.attachments } : {}),
        };
        const { error } = await db.from(config.tables.inbound).update(patch).eq("id", message.id);
        if (error) {
            console.error("[mailbox/inbox] received email update failed", error);
            return message;
        }
        return { ...message, ...patch };
    }));
}
/**
 * Attaches the full conversation to each message, merging inbound and sent rows
 * that share a thread key into one chronological list.
 */
export async function attachThreadMessages(db, config, messages) {
    const threadKeys = Array.from(new Set(messages.map((message) => message.thread_key).filter((value) => Boolean(value))));
    if (threadKeys.length === 0) {
        return messages.map((message) => ({
            ...message,
            source: message.source ?? "inbound",
            thread_messages: [message],
        }));
    }
    const [{ data: inboundRows, error: inboundError }, { data: sentRows, error: sentError }] = await Promise.all([
        db.from(config.tables.inbound).select("*").in("thread_key", threadKeys).order("created_at", { ascending: true }),
        db.from(config.tables.sent).select("*").in("thread_key", threadKeys).order("created_at", { ascending: true }),
    ]);
    if (inboundError)
        throw inboundError;
    if (sentError)
        throw sentError;
    const hydratedInbound = await hydrateInboundAssignments(db, config, (inboundRows ?? []));
    const threadMessages = [
        ...hydratedInbound.map((message) => ({ ...message, source: "inbound" })),
        ...(sentRows ?? []).map((message) => ({ ...message, source: "sent" })),
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const byThreadKey = new Map();
    for (const message of threadMessages) {
        const key = message.thread_key;
        if (!key)
            continue;
        const current = byThreadKey.get(key) ?? [];
        current.push(message);
        byThreadKey.set(key, current);
    }
    return messages.map((message) => ({
        ...message,
        source: message.source ?? "inbound",
        thread_messages: message.thread_key ? byThreadKey.get(message.thread_key) ?? [message] : [message],
    }));
}
//# sourceMappingURL=hydration.js.map