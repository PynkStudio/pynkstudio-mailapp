export type SiteadminAssignee = {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    role: string;
};
/** Ritorna tutti gli utenti siteadmin attivi per il pannello di assegnazione email. */
export declare function getSiteadminForAssignment(): Promise<SiteadminAssignee[]>;
//# sourceMappingURL=assignment-queries.d.ts.map