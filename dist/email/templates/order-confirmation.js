function euro(n) {
    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
    }).format(n);
}
function serviceLabel(p) {
    if (p.type === "tavolo")
        return p.tableLabel ? `In sala — ${p.tableLabel}` : "In sala";
    if (p.dineOption === "dine_in")
        return "Mangia qui";
    if (p.dineOption === "delivery")
        return "Delivery — consegna a domicilio";
    return "Asporto";
}
export function buildOrderConfirmationEmail(p) {
    const { brand, tenantName, orderCode, customerName, notes, lines, total, pickupTime } = p;
    const greeting = customerName ? `Ciao ${customerName},` : "Ciao,";
    const year = new Date().getFullYear();
    const linesHtml = lines
        .map((l) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;color:${brand.text};font-size:14px;">
          <strong>${l.qty} × ${escapeHtml(l.name)}</strong>${l.variantLabel ? ` <span style="color:${brand.muted};">(${escapeHtml(l.variantLabel)})</span>` : ""}
          ${l.note ? `<div style="color:${brand.muted};font-size:12px;font-style:italic;margin-top:2px;">${escapeHtml(l.note)}</div>` : ""}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:${brand.text};font-size:14px;font-weight:600;">
          ${euro(l.lineTotal)}
        </td>
      </tr>`)
        .join("");
    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ordine confermato · ${escapeHtml(tenantName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${brand.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:${brand.bg};max-height:0;overflow:hidden;">
    Il tuo ordine ${orderCode} è stato confermato.&nbsp;&zwnj;&nbsp;&zwnj;
  </span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${brand.bg};">
    <tr><td align="center" style="padding:48px 16px 64px;">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 32px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${brand.primary};padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${escapeHtml(tenantName)}</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Ordine confermato</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0 0 12px;font-size:16px;color:${brand.text};">${greeting}</p>
            <p style="margin:0 0 20px;font-size:14px;color:${brand.text};line-height:1.5;">
              il locale ha confermato il tuo ordine. Qui sotto trovi il riepilogo.
            </p>
            <div style="background:${brand.bg};border-radius:12px;padding:16px 18px;margin-bottom:20px;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:${brand.muted};">Codice ordine</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:${brand.primary};">${escapeHtml(orderCode)}</p>
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
              <tr>
                <td style="padding:4px 0;font-size:13px;color:${brand.muted};width:120px;">Servizio</td>
                <td style="padding:4px 0;font-size:14px;color:${brand.text};font-weight:600;">${escapeHtml(serviceLabel(p))}</td>
              </tr>
              ${pickupTime ? `<tr>
                <td style="padding:4px 0;font-size:13px;color:${brand.muted};">Ritiro</td>
                <td style="padding:4px 0;font-size:14px;color:${brand.text};font-weight:600;">${escapeHtml(pickupTime)}</td>
              </tr>` : ""}
              ${notes ? `<tr>
                <td style="padding:4px 0;font-size:13px;color:${brand.muted};vertical-align:top;">Note</td>
                <td style="padding:4px 0;font-size:13px;color:${brand.text};font-style:italic;">${escapeHtml(notes)}</td>
              </tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 40px 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${linesHtml}
              <tr>
                <td style="padding:14px 0 0;font-size:14px;color:${brand.muted};text-transform:uppercase;letter-spacing:0.5px;">Totale</td>
                <td style="padding:14px 0 0;text-align:right;font-size:20px;font-weight:800;color:${brand.primary};">${euro(total)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:${brand.muted};line-height:1.5;">
              Il pagamento avviene al ritiro o al tavolo, salvo diverse indicazioni del locale.<br>
              Ti aspettiamo!
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:${brand.muted};">© ${year} ${escapeHtml(brand.name)}</p>
    </td></tr>
  </table>
</body>
</html>`;
}
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
//# sourceMappingURL=order-confirmation.js.map