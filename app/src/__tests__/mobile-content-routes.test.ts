import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const source = readFileSync(resolve(__dirname, '../server/api/mobileContent.ts'), 'utf8');

const REQUIRED_ROUTES = [
  ['mobileBibleSearch', 'GET', '/mobile/bible/search'],
  ['mobileCatechismSearch', 'GET', '/mobile/catechism/search'],
  ['mobileCatechismCategory', 'GET', '/mobile/catechism/category/:category'],
  ['mobileCatechismEntry', 'GET', '/mobile/catechism/entries/:number'],
  ['mobileDirectorySearch', 'GET', '/mobile/directory/search'],
  ['mobileDirectoryPart', 'GET', '/mobile/directory/part/:part'],
  ['mobileDirectoryEntry', 'GET', '/mobile/directory/entries/:number'],
  ['mobileContentList', 'GET', '/mobile/content'],
  ['mobileContentCreate', 'POST', '/mobile/content'],
  ['mobileContentDetails', 'GET', '/mobile/content/:id'],
  ['mobileContentUpdate', 'PUT', '/mobile/content/:id'],
  ['mobileContentStatus', 'POST', '/mobile/content/:id/status'],
  ['mobileCalendarEvents', 'GET', '/mobile/calendar/events'],
  ['mobileCalendarCreateEvent', 'POST', '/mobile/calendar/events'],
  ['mobileDocumentVerify', 'POST', '/mobile/documents/:id/verify'],
  ['mobileDocumentReject', 'POST', '/mobile/documents/:id/reject'],
  ['mobileDocumentDelete', 'DELETE', '/mobile/documents/:id'],
  ['mobileAnnouncementCreate', 'POST', '/mobile/announcements'],
  ['mobileAnnouncementPublish', 'POST', '/mobile/announcements/:id/publish'],
] as const;

const REUSED_OPERATIONS = [
  'searchBible',
  'searchCatechism',
  'listCatechismByCategory',
  'getCatechismEntry',
  'searchDirectory',
  'listDirectoryByPart',
  'getDirectoryEntry',
  'listContentItems',
  'getContentItem',
  'listActivitiesByContent',
  'createContentItem',
  'updateContentItem',
  'updateContentStatus',
  'listLiturgicalEvents',
  'createLiturgicalEvent',
  'verifyDocument',
  'rejectDocument',
  'deleteDocument',
  'createPastoralAnnouncement',
  'publishPastoralAnnouncement',
];

describe('mobile content API wiring (Fase D)', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobileContent"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(source).toContain(`export const ${fn}`);
  });

  it.each(REUSED_OPERATIONS)('reuses the shared %s operation', (operation) => {
    expect(source).toMatch(new RegExp(`\\b${operation}\\b`));
  });

  it('declares the bible search route before the book catch-all', () => {
    expect(waspSource.indexOf('api mobileBibleSearch')).toBeLessThan(waspSource.indexOf('api mobileBibleBook '));
  });

  it('declares entities on every content api and verifies the mobile session', () => {
    const blocks = waspSource.split('\napi ').filter((block) => block.includes('@src/server/api/mobileContent'));
    expect(blocks.length).toBe(REQUIRED_ROUTES.length);
    for (const block of blocks) expect(block).toMatch(/entities: \[[A-Za-z, ]+\]/);
    expect(source).toContain('await requireMobileSessionVerification(opCtx)');
  });
});
