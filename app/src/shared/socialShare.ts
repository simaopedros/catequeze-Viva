/**
 * Native share attachments for Comunidade posts, plus the Rhema query-string
 * helper used by PastoralCompanion and text-only "share a moment" links.
 */
import { MAX_POST_BODY_LENGTH } from "./socialConstants";

export const SOCIAL_SHARE_KINDS = [
  "VERSE",
  "CATECHISM",
  "DOCUMENT",
  "AI_ARTIFACT",
  "DIRECTORY",
] as const;

export type SocialShareKind = (typeof SOCIAL_SHARE_KINDS)[number];

export const MAX_SHARE_TITLE = 180;
export const MAX_SHARE_SUBTITLE = 120;
export const MAX_SHARE_EXCERPT = 400;

export type SocialShareDraft = {
  kind: SocialShareKind;
  sourceId: string;
};

export type SocialShareSnapshot = {
  kind: SocialShareKind;
  title: string;
  subtitle: string | null;
  excerpt: string;
  href: string;
  sourceId: string | null;
  sourceLabel: string | null;
};

export function isSocialShareKind(value: unknown): value is SocialShareKind {
  return (
    typeof value === "string" &&
    (SOCIAL_SHARE_KINDS as readonly string[]).includes(value)
  );
}

/** Strip markup and collapse whitespace for a safe card excerpt. */
export function sanitizeShareText(raw: string, max: number): string {
  const clean = (raw || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function excerptFromHtml(html: string, max = 280): string {
  return sanitizeShareText(html, max);
}

export function buildVerseHref(
  bookId: string,
  chapter: number,
  verse: number,
): string {
  const params = new URLSearchParams({
    book: bookId,
    chapter: String(chapter),
    verse: String(verse),
  });
  return `/app/bible?${params.toString()}`;
}

export function buildCatechismHref(entryNumber: number): string {
  return `/app/catechism?entry=${encodeURIComponent(String(entryNumber))}`;
}

export function buildDocumentHref(contentId: string): string {
  return `/app/content-library/${encodeURIComponent(contentId)}`;
}

export function buildDirectoryHref(entryNumber: number): string {
  return `/app/directory?entry=${encodeURIComponent(String(entryNumber))}`;
}

export function shareKindLabelKey(kind: SocialShareKind): string {
  switch (kind) {
    case "VERSE":
      return "nativeShare.kind.verse";
    case "CATECHISM":
      return "nativeShare.kind.catechism";
    case "DOCUMENT":
      return "nativeShare.kind.document";
    case "AI_ARTIFACT":
      return "nativeShare.kind.ai";
    case "DIRECTORY":
      return "nativeShare.kind.directory";
  }
}

export function buildNativeSharePath(draft: SocialShareDraft): string {
  const params = new URLSearchParams({
    share: draft.kind,
    sourceId: draft.sourceId,
  });
  return `/app/comunidade?${params.toString()}`;
}

export const COMMUNITY_SHARE_PARAM = "share";

export type CommunityShareDraft = {
  body: string;
  topic?: string;
  source?: string;
};

export function buildCommunitySharePath(draft: CommunityShareDraft): string {
  const params = new URLSearchParams();
  params.set(COMMUNITY_SHARE_PARAM, "1");
  const body = draft.body.trim().slice(0, MAX_POST_BODY_LENGTH);
  if (body) params.set("body", body);
  if (draft.topic) params.set("topic", draft.topic);
  if (draft.source) params.set("from", draft.source);
  return `/app/comunidade?${params.toString()}`;
}

export function parseCommunityShareSearch(
  search: URLSearchParams | string,
): CommunityShareDraft | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  if (params.get(COMMUNITY_SHARE_PARAM) !== "1") return null;
  const body = (params.get("body") || "").trim().slice(0, MAX_POST_BODY_LENGTH);
  const topic = params.get("topic")?.trim() || undefined;
  const source = params.get("from")?.trim() || undefined;
  if (!body && !topic) return null;
  return { body, topic, source };
}

export function parseNativeShareSearch(
  search: URLSearchParams | string,
): SocialShareDraft | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const kind = params.get("share");
  const sourceId = params.get("sourceId");
  if (!kind || !sourceId || !isSocialShareKind(kind)) return null;
  return { kind, sourceId };
}

export function stripCommunityShareParams(
  search: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(search);
  next.delete(COMMUNITY_SHARE_PARAM);
  next.delete("body");
  next.delete("topic");
  next.delete("from");
  next.delete("sourceId");
  return next;
}
