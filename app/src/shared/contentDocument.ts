export type ContentDocMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type ContentDocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: ContentDocMark[];
  text?: string;
  content?: ContentDocNode[];
};

export type ContentDocument = {
  type: "doc";
  content: ContentDocNode[];
};

export const CONTENT_DOCUMENT_VERSION = 1;

function textNode(text: string, marks?: ContentDocMark[]): ContentDocNode {
  return { type: "text", text, ...(marks?.length ? { marks } : {}) };
}

export function paragraphNode(text?: string): ContentDocNode {
  return {
    type: "paragraph",
    content: text ? [textNode(text)] : [],
  };
}

export function headingNode(text: string, level = 2): ContentDocNode {
  return {
    type: "heading",
    attrs: { level },
    content: [textNode(text)],
  };
}

function listItemNode(text: string): ContentDocNode {
  return {
    type: "listItem",
    content: [paragraphNode(text)],
  };
}

export function bulletListNode(items: string[]): ContentDocNode {
  return {
    type: "bulletList",
    content: items.filter(Boolean).map(listItemNode),
  };
}

export function orderedListNode(items: string[]): ContentDocNode {
  return {
    type: "orderedList",
    content: items.filter(Boolean).map(listItemNode),
  };
}

export function createEmptyContentDocument(): ContentDocument {
  return {
    type: "doc",
    content: [paragraphNode("")],
  };
}

/** Default pastoral sections for the manual meeting editor. */
export const MEETING_SECTION_TITLES = [
  "Oração inicial",
  "Acolhida / recado",
  "Conteúdo principal",
  "Dinâmica / atividade",
  "Compromisso com a família",
  "Oração final",
] as const;

/**
 * Structured empty meeting skeleton — headings + blank paragraphs so catechists
 * start from a recognizable pastoral outline instead of a blank page.
 */
export function createMeetingSkeletonDocument(): ContentDocument {
  const content: ContentDocNode[] = [];
  for (const title of MEETING_SECTION_TITLES) {
    content.push(headingNode(title, 2));
    content.push(paragraphNode(""));
  }
  return { type: "doc", content };
}

/** True when the doc is a single empty paragraph (legacy blank). */
export function isBlankContentDocument(
  doc: ContentDocument | null | undefined,
): boolean {
  if (!doc?.content?.length) return true;
  if (doc.content.length !== 1) return false;
  const node = doc.content[0];
  if (node.type !== "paragraph") return false;
  const text = (node.content || [])
    .map((child) => (child.type === "text" ? child.text || "" : ""))
    .join("")
    .trim();
  return text.length === 0;
}

/**
 * True when the document is still the default skeleton with no body text
 * (only H2 section titles and empty paragraphs).
 */
export function isUnmodifiedMeetingSkeleton(
  doc: ContentDocument | null | undefined,
): boolean {
  if (!doc?.content?.length) return false;
  const skeleton = createMeetingSkeletonDocument();
  return JSON.stringify(doc) === JSON.stringify(skeleton);
}

export function parseContentDocument(
  value: string | null | undefined,
): ContentDocument | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return isContentDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isContentDocument(value: unknown): value is ContentDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as ContentDocument;
  return doc.type === "doc" && Array.isArray(doc.content);
}

function pushTextSection(
  target: ContentDocNode[],
  title: string,
  body?: string | null,
  options?: { blockquote?: boolean },
) {
  if (!body || !body.trim()) return;
  target.push(headingNode(title));
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    target.push(paragraphNode(body.trim()));
    return;
  }

  for (const paragraph of paragraphs) {
    if (options?.blockquote) {
      target.push({ type: "blockquote", content: [paragraphNode(paragraph)] });
    } else {
      target.push(paragraphNode(paragraph));
    }
  }
}

export function buildLegacyContentDocument(
  item: Record<string, any>,
): ContentDocument {
  const content: ContentDocNode[] = [];

  if (item.theme || item.pastoralObjective || item.estimatedTime || item.tags) {
    const summaryItems = [
      item.theme ? `Tema: ${item.theme}` : null,
      item.pastoralObjective
        ? `Objetivo pastoral: ${item.pastoralObjective}`
        : null,
      item.estimatedTime
        ? `Duração estimada: ${item.estimatedTime} minutos`
        : null,
      item.tags ? `Tags: ${item.tags}` : null,
    ].filter((entry): entry is string => Boolean(entry));

    if (summaryItems.length) {
      content.push(headingNode("Resumo do encontro"));
      content.push(bulletListNode(summaryItems));
    }
  }

  pushTextSection(content, "Oração inicial", item.openingPrayer, {
    blockquote: true,
  });
  pushTextSection(content, "Conteúdo principal", item.mainContent);
  pushTextSection(content, "Dinâmica", item.dynamic);
  pushTextSection(content, "Atividade", item.activity);
  pushTextSection(content, "Materiais", item.materials);
  pushTextSection(content, "Compromisso com a família", item.familyTask);
  pushTextSection(content, "Oração final", item.closingPrayer, {
    blockquote: true,
  });

  const referenceItems = [
    item.biblicalRef ? `Leitura bíblica: ${item.biblicalRef}` : null,
    item.catechismRef ? `Catecismo: ${item.catechismRef}` : null,
    ...(Array.isArray(item.bibleRefs)
      ? item.bibleRefs.map((ref: any) => {
          const label = `${ref.verse?.chapter?.book?.name || ""} ${
            ref.verse?.chapter?.number || ""
          }:${ref.verse?.number || ""}`.trim();
          return label ? `${label} — ${ref.verse?.text || ""}`.trim() : null;
        })
      : []),
    ...(Array.isArray(item.catechismRefs)
      ? item.catechismRefs.map((ref: any) => {
          if (!ref.entry?.number) return null;
          return `CIC §${ref.entry.number} — ${
            ref.entry.question || ref.entry.answer || ""
          }`.trim();
        })
      : []),
    ...(Array.isArray(item.directoryRefs)
      ? item.directoryRefs.map((ref: any) => {
          if (!ref.entry?.number) return null;
          return `Diretório §${ref.entry.number} — ${
            ref.entry.title || ref.entry.content || ""
          }`.trim();
        })
      : []),
  ].filter((entry): entry is string => Boolean(entry));

  if (referenceItems.length) {
    content.push(headingNode("Referências"));
    content.push(bulletListNode(referenceItems));
  }

  if (!content.length) {
    content.push(paragraphNode(""));
  }

  return { type: "doc", content };
}

export function contentDocumentToPlainText(
  doc: ContentDocument | null | undefined,
): string {
  if (!doc?.content?.length) return "";
  const parts: string[] = [];

  const walk = (nodes?: ContentDocNode[]) => {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === "text" && node.text) {
        parts.push(node.text);
      }
      if (node.content) walk(node.content);
      if (
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "listItem"
      ) {
        parts.push("\n");
      }
    }
  };

  walk(doc.content);
  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainTextToContentDocument(text: string): ContentDocument {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\f/g, "\n\n")
    .replace(/\u0000/g, "");
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return createEmptyContentDocument();
  }

  return {
    type: "doc",
    content: paragraphs.map((part) => paragraphNode(part)),
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function htmlInnerText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function htmlToContentDocument(html: string): ContentDocument {
  const content: ContentDocNode[] = [];
  const source = html.replace(/<!--[\s\S]*?-->/g, "");
  const token = /<(h[1-6]|p|ul|ol|blockquote)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let found = false;

  while ((match = token.exec(source))) {
    found = true;
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag.startsWith("h")) {
      const text = htmlInnerText(inner);
      if (text) content.push(headingNode(text, Number(tag.slice(1))));
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi)]
        .map((item) => htmlInnerText(item[1]))
        .filter(Boolean);
      if (items.length) {
        content.push(
          tag === "ul" ? bulletListNode(items) : orderedListNode(items),
        );
      }
      continue;
    }

    const text = htmlInnerText(inner);
    if (!text) continue;
    if (tag === "blockquote") {
      content.push({ type: "blockquote", content: [paragraphNode(text)] });
    } else {
      content.push(paragraphNode(text));
    }
  }

  if (!found) {
    return plainTextToContentDocument(htmlInnerText(source));
  }
  if (!content.length) return createEmptyContentDocument();
  return { type: "doc", content };
}

export function markdownToContentDocument(markdown: string): ContentDocument {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const content: ContentDocNode[] = [];
  let paragraphLines: string[] = [];
  let bulletItems: string[] = [];
  let orderedItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const text = paragraphLines.join(" ").replace(/\s+/g, " ").trim();
    if (text) content.push(paragraphNode(text));
    paragraphLines = [];
  };
  const flushBullets = () => {
    if (bulletItems.length) content.push(bulletListNode(bulletItems));
    bulletItems = [];
  };
  const flushOrdered = () => {
    if (orderedItems.length) content.push(orderedListNode(orderedItems));
    orderedItems = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushOrdered();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushAll();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushAll();
      content.push(
        headingNode(heading[2].trim(), Math.min(heading[1].length, 6)),
      );
      continue;
    }

    const bullet = /^[-*+]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      flushOrdered();
      bulletItems.push(bullet[1].trim());
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (ordered) {
      flushParagraph();
      flushBullets();
      orderedItems.push(ordered[1].trim());
      continue;
    }

    flushBullets();
    flushOrdered();
    paragraphLines.push(trimmed);
  }

  flushAll();
  if (!content.length) return createEmptyContentDocument();
  return { type: "doc", content };
}
