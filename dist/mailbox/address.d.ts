import { type MailboxConfig } from "./config.js";
/** Lowercased bare address, with any display name stripped. */
export declare function normalizeAddress(value: string): string;
export declare function localPart(address: string): string;
/** True when the address belongs to one of the configured mailbox domains. */
export declare function isOwnMailbox(config: MailboxConfig, address: string): boolean;
/**
 * Picks the brand for a message from its recipients: anything landing on the
 * automatic domain is automated traffic, everything else is ordinary mail.
 */
export declare function detectMailBrand(config: MailboxConfig, addresses: string[]): string;
//# sourceMappingURL=address.d.ts.map