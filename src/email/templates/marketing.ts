import type { EmailBrand } from "../sender";

export type MarketingEmailParams = {
  brand: EmailBrand;
  preheader?: string;
  title: string;
  /** HTML accettato (usare <strong>, <br>, <a> ecc.) */
  body: string;
  cta?: {
    label: string;
    url: string;
  };
  /** Blocchi extra dopo il CTA, es. elenchi feature, immagini, ecc. */
  extraSections?: string;
  /** Mostra footer unsubscribe con link — passare l'URL del centro preferenze. */
  unsubscribeUrl?: string;
};

export function buildMarketingEmail(p: MarketingEmailParams): string {
  const year = new Date().getFullYear();

  const ctaBlock = p.cta
    ? `<table role="presentation" width="100%">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${p.cta.url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="${p.brand.primary}"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:700;">${p.cta.label}</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-->
            <a href="${p.cta.url}"
               style="display:inline-block;background:${p.brand.primary};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 36px;"
               target="_blank">${p.cta.label}</a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>`
    : "";

  const unsubscribeBlock = p.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:11px;color:${p.brand.muted};">
        Non vuoi più ricevere queste email?
        <a href="${p.unsubscribeUrl}" style="color:${p.brand.muted};text-decoration:underline;">Cancella iscrizione</a>.
      </p>`
    : "";

  const preheaderSpan = p.preheader
    ? `<span style="display:none;font-size:1px;color:#ffffff;max-height:0;overflow:hidden;">${p.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${p.title}</title>
</head>
<body style="margin:0;padding:0;background-color:${p.brand.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheaderSpan}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${p.brand.bg};">
    <tr>
      <td align="center" style="padding:48px 16px 64px;">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 32px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${p.brand.primary};padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${p.brand.name}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 8px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${p.brand.text};letter-spacing:-0.3px;">${p.title}</h1>
              <div style="font-size:15px;line-height:1.7;color:${p.brand.muted};margin-bottom:32px;">${p.body}</div>
              ${ctaBlock}
              ${p.extraSections ?? ""}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:#F1F5F9;"></div></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${p.brand.muted};line-height:1.7;">
                &copy; ${year} ${p.brand.name} &middot;
                <a href="https://${p.brand.domain}" style="color:${p.brand.primary};text-decoration:none;">${p.brand.domain}</a>
              </p>
              ${unsubscribeBlock}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
