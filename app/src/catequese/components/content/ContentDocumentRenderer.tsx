import type { ReactNode } from "react";
import { Fragment } from "react";
import { cn } from "../../../client/utils";
import type {
  ContentDocMark,
  ContentDocNode,
  ContentDocument,
} from "../../../shared/contentDocument";

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];
const CONTENT_IMAGE_PATH = "/api/content-images/";

/** Allow only http(s)/mailto/tel links and same-origin relative paths; block javascript:/data:. */
export function sanitizeLinkHref(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "#";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return SAFE_LINK_PROTOCOLS.includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

/** Allow only https images or the authenticated content-image endpoint. */
export function sanitizeImageSrc(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith(CONTENT_IMAGE_PATH)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function getReferenceMarkClass(refType?: string) {
  switch (refType) {
    case "bible":
      return "rounded-sm bg-brand-gold/15 px-0.5 underline decoration-dotted underline-offset-4 decoration-brand-gold/80";
    case "catechism":
      return "rounded-sm bg-brand-ink/8 px-0.5 underline decoration-dotted underline-offset-4 decoration-brand-ink/60";
    case "directory":
      return "rounded-sm bg-muted/70 px-0.5 underline decoration-dotted underline-offset-4 decoration-muted-foreground/70";
    default:
      return "rounded-sm bg-muted/60 px-0.5 underline decoration-dotted underline-offset-4";
  }
}

function renderMarkedText(text: string, marks?: ContentDocMark[]) {
  let output: ReactNode = text;

  for (const mark of marks || []) {
    switch (mark.type) {
      case "bold":
        output = <strong>{output}</strong>;
        break;
      case "italic":
        output = <em>{output}</em>;
        break;
      case "underline":
        output = <u>{output}</u>;
        break;
      case "strike":
        output = <s>{output}</s>;
        break;
      case "link":
        output = (
          <a
            href={sanitizeLinkHref(mark.attrs?.href)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-ink underline underline-offset-2"
          >
            {output}
          </a>
        );
        break;
      case "referenceAnchor":
        output = (
          <span
            className={getReferenceMarkClass(String(mark.attrs?.refType || ""))}
            title={String(mark.attrs?.refLabel || "Referência vinculada")}
            data-reference-anchor="true"
            data-ref-type={String(mark.attrs?.refType || "")}
            data-ref-id={String(mark.attrs?.refId || "")}
          >
            {output}
          </span>
        );
        break;
      default:
        break;
    }
  }

  return output;
}

function renderInlineContent(nodes?: ContentDocNode[]) {
  if (!nodes?.length) return null;
  return nodes.map((node, index) => {
    if (node.type === "text") {
      return (
        <Fragment key={index}>
          {renderMarkedText(node.text || "", node.marks)}
        </Fragment>
      );
    }
    if (node.type === "hardBreak") {
      return <br key={index} />;
    }
    return <Fragment key={index}>{renderNode(node, index)}</Fragment>;
  });
}

function renderChildren(nodes?: ContentDocNode[]) {
  return (
    nodes?.map((node, index) => (
      <Fragment key={index}>{renderNode(node, index)}</Fragment>
    )) || null
  );
}

function renderNode(node: ContentDocNode, index: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={index}>{renderInlineContent(node.content)}</p>;
    case "heading": {
      const level = Number(node.attrs?.level || 2);
      if (level === 1)
        return <h1 key={index}>{renderInlineContent(node.content)}</h1>;
      if (level === 2)
        return <h2 key={index}>{renderInlineContent(node.content)}</h2>;
      return <h3 key={index}>{renderInlineContent(node.content)}</h3>;
    }
    case "bulletList":
      return <ul key={index}>{renderChildren(node.content)}</ul>;
    case "orderedList":
      return <ol key={index}>{renderChildren(node.content)}</ol>;
    case "listItem":
      return <li key={index}>{renderChildren(node.content)}</li>;
    case "blockquote":
      return (
        <blockquote key={index}>{renderChildren(node.content)}</blockquote>
      );
    case "horizontalRule":
      return <hr key={index} />;
    case "image": {
      const src = sanitizeImageSrc(node.attrs?.src);
      if (!src) return null;
      return (
        <figure key={index} className="my-6">
          <img
            src={src}
            alt={String(node.attrs?.alt || "")}
            loading="lazy"
            className="max-h-[420px] w-auto max-w-full rounded-sm border bg-muted/20 object-contain"
          />
        </figure>
      );
    }
    case "table":
      return (
        <div key={index} className="my-6 overflow-x-auto rounded-sm border">
          <table className="w-full border-collapse text-sm">
            {renderChildren(node.content)}
          </table>
        </div>
      );
    case "tableRow":
      return (
        <tr key={index} className="border-b">
          {renderChildren(node.content)}
        </tr>
      );
    case "tableHeader":
      return (
        <th
          key={index}
          className="border-r bg-muted/40 px-3 py-2 text-left font-semibold tracking-tight text-brand-ink last:border-r-0"
        >
          {renderChildren(node.content)}
        </th>
      );
    case "tableCell":
      return (
        <td
          key={index}
          className="border-r px-3 py-2 align-top last:border-r-0"
        >
          {renderChildren(node.content)}
        </td>
      );
    default:
      return null;
  }
}

export function ContentDocumentRenderer({
  document,
  className,
}: {
  document: ContentDocument;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-brand-ink prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-7 prose-blockquote:border-l-brand-ink prose-blockquote:text-brand-ink/90 prose-li:leading-7 prose-strong:text-brand-ink",
        className,
      )}
    >
      {renderChildren(document.content)}
    </div>
  );
}
