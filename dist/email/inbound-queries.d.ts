import { type InboundEmail, type InboundEmailBrand } from "./inbound-types";
import type { TenantEmailScope } from "./tenant-email-scope";
export type InboxFilter = {
    brand?: InboundEmailBrand | "all" | "support";
    scope?: TenantEmailScope;
    onlyUnread?: boolean;
    onlyStarred?: boolean;
    archived?: boolean;
    spam?: boolean;
    page?: number;
    /** Se presente, mostra solo le email assegnate a questo siteadmin.id */
    assignedToUserId?: string;
    /** Filtro leggero "per dispositivo" lato tenant: local-part (prima della @) a cui limitare i risultati. */
    matchLocalParts?: string[];
};
export type InboxPage = {
    emails: InboundEmail[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function getInboundEmails(filter?: InboxFilter): Promise<InboxPage>;
export type InboxCounts = {
    unread_menuary: number;
    unread_bizery: number;
    unread_orpheo: number;
    unread_pynkstudio: number;
    unread_total: number;
};
export declare function getInboxUnreadCounts(): Promise<InboxCounts>;
export declare function getTenantInboxUnreadCount(scope: TenantEmailScope, matchLocalParts?: string[]): Promise<number>;
export declare function getInboundEmailById(id: string, scope?: TenantEmailScope): Promise<InboundEmail | null>;
export declare function hydrateInboundEmailContent(id: string, scope?: TenantEmailScope): Promise<InboundEmail | null>;
export declare function markEmailRead(id: string, read: boolean, scope?: TenantEmailScope): Promise<void>;
export declare function starEmail(id: string, starred: boolean, scope?: TenantEmailScope): Promise<void>;
export declare function archiveEmail(id: string, scope?: TenantEmailScope): Promise<void>;
/**
 * Segna/rimuove lo stato spam. Marcando spam il mittente entra nella blocklist
 * (globale se senza scope, per-tenant se con scope): le prossime email di quel
 * mittente arrivano già flaggate spam dal webhook inbound.
 */
export declare function markEmailSpam(id: string, spam: boolean, scope?: TenantEmailScope): Promise<void>;
export declare function deleteEmail(id: string, scope?: TenantEmailScope): Promise<void>;
/** Assegna (o rimuove l'assegnazione di) un'email a un utente siteadmin. */
export declare function assignEmail(id: string, siteadminId: string | null): Promise<void>;
/** Conta le email non lette assegnate a un utente specifico. */
export declare function getInboxUnreadCountForUser(siteadminId: string): Promise<number>;
//# sourceMappingURL=inbound-queries.d.ts.map