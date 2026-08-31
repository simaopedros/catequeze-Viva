export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderLifecycleEmailHtml(args: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footerReason: string;
  unsubscribeLabel: string;
  unsubscribeUrl: string;
}): string {
  const heading = escapeHtml(args.heading);
  const body = escapeHtml(args.body).replace(/\n/g, "<br/>");
  const ctaLabel = escapeHtml(args.ctaLabel);
  const ctaUrl = escapeHtml(args.ctaUrl);
  const footerReason = escapeHtml(args.footerReason);
  const unsubscribeLabel = escapeHtml(args.unsubscribeLabel);
  const unsubscribeUrl = escapeHtml(args.unsubscribeUrl);

  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#f8fafc;padding:24px">
  <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;padding:32px;line-height:1.55">
    <p style="margin:0 0 16px;letter-spacing:0.14em;font-size:11px;color:#64748b;text-transform:uppercase">Catequese Viva</p>
    <h1 style="margin:0 0 16px;color:#071A2D;font-size:22px;font-weight:600">${heading}</h1>
    <p style="margin:0 0 24px;color:#334155;font-size:16px">${body}</p>
    <p style="margin:0 0 28px">
      <a href="${ctaUrl}" style="display:inline-block;background:#071A2D;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px;font-size:15px">${ctaLabel}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px"/>
    <p style="margin:0;color:#94a3b8;font-size:12px">
      ${footerReason}<br/>
      <a href="${unsubscribeUrl}" style="color:#64748b">${unsubscribeLabel}</a>
    </p>
  </div>
</body>
</html>`;
}

export function renderUnsubscribePageHtml(args: {
  title: string;
  body: string;
}): string {
  const title = escapeHtml(args.title);
  const body = escapeHtml(args.body);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;background:#f8fafc;padding:48px 16px;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;padding:32px">
    <p style="margin:0 0 12px;letter-spacing:0.14em;font-size:11px;color:#64748b;text-transform:uppercase">Catequese Viva</p>
    <h1 style="margin:0 0 12px;color:#071A2D;font-size:22px">${title}</h1>
    <p style="margin:0;color:#334155;line-height:1.6">${body}</p>
  </div>
</body>
</html>`;
}
