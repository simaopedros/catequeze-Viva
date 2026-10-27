import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('auth touch targets (≥44px)', () => {
  it('enlarges show-password, locale, and invalid-invite controls', () => {
    const login = readFileSync(
      resolve(__dirname, '../auth/CustomLoginForm.tsx'),
      'utf8',
    );
    expect(login).toMatch(/min-h-11[\s\S]*aria_show_password|aria_show_password[\s\S]*min-h-11/);

    const layout = readFileSync(
      resolve(__dirname, '../auth/AuthPageLayout.tsx'),
      'utf8',
    );
    expect(layout).toContain('min-h-11 min-w-11');
    expect(layout).toContain('LOCALE_SHORT');

    const invite = readFileSync(
      resolve(__dirname, '../catequese/pages/family/InviteAcceptPage.tsx'),
      'utf8',
    );
    expect(invite).toContain('invite.enter_code_instead');
    expect(invite).toMatch(/enter_code_instead[\s\S]{0,200}min-h-11|min-h-11[\s\S]{0,200}enter_code_instead/);
    expect(invite).toMatch(/back_home[\s\S]{0,200}min-h-11|min-h-11[\s\S]{0,200}back_home/);
  });
});
