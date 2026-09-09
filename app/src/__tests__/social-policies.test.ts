import { describe, expect, it } from 'vitest';
import {
  buildOgDescription,
  buildOgTitle,
  buildSocialSlug,
  isLinkPreviewCrawler,
  renderOgHtml,
  resolveInitialStatus,
  resolvePostKind,
  sanitizeSocialBody,
  slugifySocialTitle,
  validateSocialCommentDraft,
  validateSocialPostDraft,
} from '../server/operations/socialPolicies';
import { extractLinks, screenSocialText } from '../shared/socialModeration';

describe('slug', () => {
  it('strips accents and punctuation', () => {
    expect(slugifySocialTitle('Oração à Nossa Senhora Aparecida!')).toBe(
      'oracao-a-nossa-senhora-aparecida',
    );
  });

  it('falls back when the body has no usable characters', () => {
    expect(slugifySocialTitle('!!! ???')).toBe('publicacao');
    expect(slugifySocialTitle('')).toBe('publicacao');
  });

  it('appends the random suffix to keep slugs unique', () => {
    expect(buildSocialSlug('Encontro de catequese', 'a1b2c3')).toBe(
      'encontro-de-catequese-a1b2c3',
    );
  });

  it('never leaves a trailing dash before the suffix', () => {
    const slug = buildSocialSlug('a'.repeat(80), 'xyz');
    expect(slug).not.toContain('--');
  });
});

describe('sanitizeSocialBody', () => {
  it('removes markup and collapses whitespace', () => {
    expect(sanitizeSocialBody('<b>Paz</b>  e   <script>alert(1)</script>bem')).toBe(
      'Paz e alert(1)bem',
    );
  });

  it('caps blank lines at one', () => {
    expect(sanitizeSocialBody('linha\n\n\n\noutra')).toBe('linha\n\noutra');
  });
});

describe('resolvePostKind', () => {
  it('is TEXT without media', () => {
    expect(resolvePostKind([])).toBe('TEXT');
  });

  it('is IMAGE with images only', () => {
    expect(resolvePostKind([{ kind: 'IMAGE' }, { kind: 'IMAGE' }])).toBe('IMAGE');
  });

  it('is VIDEO when any video is present', () => {
    expect(resolvePostKind([{ kind: 'IMAGE' }, { kind: 'VIDEO' }])).toBe('VIDEO');
  });
});

describe('validateSocialPostDraft', () => {
  it('requires text or media', () => {
    expect(
      validateSocialPostDraft({ body: '   ', mediaCount: 0, mediaConsentAck: false }),
    ).toMatch(/Escreva algo|partilhe um conteúdo/);
  });

  it('requires the image-use acknowledgement when media is attached', () => {
    expect(
      validateSocialPostDraft({ body: 'Festa da turma', mediaCount: 1, mediaConsentAck: false }),
    ).toMatch(/autorização de uso de imagem/);
  });

  it('accepts a valid draft', () => {
    expect(
      validateSocialPostDraft({ body: 'Festa da turma', mediaCount: 1, mediaConsentAck: true }),
    ).toBeNull();
  });

  it('rejects an oversized body', () => {
    expect(
      validateSocialPostDraft({ body: 'a'.repeat(3001), mediaCount: 0, mediaConsentAck: false }),
    ).toMatch(/excede/);
  });
});

describe('validateSocialCommentDraft', () => {
  it('rejects empty comments', () => {
    expect(validateSocialCommentDraft('  ')).toMatch(/Escreva um comentário/);
  });

  it('accepts a normal comment', () => {
    expect(validateSocialCommentDraft('Amém!')).toBeNull();
  });
});

describe('moderation screening', () => {
  it('publishes ordinary pastoral text', () => {
    const result = resolveInitialStatus('Hoje celebramos a festa de São Francisco.');
    expect(result.status).toBe('PUBLISHED');
    expect(result.reasons).toEqual([]);
  });

  it('routes flagged terms to review, accents included', () => {
    expect(resolveInitialStatus('isso é pornografia').status).toBe('PENDING_REVIEW');
    expect(resolveInitialStatus('PORNÔ aqui').status).toBe('PENDING_REVIEW');
  });

  it('flags link spam', () => {
    const body = [
      'https://a.com',
      'https://b.com',
      'https://c.com',
      'https://d.com',
    ].join(' ');
    expect(screenSocialText(body).reasons).toContain('links');
    expect(extractLinks(body)).toHaveLength(4);
  });

  it('flags shouting', () => {
    expect(screenSocialText('COMPRE AGORA MESMO SEM DEMORA').reasons).toContain('shouting');
  });
});

describe('open graph', () => {
  it('truncates long descriptions with an ellipsis', () => {
    const description = buildOgDescription('a'.repeat(400));
    expect(description).toHaveLength(200);
    expect(description.endsWith('…')).toBe(true);
  });

  it('builds a title with the author name', () => {
    expect(buildOgTitle('Encontro de catequese', 'Maria')).toBe(
      'Encontro de catequese — Maria',
    );
  });

  it('falls back when the post has no text', () => {
    expect(buildOgTitle('', 'Maria')).toBe('Publicação de Maria');
    expect(buildOgTitle('', null)).toBe('Comunidade Catequese Viva');
  });

  it('escapes html in the rendered preview document', () => {
    const html = renderOgHtml(
      {
        title: 'Paz & "bem" <b>',
        description: 'desc',
        url: 'https://catechis.app/comunidade/p/abc',
        image: 'https://cdn.example/img.jpg',
      },
      '/comunidade/p/abc',
    );

    expect(html).toContain('Paz &amp; &quot;bem&quot; &lt;b&gt;');
    expect(html).not.toContain('<b>');
    expect(html).toContain('og:image');
    expect(html).toContain('summary_large_image');
  });

  it('detects link preview crawlers', () => {
    expect(isLinkPreviewCrawler('WhatsApp/2.23')).toBe(true);
    expect(isLinkPreviewCrawler('facebookexternalhit/1.1')).toBe(true);
    expect(isLinkPreviewCrawler('Mozilla/5.0 (Macintosh) Safari/605')).toBe(false);
    expect(isLinkPreviewCrawler(null)).toBe(false);
  });
});
