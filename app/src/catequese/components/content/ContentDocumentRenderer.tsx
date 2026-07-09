import type { ReactNode } from "react";
import { Fragment } from "react";
import { cn } from "../../../client/utils";
import type {
  ContentDocMark,
  ContentDocNode,
  ContentDocument,
} from "../../../shared/contentDocument";

function getReferenceMarkClass(refType?: string) {
  switch (refType) {
    case "bible":
      return "rounded-sm bg-[#D39A2B]/15 px-0.5 underline decoration-dotted underline-offset-4 decoration-[#D39A2B]/80";
    case "catechism":
      return "rounded-sm bg-[#071A2D]/08 px-0.5 underline decoration-dotted underline-offset-4 decoration-[#071A2D]/60";
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
            href={String(mark.attrs?.href || "#")}
            target="_blank"
            rel="noreferrer"
            className="text-[#071A2D] underline underline-offset-2"
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
    case "image":
      return (
        <figure key={index} className="my-6">
          <img
            src={String(node.attrs?.src || "")}
            alt={String(node.attrs?.alt || "")}
            className="max-h-[420px] w-auto max-w-full rounded-sm border bg-muted/20 object-contain"
          />
        </figure>
      );
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
          className="border-r bg-muted/40 px-3 py-2 text-left font-semibold last:border-r-0"
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
        "prose prose-neutral max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-7 prose-blockquote:border-l-[#071A2D] prose-blockquote:text-foreground prose-li:leading-7",
        className,
      )}
    >
      {renderChildren(document.content)}
    </div>
  );
}
