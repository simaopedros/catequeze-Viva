import React from "react";

type BrandLayoutProps = {
  heading: string;
  children: React.ReactNode;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: React.ReactNode;
  preview?: string;
};

/** React Email-style layout: typed components rendered to static HTML. */
export function BrandLayout({
  heading,
  children,
  ctaLabel,
  ctaUrl,
  footer,
  preview,
}: BrandLayoutProps) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#f8fafc", padding: "24px" }}>
        {preview ? (
          <div style={{ display: "none", maxHeight: 0, overflow: "hidden" }}>
            {preview}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: "Inter,system-ui,sans-serif",
            maxWidth: "560px",
            margin: "0 auto",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            padding: "32px",
            lineHeight: 1.55,
          }}
        >
          <p
            style={{
              margin: "0 0 16px",
              letterSpacing: "0.14em",
              fontSize: "11px",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Catequese Viva
          </p>
          <h1
            style={{
              margin: "0 0 16px",
              color: "#071A2D",
              fontSize: "22px",
              fontWeight: 600,
            }}
          >
            {heading}
          </h1>
          <div style={{ margin: "0 0 24px", color: "#334155", fontSize: "16px" }}>
            {children}
          </div>
          {ctaLabel && ctaUrl ? (
            <p style={{ margin: "0 0 28px" }}>
              <a
                href={ctaUrl}
                style={{
                  display: "inline-block",
                  background: "#071A2D",
                  color: "#ffffff",
                  padding: "12px 20px",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontSize: "15px",
                }}
              >
                {ctaLabel}
              </a>
            </p>
          ) : null}
          <hr
            style={{
              border: "none",
              borderTop: "1px solid #e2e8f0",
              margin: "0 0 16px",
            }}
          />
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px" }}>{footer}</p>
        </div>
      </body>
    </html>
  );
}

export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, index) => (
        <p key={index} style={{ margin: "0 0 12px" }}>
          {line}
        </p>
      ))}
    </>
  );
}
