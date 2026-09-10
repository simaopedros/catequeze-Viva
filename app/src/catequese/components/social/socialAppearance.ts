/** Visual helpers for the Comunidade feed (layout inspired by the designer mock). */

export type SocialTopicTone = "blue" | "gold" | "green" | "purple";

const TOPIC_TONES: Record<string, SocialTopicTone> = {
  liturgia: "purple",
  santos: "purple",
  biblia: "purple",
  catequese: "blue",
  formacao: "blue",
  oracao: "green",
  missao: "green",
  testemunho: "gold",
  familia: "gold",
  juventude: "gold",
};

export function socialTopicTone(slug: string): SocialTopicTone {
  return TOPIC_TONES[slug] ?? "blue";
}

export function socialTopicChipClass(slug: string): string {
  switch (socialTopicTone(slug)) {
    case "gold":
      return "bg-brand-gold/15 text-brand-gold-muted";
    case "green":
      return "bg-success/10 text-success";
    case "purple":
      return "bg-accent/15 text-accent-foreground";
    default:
      return "bg-info/10 text-info";
  }
}

export function socialAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "CV";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

/**
 * Use the first line as a title when the author wrote a short heading
 * followed by a body — matching the designer’s post cards.
 */
export function splitSocialHeadline(body: string): {
  title: string | null;
  rest: string;
} {
  const trimmed = body.trim();
  if (!trimmed) return { title: null, rest: "" };

  const newline = trimmed.indexOf("\n");
  if (newline === -1) return { title: null, rest: trimmed };

  const first = trimmed.slice(0, newline).trim();
  const rest = trimmed.slice(newline + 1).trim();
  if (first.length > 0 && first.length <= 90 && rest.length > 0) {
    return { title: first, rest };
  }
  return { title: null, rest: trimmed };
}

/** Collapse long feed bodies so a single post cannot dominate the layout. */
export const SOCIAL_POST_COLLAPSE_CHARS = 420;
export const SOCIAL_POST_COLLAPSE_LINES = 8;

export function shouldCollapseSocialBody(text: string): boolean {
  if (!text) return false;
  return (
    text.length > SOCIAL_POST_COLLAPSE_CHARS ||
    text.split("\n").length > SOCIAL_POST_COLLAPSE_LINES
  );
}

export function collapseSocialBody(text: string): string {
  if (!shouldCollapseSocialBody(text)) return text;
  if (text.length > SOCIAL_POST_COLLAPSE_CHARS) {
    return `${text.slice(0, SOCIAL_POST_COLLAPSE_CHARS).trimEnd()}…`;
  }
  return `${text.split("\n").slice(0, SOCIAL_POST_COLLAPSE_LINES).join("\n").trimEnd()}…`;
}
