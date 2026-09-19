import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const mobileSource = readFileSync(resolve(__dirname, '../server/api/mobile.ts'), 'utf8');

const REQUIRED_ROUTES = [
  ['mobileConversationContacts', 'GET', '/mobile/messages/contacts'],
  ['mobileCreateConversation', 'POST', '/mobile/messages/conversations'],
] as const;

describe('mobile messages API wiring', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobile"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(mobileSource).toContain(`export async function ${fn}`);
  });

  it('declares the contacts route before the :id catch-all', () => {
    const contactsIndex = waspSource.indexOf('api mobileConversationContacts');
    const detailsIndex = waspSource.indexOf('api mobileConversationDetails');
    expect(contactsIndex).toBeGreaterThan(-1);
    expect(detailsIndex).toBeGreaterThan(-1);
    expect(contactsIndex).toBeLessThan(detailsIndex);
  });

  it('reuses the shared conversation operations', () => {
    expect(mobileSource).toContain('createConversation');
    expect(mobileSource).toContain('getContactsForConversation');
  });

  it('resolves family details through the dedicated getHousehold operation', () => {
    expect(mobileSource).toContain('getHousehold');
  });
});
