const EMAIL_VIEW_STYLES = `
  :root { color-scheme: light; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    color: #171717;
    overflow-wrap: anywhere;
  }
  a { color: #a95f45; text-decoration: underline; text-underline-offset: 2px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px 22px; padding: 0; }
  li { margin: 3px 0; }
  blockquote {
    margin: 12px 0;
    padding: 0 0 0 12px;
    border-left: 3px solid #d8cfc6;
    color: #66615d;
  }
  blockquote blockquote {
    border-left-color: #c7b8aa;
    color: #77706a;
  }
  blockquote blockquote blockquote {
    border-left-color: #b49f8f;
    color: #82786f;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; border-collapse: collapse; }
  pre { white-space: pre-wrap; }
`;

function styleTag(): string {
  return `<style>${EMAIL_VIEW_STYLES}</style>`;
}

function headExtras(): string {
  return `<base target="_blank">${styleTag()}`;
}

export function buildEmailSrcDoc(html: string): string {
  if (/<html[\s>]/i.test(html)) {
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${headExtras()}</head>`);
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${headExtras()}</head>`);
  }

  return `<!doctype html><html><head><meta charset="utf-8">${headExtras()}</head><body>${html}</body></html>`;
}
