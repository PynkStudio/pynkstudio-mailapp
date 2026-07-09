export type LeadMatch = {
    id: string;
    business_name: string | null;
    contact_name: string | null;
    contact_email: string | null;
    business_vertical: string | null;
    status: string | null;
};
/** Cerca lead con contact_email corrispondente a uno degli indirizzi forniti. */
export declare function findLeadsByEmails(addresses: string[]): Promise<LeadMatch[]>;
/** Recupera i lead per id (per risolvere FK in nome leggibile). */
export declare function getLeadsByIds(ids: string[]): Promise<LeadMatch[]>;
/** Ricerca testuale lead per nome attività o email contatto (per il selettore manuale). */
export declare function searchLeads(query: string): Promise<LeadMatch[]>;
export declare function linkInboundEmailToLead(emailId: string, leadId: string | null): Promise<void>;
export declare function linkSentEmailToLead(emailId: string, leadId: string | null): Promise<void>;
//# sourceMappingURL=lead-link-queries.d.ts.map