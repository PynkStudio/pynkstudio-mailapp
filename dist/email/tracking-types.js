export const TRACKING_EVENT_LABELS = {
    "email.sent": "Inviata",
    "email.delivered": "Consegnata",
    "email.delivery_delayed": "Ritardo consegna",
    "email.bounced": "Rimbalzata",
    "email.complained": "Segnata come spam",
    "email.opened": "Aperta",
    "email.clicked": "Link cliccato",
};
export const TRACKING_EVENT_COLORS = {
    "email.sent": "text-blue-600 bg-blue-50",
    "email.delivered": "text-green-600 bg-green-50",
    "email.delivery_delayed": "text-yellow-600 bg-yellow-50",
    "email.bounced": "text-red-600 bg-red-50",
    "email.complained": "text-orange-600 bg-orange-50",
    "email.opened": "text-purple-600 bg-purple-50",
    "email.clicked": "text-indigo-600 bg-indigo-50",
};
/** Determina il brand dal from address dell'email di tracking. */
export function detectBrandFromSender(fromAddress) {
    const addr = fromAddress.toLowerCase();
    if (addr.includes("@pynkstudio.it") ||
        addr.includes("@pynkstudio.com") ||
        addr.includes("@pynkstudio.eu"))
        return "pynkstudio";
    if (addr.includes("@weuseorpheo.com"))
        return "orpheo";
    if (addr.includes("@bizery.it"))
        return "bizery";
    return "menuary";
}
/** Aggiorna lo status di sent_emails in base all'evento di tracking. */
export function trackingEventToStatus(eventType) {
    switch (eventType) {
        case "email.delivered": return "delivered";
        case "email.delivery_delayed": return "delivery_delayed";
        case "email.bounced": return "bounced";
        case "email.complained": return "complained";
        default: return null;
    }
}
export const ALL_TRACKING_EVENTS = [
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.complained",
    "email.opened",
    "email.clicked",
];
//# sourceMappingURL=tracking-types.js.map