/**
 * Resolve a native share draft into a stable snapshot stored on the post.
 * Never trusts client title/excerpt/href — always rebuilds from the source.
 */
import { HttpError } from 'wasp/server';
import { assertCanAccessContent } from '../auth/contentAccess';
import {
  MAX_SHARE_EXCERPT,
  MAX_SHARE_SUBTITLE,
  MAX_SHARE_TITLE,
  buildCatechismHref,
  buildDirectoryHref,
  buildDocumentHref,
  buildVerseHref,
  excerptFromHtml,
  isSocialShareKind,
  sanitizeShareText,
  type SocialShareDraft,
  type SocialShareKind,
  type SocialShareSnapshot,
} from '../../shared/socialShare';

function snapshot(partial: SocialShareSnapshot): SocialShareSnapshot {
  return {
    kind: partial.kind,
    title: sanitizeShareText(partial.title, MAX_SHARE_TITLE),
    subtitle: partial.subtitle
      ? sanitizeShareText(partial.subtitle, MAX_SHARE_SUBTITLE)
      : null,
    excerpt: sanitizeShareText(partial.excerpt, MAX_SHARE_EXCERPT),
    href: partial.href,
    sourceId: partial.sourceId,
    sourceLabel: partial.sourceLabel
      ? sanitizeShareText(partial.sourceLabel, MAX_SHARE_SUBTITLE)
      : null,
  };
}

async function resolveVerse(sourceId: string, context: any): Promise<SocialShareSnapshot> {
  const verse = await context.entities.BibleVerse.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      number: true,
      text: true,
      chapter: {
        select: {
          number: true,
          book: { select: { id: true, name: true, abbreviation: true } },
        },
      },
    },
  });
  if (!verse?.chapter?.book) {
    throw new HttpError(404, 'Versículo não encontrado.');
  }

  const book = verse.chapter.book;
  const reference = `${book.name} ${verse.chapter.number}:${verse.number}`;
  return snapshot({
    kind: 'VERSE',
    title: reference,
    subtitle: book.abbreviation || null,
    excerpt: verse.text,
    href: buildVerseHref(book.id, verse.chapter.number, verse.number),
    sourceId: verse.id,
    sourceLabel: 'Bíblia',
  });
}

async function resolveCatechism(sourceId: string, context: any): Promise<SocialShareSnapshot> {
  const entry = await context.entities.CatechismEntry.findUnique({
    where: { id: sourceId },
    select: { id: true, number: true, question: true, answer: true, category: true },
  });
  if (!entry) {
    throw new HttpError(404, 'Entrada do Catecismo não encontrada.');
  }

  return snapshot({
    kind: 'CATECHISM',
    title: `CIC ${entry.number}`,
    subtitle: entry.question,
    excerpt: entry.answer,
    href: buildCatechismHref(entry.number),
    sourceId: entry.id,
    sourceLabel: 'Catecismo',
  });
}

async function resolveDirectory(sourceId: string, context: any): Promise<SocialShareSnapshot> {
  const entry = await context.entities.DirectoryEntry.findUnique({
    where: { id: sourceId },
    select: { id: true, number: true, title: true, content: true, part: true },
  });
  if (!entry) {
    throw new HttpError(404, 'Entrada do Diretório não encontrada.');
  }

  return snapshot({
    kind: 'DIRECTORY',
    title: entry.title || `Diretório ${entry.number}`,
    subtitle: entry.part ? `Parte ${entry.part}` : null,
    excerpt: excerptFromHtml(entry.content),
    href: buildDirectoryHref(entry.number),
    sourceId: entry.id,
    sourceLabel: 'Diretório',
  });
}

async function resolveDocument(
  sourceId: string,
  kind: Extract<SocialShareKind, 'DOCUMENT' | 'AI_ARTIFACT'>,
  context: any,
): Promise<SocialShareSnapshot> {
  const item = await context.entities.ContentItem.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      title: true,
      theme: true,
      pastoralObjective: true,
      mainContent: true,
      openingPrayer: true,
      isAiGenerated: true,
      parishId: true,
      createdById: true,
      dioceseId: true,
      ownerType: true,
      visibilityScope: true,
      status: true,
    },
  });
  if (!item) {
    throw new HttpError(404, 'Documento não encontrado.');
  }

  await assertCanAccessContent(context, item);

  const resolvedKind: SocialShareKind =
    kind === 'AI_ARTIFACT' || item.isAiGenerated ? 'AI_ARTIFACT' : 'DOCUMENT';

  const excerpt =
    excerptFromHtml(item.pastoralObjective || '') ||
    excerptFromHtml(item.openingPrayer || '') ||
    excerptFromHtml(item.mainContent || '');

  return snapshot({
    kind: resolvedKind,
    title: item.title,
    subtitle: item.theme || null,
    excerpt,
    href: buildDocumentHref(item.id),
    sourceId: item.id,
    sourceLabel: resolvedKind === 'AI_ARTIFACT' ? 'Assistência editorial' : 'Biblioteca',
  });
}

export function parseShareDraft(raw: unknown): SocialShareDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const draft = raw as { kind?: unknown; sourceId?: unknown };
  if (!isSocialShareKind(draft.kind)) {
    throw new HttpError(400, 'Tipo de partilha inválido.');
  }
  const sourceId = String(draft.sourceId || '').trim();
  if (!sourceId) {
    throw new HttpError(400, 'Conteúdo para partilhar não informado.');
  }
  return { kind: draft.kind, sourceId };
}

export async function resolveSocialShare(
  draft: SocialShareDraft,
  context: any,
): Promise<SocialShareSnapshot> {
  switch (draft.kind) {
    case 'VERSE':
      return resolveVerse(draft.sourceId, context);
    case 'CATECHISM':
      return resolveCatechism(draft.sourceId, context);
    case 'DIRECTORY':
      return resolveDirectory(draft.sourceId, context);
    case 'DOCUMENT':
    case 'AI_ARTIFACT':
      return resolveDocument(draft.sourceId, draft.kind, context);
    default:
      throw new HttpError(400, 'Tipo de partilha inválido.');
  }
}

export const previewSocialShare = async (args: unknown, context: any) => {
  const draft = parseShareDraft(args);
  if (!draft) {
    throw new HttpError(400, 'Partilha inválida.');
  }
  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }
  return resolveSocialShare(draft, context);
};
