/**
 * Lightweight text screening for the Comunidade feed.
 *
 * The feed is post-moderated: nothing here blocks a publication. A match only
 * routes the post to PENDING_REVIEW so a moderator sees it before it reaches
 * the public feed, which keeps false positives cheap.
 */

/** Terms that route a publication to human review (pt-BR/en/es). */
const REVIEW_TERMS = [
  // Hostility / harassment
  'idiota',
  'imbecil',
  'retardado',
  'vagabundo',
  'lixo humano',
  // Sexual content
  'pornografia',
  'pornô',
  'porno',
  'nudes',
  // Violence
  'matar você',
  'te matar',
  'morra',
  // Spam / scams
  'ganhe dinheiro',
  'clique aqui e ganhe',
  'investimento garantido',
  'bitcoin grátis',
  'whatsapp para vendas',
];

/** Sequences that usually mean the author pasted spam or shouting. */
const MAX_CONSECUTIVE_LINKS = 3;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function extractLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi);
  return matches ? matches : [];
}

export interface ModerationScreening {
  needsReview: boolean;
  reasons: string[];
}

/**
 * Screen a post or comment body. Never throws and never blocks — callers use
 * `needsReview` to decide between PUBLISHED and PENDING_REVIEW.
 */
export function screenSocialText(body: string): ModerationScreening {
  const reasons: string[] = [];
  const normalized = normalize(body || '');

  for (const term of REVIEW_TERMS) {
    if (normalized.includes(normalize(term))) {
      reasons.push(`term:${term}`);
    }
  }

  if (extractLinks(body || '').length > MAX_CONSECUTIVE_LINKS) {
    reasons.push('links');
  }

  const letters = (body || '').replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length >= 20) {
    const uppercase = letters.replace(/[^A-ZÀ-Þ]/g, '').length;
    if (uppercase / letters.length > 0.8) {
      reasons.push('shouting');
    }
  }

  return { needsReview: reasons.length > 0, reasons };
}
