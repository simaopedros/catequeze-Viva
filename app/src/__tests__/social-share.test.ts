import { describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));
import {
  buildCatechismHref,
  buildCommunitySharePath,
  buildDirectoryHref,
  buildDocumentHref,
  buildNativeSharePath,
  buildVerseHref,
  excerptFromHtml,
  isSocialShareKind,
  parseCommunityShareSearch,
  parseNativeShareSearch,
  sanitizeShareText,
} from '../shared/socialShare';
import { validateSocialPostDraft } from '../server/operations/socialPolicies';
import {
  collapseSocialBody,
  shouldCollapseSocialBody,
  splitSocialHeadline,
} from '../catequese/components/social/socialAppearance';

describe('social share snapshots', () => {
  it('recognises native share kinds only', () => {
    expect(isSocialShareKind('VERSE')).toBe(true);
    expect(isSocialShareKind('CATECHISM')).toBe(true);
    expect(isSocialShareKind('DIRECTORY')).toBe(true);
    expect(isSocialShareKind('DOCUMENT')).toBe(true);
    expect(isSocialShareKind('AI_ARTIFACT')).toBe(true);
    expect(isSocialShareKind('TEXT')).toBe(false);
    expect(isSocialShareKind('')).toBe(false);
  });

  it('strips markup and caps excerpt length', () => {
    expect(sanitizeShareText('<p>Paz  e   <b>bem</b></p>', 80)).toBe('Paz e bem');
    expect(sanitizeShareText('a'.repeat(50), 20)).toBe(`${'a'.repeat(19)}…`);
  });

  it('extracts a readable excerpt from HTML documents', () => {
    expect(excerptFromHtml('<h1>Batismo</h1><p>A água  é sinal.</p>', 80)).toBe(
      'Batismo A água é sinal.',
    );
  });

  it('builds deep-links back to the origin surface', () => {
    expect(buildVerseHref('book-1', 3, 16)).toBe('/app/bible?book=book-1&chapter=3&verse=16');
    expect(buildCatechismHref(1210)).toBe('/app/catechism?entry=1210');
    expect(buildDocumentHref('doc-9')).toBe('/app/content-library/doc-9');
    expect(buildDirectoryHref(42)).toBe('/app/directory?entry=42');
  });
});

describe('validateSocialPostDraft with native share', () => {
  it('accepts a share-only draft without body or media', () => {
    expect(
      validateSocialPostDraft({
        body: '',
        mediaCount: 0,
        mediaConsentAck: false,
        hasShare: true,
      }),
    ).toBeNull();
  });

  it('still requires text, media or a share', () => {
    expect(
      validateSocialPostDraft({
        body: '   ',
        mediaCount: 0,
        mediaConsentAck: false,
        hasShare: false,
      }),
    ).toMatch(/Escreva algo/);
  });
});

describe('share query helpers coexist', () => {
  it('parses Rhema text drafts and native source drafts separately', () => {
    const rhema = buildCommunitySharePath({
      body: 'Palavra de hoje',
      topic: 'biblia',
      source: 'bible',
    });
    expect(parseCommunityShareSearch(rhema.split('?')[1])).toEqual({
      body: 'Palavra de hoje',
      topic: 'biblia',
      source: 'bible',
    });
    expect(parseNativeShareSearch(rhema.split('?')[1])).toBeNull();

    const native = buildNativeSharePath({ kind: 'VERSE', sourceId: 'verse-1' });
    expect(native).toBe('/app/comunidade?share=VERSE&sourceId=verse-1');
    expect(parseNativeShareSearch(native.split('?')[1])).toEqual({
      kind: 'VERSE',
      sourceId: 'verse-1',
    });
    expect(parseCommunityShareSearch(native.split('?')[1])).toBeNull();
  });
});

describe('feed post layout', () => {
  it('treats a short first line as a headline', () => {
    expect(splitSocialHeadline('Paz e bem\nHoje rezámos juntos.')).toEqual({
      title: 'Paz e bem',
      rest: 'Hoje rezámos juntos.',
    });
  });

  it('collapses long bodies so a card cannot dominate the feed', () => {
    const long = 'a'.repeat(500);
    expect(shouldCollapseSocialBody('curto')).toBe(false);
    expect(shouldCollapseSocialBody(long)).toBe(true);
    expect(collapseSocialBody(long).endsWith('…')).toBe(true);
    expect(collapseSocialBody(long).length).toBeLessThan(long.length);
  });
});

describe('resolveSocialShare', () => {
  it('rejects invalid drafts', async () => {
    const { parseShareDraft } = await import('../server/operations/socialShareResolve');
    expect(() => parseShareDraft({ kind: 'TEXT', sourceId: 'x' })).toThrow();
    expect(parseShareDraft({ kind: 'VERSE', sourceId: 'verse-1' })).toEqual({
      kind: 'VERSE',
      sourceId: 'verse-1',
    });
  });

  it('builds a verse card from the source of truth, not client copy', async () => {
    const { resolveSocialShare } = await import('../server/operations/socialShareResolve');
    const snap = await resolveSocialShare(
      { kind: 'VERSE', sourceId: 'v1' },
      {
        entities: {
          BibleVerse: {
            findUnique: async () => ({
              id: 'v1',
              number: 16,
              text: 'Porque Deus amou o mundo de tal maneira',
              chapter: {
                number: 3,
                book: { id: 'joao', name: 'João', abbreviation: 'Jo' },
              },
            }),
          },
        },
      },
    );
    expect(snap.title).toBe('João 3:16');
    expect(snap.href).toBe('/app/bible?book=joao&chapter=3&verse=16');
    expect(snap.excerpt).toContain('Deus amou');
  });

  it('builds catechism and directory deep-links', async () => {
    const { resolveSocialShare } = await import('../server/operations/socialShareResolve');
    const cic = await resolveSocialShare(
      { kind: 'CATECHISM', sourceId: 'c1' },
      {
        entities: {
          CatechismEntry: {
            findUnique: async () => ({
              id: 'c1',
              number: 1210,
              question: 'O que é o Batismo?',
              answer: 'É o sacramento da nova vida.',
              category: 'sacramentos',
            }),
          },
        },
      },
    );
    expect(cic.title).toBe('CIC 1210');
    expect(cic.href).toBe('/app/catechism?entry=1210');

    const directory = await resolveSocialShare(
      { kind: 'DIRECTORY', sourceId: 'd1' },
      {
        entities: {
          DirectoryEntry: {
            findUnique: async () => ({
              id: 'd1',
              number: 42,
              title: 'A iniciação cristã',
              content: '<p>O Diretório descreve o caminho.</p>',
              part: 2,
            }),
          },
        },
      },
    );
    expect(directory.href).toBe('/app/directory?entry=42');
    expect(directory.excerpt).toContain('caminho');
  });
});
