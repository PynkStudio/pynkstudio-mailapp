import { createHash, randomUUID } from "node:crypto";
import { normalizeAddress } from "./address.js";
import { cleanMessageId, normalizeSubjectForThread } from "./message-id.js";
/**
 * Deterministic thread key for messages that carry no usable threading headers
 * (legacy rows, senders that strip References). Keyed on normalized subject plus
 * the sorted participant set.
 */
export function fallbackThreadKey(input) {
    const subject = normalizeSubjectForThread(input.subject) || (input.noSubjectLabel ?? "(nessun oggetto)");
    const participants = Array.from(new Set(input.addresses.map((address) => normalizeAddress(address)).filter(Boolean))).sort();
    return `fallback:${createHash("sha256").update(`${subject}|${participants.join("|")}`).digest("hex")}`;
}
export function generateOutboundMessageId(domain) {
    return `${Date.now()}.${randomUUID()}@${domain}`;
}
/**
 * Finds the thread an outbound/inbound message belongs to by looking up any of
 * its related message ids, falling back to `fallbackKey` when none is known.
 */
export async function resolveConversationThreadKey(db, config, relatedMessageIds, fallbackKey) {
    const ids = Array.from(new Set(relatedMessageIds.map(cleanMessageId).filter(Boolean)));
    if (ids.length === 0)
        return fallbackKey;
    const filters = ids.map((id) => `message_id.eq.${id}`).join(",");
    for (const table of [config.tables.inbound, config.tables.sent]) {
        const { data, error } = await db
            .from(table)
            .select("thread_key")
            .or(filters)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error)
            throw error;
        if (data?.thread_key)
            return data.thread_key;
    }
    return fallbackKey;
}
export function threadParticipants(message) {
    return [
        message.from_address,
        ...(message.to_addresses ?? []),
        ...(message.cc_addresses ?? []),
        ...(message.bcc_addresses ?? []),
    ].filter((value) => Boolean(value));
}
//# sourceMappingURL=threading.js.map