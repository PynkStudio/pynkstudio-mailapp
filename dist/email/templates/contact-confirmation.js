const PHONE_DISPLAY = "+39 351 376 8607";
const WHATSAPP_NUMBER = "393513768607";
export function buildContactConfirmationEmail(p) {
    const { brand, firstName, businessName } = p;
    const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
    const year = new Date().getFullYear();
    const waText = encodeURIComponent(`Ciao ${brand.name}, vi ho scritto dal sito. Sono ${firstName || businessName}.`);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Richiesta ricevuta · ${brand.name}</title>
</head>
<body style="margin:0;padding:0;background-color:${brand.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Preheader -->
  <span style="display:none;font-size:1px;color:${brand.bg};max-height:0;overflow:hidden;">
    Abbiamo ricevuto la tua richiesta — ti ricontattiamo entro 24 ore.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </span>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${brand.bg};">
    <tr>
      <td align="center" style="padding:48px 16px 64px;">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 32px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${brand.primary};padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${brand.name}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 0;">
              <h1 style="margin:0 0 6px;font-size:21px;font-weight:700;color:${brand.text};letter-spacing:-0.3px;">
                Richiesta ricevuta.
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${brand.muted};">
                ${greeting}<br>
                grazie per aver contattato <strong>${brand.name}</strong>.
                Abbiamo preso in carico la richiesta per <strong>${businessName}</strong>
                e ti ricontattiamo <strong>entro 24 ore</strong> direttamente via telefono o WhatsApp.
              </p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:${brand.muted};">
                Se hai qualcosa da aggiungere, rispondi pure a questa email o scrivici su WhatsApp.
              </p>
            </td>
          </tr>

          <!-- Contact block -->
          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" width="100%" style="background:${brand.bg};border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${brand.muted};">
                      Ti contattiamo da
                    </p>
                    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:${brand.text};letter-spacing:-0.3px;">
                      ${PHONE_DISPLAY}
                    </p>

                    <!-- WhatsApp button -->
                    <table role="presentation">
                      <tr>
                        <td style="border-radius:8px;background:#25D366;">
                          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${waUrl}" style="height:40px;v-text-anchor:middle;width:200px;" arcsize="20%" fillcolor="#25D366"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:700;">Scrivici su WhatsApp</center></v:roundrect><![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${waUrl}"
                             target="_blank"
                             style="display:inline-block;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;">
                            &#128172; Scrivici su WhatsApp
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:#F1F5F9;"></div></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${brand.muted};line-height:1.7;">
                Questo messaggio è stato inviato automaticamente da <strong>${brand.name}</strong>
                in risposta alla tua richiesta di contatto.<br>
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
//# sourceMappingURL=contact-confirmation.js.map