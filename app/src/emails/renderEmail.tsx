import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandLayout, Paragraphs } from "./BrandLayout";

export function renderReactEmail(element: React.ReactElement): string {
  return `<!DOCTYPE html>${renderToStaticMarkup(element)}`;
}

export function renderBrandedEmail(args: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: React.ReactNode;
  preview?: string;
}): { html: string; text: string } {
  const html = renderReactEmail(
    <BrandLayout
      heading={args.heading}
      ctaLabel={args.ctaLabel}
      ctaUrl={args.ctaUrl}
      footer={args.footer}
      preview={args.preview}
    >
      <Paragraphs text={args.body} />
    </BrandLayout>,
  );
  const text = [
    args.heading,
    "",
    args.body,
    args.ctaUrl ? `\n${args.ctaLabel || "Link"}: ${args.ctaUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { html, text };
}
