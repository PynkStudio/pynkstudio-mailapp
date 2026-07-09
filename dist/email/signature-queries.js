const ROLE_LABEL_IT = {
    superadmin: "Amministratore di sistema",
    admin: "Amministratore",
    amministrazione: "Amministrazione",
    venditore: "Consulente commerciale",
    lead_inserter: "Sviluppo commerciale",
};
const BRAND_TEMPLATE = {
    menuary: {
        label: "Menuary",
        tagline: "La piattaforma dei ristoranti italiani",
        email: "hello@menuary.it",
        website: "menuary.it",
        accent: "#A95F45",
        accentInk: "#743D2F",
        paper: "#FFFAF2",
        rule: "#E6DFD2",
        subtle: "#9aa39e",
    },
    bizery: {
        label: "Bizery",
        tagline: "La piattaforma delle attività di servizio",
        email: "hello@bizery.it",
        website: "bizery.it",
        accent: "#3B6CB5",
        accentInk: "#234A85",
        paper: "#F5F7FB",
        rule: "#DFE5F0",
        subtle: "#8993a4",
    },
    orpheo: {
        label: "Orpheo",
        tagline: "La piattaforma per artisti e professionisti creativi",
        email: "hello@weuseorpheo.com",
        website: "weuseorpheo.com",
        accent: "#7C3AED",
        accentInk: "#4C1D95",
        paper: "#FBFAF7",
        rule: "#E7E0F0",
        subtle: "#9590a8",
    },
    pynkstudio: {
        label: "PynkStudio",
        tagline: "Gruppo creativo e tecnologico",
        email: "hello@pynkstudio.it",
        website: "pynkstudio.it",
        accent: "#D946A8",
        accentInk: "#9B2D7A",
        paper: "#FDF5FA",
        rule: "#F0DDE9",
        subtle: "#a8909e",
    },
};
export function buildAutoSignature(profile, brand) {
    const t = BRAND_TEMPLATE[brand];
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
        profile.display_name?.trim() ||
        "";
    const roleLabel = profile.signature_role?.trim() ||
        (profile.role && ROLE_LABEL_IT[profile.role]) ||
        (profile.role ?? "");
    const companyEmail = companyEmailForBrand(profile, t.website) ?? t.email;
    // Riga 1: telefono (se c'è) - mail personale aziendale
    const contactParts = [];
    if (profile.phone) {
        contactParts.push(`<a href="tel:${escape(profile.phone)}" style="color:${t.accentInk};text-decoration:none">${escape(profile.phone)}</a>`);
    }
    contactParts.push(`<a href="mailto:${escape(companyEmail)}" style="color:${t.accentInk};text-decoration:none">${escape(companyEmail)}</a>`);
    // Riga 2: Nome vertical
    // Riga 3: sito vertical - mail generale vertical
    const html = `
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;font-size:13px;line-height:1.5">
  <tr>
    <td style="padding:0 0 0 14px;border-left:3px solid ${t.accent}">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
        <tr>
          <td style="padding:0 0 6px 0">
            <div style="font-size:16px;font-weight:700;color:${t.accentInk};letter-spacing:-0.01em">${escape(fullName) || "&nbsp;"}</div>
            ${roleLabel ? `<div style="margin-top:1px;font-size:12px;font-weight:500;color:#4b5563">${escape(roleLabel)}${` · ${t.label}`}</div>` : `<div style="margin-top:1px;font-size:12px;font-weight:500;color:#4b5563">${t.label}</div>`}
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-top:1px solid ${t.rule}">
            <div style="font-size:12px">${contactParts.join(' &nbsp;&middot;&nbsp; ')}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0 0 0;border-top:1px solid ${t.rule}">
            <div style="font-size:12px;font-weight:600;color:${t.accentInk}">${t.label}</div>
            <div style="margin-top:2px;font-size:11px;color:${t.subtle}">
              <a href="https://${t.website}" style="color:${t.subtle};text-decoration:none">${t.website}</a>
              &nbsp;&middot;&nbsp;
              <a href="mailto:${t.email}" style="color:${t.subtle};text-decoration:none">${t.email}</a>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
    const fromName = fullName || t.label;
    return { html, fromName };
}
const GENERIC_LOCALS = new Set(["hello", "info", "support", "noreply", "admin", "contact"]);
function companyEmailForBrand(profile, domain) {
    const profileLocal = profile.email?.split("@");
    if (profileLocal && profileLocal.length === 2 && profileLocal[1].toLowerCase() === domain.toLowerCase() && !GENERIC_LOCALS.has(profileLocal[0].toLowerCase())) {
        return `${profileLocal[0]}@${domain}`;
    }
    const local = localPartFromName(profile.first_name, profile.last_name)
        || localPartFromName(profile.display_name, null);
    return local ? `${local}@${domain}` : null;
}
function localPartFromName(a, b) {
    const parts = [a, b]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");
    return parts || null;
}
function escape(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
//# sourceMappingURL=signature-queries.js.map