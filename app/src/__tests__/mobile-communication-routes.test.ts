import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const source = readFileSync(resolve(__dirname, '../server/api/mobileCommunication.ts'), 'utf8');

const REQUIRED_ROUTES = [
  ['mobileMarkConversationRead', 'POST', '/mobile/messages/:id/read'],
  ['mobileMuteConversation', 'POST', '/mobile/messages/:id/mute'],
  ['mobileRemoveConversationParticipant', 'DELETE', '/mobile/messages/:id/participants/:userId'],
  ['mobileDeleteSocialPost', 'DELETE', '/mobile/social/posts/:id'],
  ['mobileDeleteSocialComment', 'DELETE', '/mobile/social/comments/:id'],
  ['mobileRegisterSocialShare', 'POST', '/mobile/social/share'],
  ['mobileRecordSocialWatch', 'POST', '/mobile/social/watch'],
  ['mobileSocialFollowState', 'GET', '/mobile/social/follow-state'],
  ['mobileEncounterFocus', 'GET', '/mobile/dashboard/focus'],
  ['mobileAnnouncements', 'GET', '/mobile/announcements'],
  ['mobileAcknowledgeAnnouncement', 'POST', '/mobile/announcements/:id/ack'],
  ['mobileBirthdays', 'GET', '/mobile/birthdays'],
  ['mobileToggleBirthdayGift', 'POST', '/mobile/birthdays/gift'],
  ['mobileGlobalSearch', 'GET', '/mobile/search'],
] as const;

const REUSED_OPERATIONS = [
  'markConversationRead',
  'muteConversation',
  'removeConversationParticipant',
  'deleteSocialPost',
  'deleteSocialComment',
  'registerSocialShare',
  'recordSocialWatch',
  'getSocialFollowState',
  'getEncounterFocus',
  'listPastoralAnnouncements',
  'acknowledgePastoralAnnouncement',
  'listUpcomingBirthdays',
  'toggleBirthdayGift',
  'globalSearch',
];

describe('mobile communication API wiring (Fase C)', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobileCommunication"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(source).toContain(`export const ${fn}`);
  });

  it.each(REUSED_OPERATIONS)('reuses the shared %s operation', (operation) => {
    expect(source).toMatch(new RegExp(`\\b${operation}\\b`));
  });

  it('declares entities on every communication api and verifies the mobile session', () => {
    const blocks = waspSource.split('\napi ').filter((block) => block.includes('@src/server/api/mobileCommunication'));
    expect(blocks.length).toBe(REQUIRED_ROUTES.length);
    for (const block of blocks) expect(block).toMatch(/entities: \[[A-Za-z, ]+\]/);
    expect(source).toContain('await requireMobileSessionVerification(opCtx)');
  });
});
