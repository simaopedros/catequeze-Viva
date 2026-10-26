export const CERTIFICATE_KINDS = [
  "enrollment",
  "attendance",
  "completion",
] as const;

export type CertificateKind = (typeof CERTIFICATE_KINDS)[number];

export type CertificateDocument = {
  lang: string;
  heading: string;
  title: string;
  paragraphs: string[];
  placeAndDate: string;
  signatures: { name: string; role: string }[];
  footer?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Standalone A4 page meant to be printed or saved as PDF from the browser. */
export function buildCertificateHtml(doc: CertificateDocument): string {
  const signatures = doc.signatures
    .map(
      (s) =>
        `<div class="sig"><div class="line"></div><strong>${escapeHtml(
          s.name || " ",
        )}</strong><span>${escapeHtml(s.role)}</span></div>`,
    )
    .join("");
  const paragraphs = doc.paragraphs
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  return `<!doctype html>
<html lang="${escapeHtml(doc.lang)}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #14213d; }
  .page { min-height: 100vh; border: 3px double #b08d57; padding: 22mm 18mm; display: flex; flex-direction: column; }
  .heading { text-align: center; font-size: 13px; letter-spacing: .18em; text-transform: uppercase; color: #6b5a3a; }
  h1 { text-align: center; font-size: 30px; margin: 10mm 0 12mm; font-weight: normal; }
  p { font-size: 17px; line-height: 1.8; text-align: justify; margin: 0 0 6mm; }
  .place { text-align: right; margin-top: 8mm; font-size: 15px; }
  .sigs { display: flex; gap: 14mm; justify-content: center; margin-top: auto; padding-top: 22mm; }
  .sig { flex: 1; max-width: 75mm; text-align: center; font-size: 14px; display: flex; flex-direction: column; gap: 2px; }
  .line { border-top: 1px solid #14213d; margin-bottom: 4px; }
  .sig span { color: #555; font-size: 12px; }
  .footer { text-align: center; font-size: 10px; color: #888; margin-top: 10mm; }
  @media print { .page { min-height: calc(297mm - 36mm); } }
</style>
</head>
<body>
<div class="page">
  <div class="heading">${escapeHtml(doc.heading)}</div>
  <h1>${escapeHtml(doc.title)}</h1>
  ${paragraphs}
  <div class="place">${escapeHtml(doc.placeAndDate)}</div>
  <div class="sigs">${signatures}</div>
  ${doc.footer ? `<div class="footer">${escapeHtml(doc.footer)}</div>` : ""}
</div>
<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 150); });</script>
</body>
</html>`;
}
