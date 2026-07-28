import { parseEmailAddress } from "../core/index.js";
import { mailboxDomains, type MailboxConfig } from "./config.js";

/** Lowercased bare address, with any display name stripped. */
export function normalizeAddress(value: string): string {
  return parseEmailAddress(value).address.trim().toLowerCase();
}

export function localPart(address: string): string {
  return normalizeAddress(address).split("@")[0] ?? "";
}

/** True when the address belongs to one of the configured mailbox domains. */
export function isOwnMailbox(config: MailboxConfig, address: string): boolean {
  const normalized = normalizeAddress(address);
  return mailboxDomains(config).some((domain) => normalized.endsWith(`@${domain}`));
}

/**
 * Picks the brand for a message from its recipients: anything landing on the
 * automatic domain is automated traffic, everything else is ordinary mail.
 */
export function detectMailBrand(config: MailboxConfig, addresses: string[]): string {
  if (!config.automaticDomain) return config.ordinaryBrand;

  const automatic = `@${config.automaticDomain}`;
  const isAutomatic = addresses.map(normalizeAddress).some((address) => address.endsWith(automatic));
  return isAutomatic ? config.automaticBrand : config.ordinaryBrand;
}
