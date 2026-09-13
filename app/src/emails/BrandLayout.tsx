import React from "react";
import { brandColors } from "../shared/designTokens";

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
      <body style={{ margin: 0, background: brandColors.canvas, padding: "24px" }}>
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
            background: brandColors.paper,
            border: `1px solid ${brandColors.line}`,
            padding: "32px",
            lineHeight: 1.55,
          }}
        >
          <p
            style={{
              margin: "0 0 16px",
              letterSpacing: "0.14em",
              fontSize: "11px",
              color: brandColors.muted,
              textTransform: "uppercase",
            }}
          >
            Catequese Viva
          </p>
          <h1
            style={{
              margin: "0 0 16px",
              color: brandColors.ink,
              fontSize: "22px",
              fontWeight: 600,
            }}
          >
            {heading}
          </h1>
          <div style={{ margin: "0 0 24px", color: brandColors.inkSoft, fontSize: "16px" }}>
            {children}
          </div>
          {ctaLabel && ctaUrl ? (
            <p style={{ margin: "0 0 28px" }}>
              <a
                href={ctaUrl}
                style={{
                  display: "inline-block",
                  background: brandColors.gold,
                  color: brandColors.ink,
                  padding: "12px 20px",
                  textDecoration: "none",
                  borderRadius: "10px",
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
              borderTop: `1px solid ${brandColors.line}`,
              margin: "0 0 16px",
            }}
          />
          <p style={{ margin: 0, color: brandColors.muted, fontSize: "12px" }}>{footer}</p>
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
