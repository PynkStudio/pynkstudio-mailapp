/**
 * Isomorphic mailbox entrypoint — safe to import from the browser.
 *
 * Server-only modules (anything touching `node:crypto`, Resend or the database)
 * live behind `@pynkstudio/mailapp/mailbox/server`.
 */
export * from "./config.js";
export * from "./address.js";
export * from "./display.js";
export * from "./search.js";
export * from "./message-id.js";
//# sourceMappingURL=index.d.ts.map