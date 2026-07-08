import type { EmailBrand } from "../sender";
import type { TenantSetupModule } from "../../core/stripe-setup-types";

export function buildStripeSetupEmail(params: {
  brand: EmailBrand;
  tenantName: string;
  setupUrl: string;
  modules?: TenantSetupModule[];
}): string {
  const { brand, tenantName, setupUrl } = params;
  const modules = params.modules?.length ? params.modules : ["stripe"];
  const moduleList = modules.map((module) => module === "stripe" ? "Stripe" : "HubRise").join(" e ");
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Configura ${moduleList} - ${brand.name}</title>
</head>
<body style="margin:0;padding:0;background:${brand.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${brand.text};">
  <span style="display:none;font-size:1px;color:${brand.bg};max-height:0;overflow:hidden;">
    Completa la configurazione ${moduleList} per il tuo tenant.
  </span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.bg};">
    <tr>
      <td align="center" style="padding:48px 16px 64px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.10);">
          <tr>
            <td style="background:${brand.primary};padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">${brand.name}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:38px 40px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:${brand.text};">
                Configura ${moduleList} per ${tenantName}
              </h1>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:${brand.muted};">
                Per completare l'attivazione servono alcune configurazioni esterne: ${moduleList}.
                Ogni collegamento avviene sul provider ufficiale: noi salviamo solo i riferimenti tecnici necessari.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:${brand.muted};">
                Il link scade tra 14 giorni. Se hai gia' un account Stripe puoi accedere con quello, altrimenti Stripe ti guidera' nella creazione.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:10px;background:${brand.primary};">
                    <a href="${setupUrl}" target="_blank" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;border-radius:10px;">
                Apri configurazione
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:${brand.muted};word-break:break-all;">
                Se il pulsante non funziona, copia questo link nel browser:<br>
                <a href="${setupUrl}" style="color:${brand.primary};">${setupUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 34px;">
              <div style="height:1px;background:#E5E7EB;margin-bottom:20px;"></div>
              <p style="margin:0;font-size:11px;line-height:1.7;color:${brand.muted};text-align:center;">
                &copy; ${year} ${brand.name} &middot;
                <a href="https://${brand.domain}" style="color:${brand.primary};text-decoration:none;">${brand.domain}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
