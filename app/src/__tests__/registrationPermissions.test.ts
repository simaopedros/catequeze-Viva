import { describe, expect, it } from 'vitest';
import { REGISTRATION_ACTIONS, canPerformRegistrationAction, resolveRegistrationAccess } from '../shared/registrationPermissions';

const expected: Record<string, string> = {
  PARISH_COORDINATOR: 'SSSSSSSSSSSSSSSSS',
  PARISH_PRIEST: 'SSSDDSSDS SSRDSDSS'.replace(/ /g, ''),
  PARISH_SECRETARY: 'DDSSSDDDDD DSSSDRN'.replace(/ /g, ''),
  COMMUNITY_COORDINATOR: 'DDSDDDDDDD DRDRDRN'.replace(/ /g, ''),
  LEAD_CATECHIST: 'NNSNNNPNNN NRNRNNN'.replace(/ /g, ''),
  ASSISTANT_CATECHIST: 'NNSNNNPNNN NRNRNNN'.replace(/ /g, ''),
  GUARDIAN: 'NNSPPNNNNN PPPPPNN'.replace(/ /g, ''),
  CATECHUMEN: 'NNSPPNNNNN PPPPPNN'.replace(/ /g, ''),
  DIOCESE_ADMIN: 'DDSDDDDDDN DDDSDSS'.replace(/ /g, ''),
};

describe('matriz de inscrições', () => {
  for (const [role, levels] of Object.entries(expected)) {
    it(role, () => {
      expect(levels).toHaveLength(REGISTRATION_ACTIONS.length);
      REGISTRATION_ACTIONS.forEach((action, index) => {
        expect(resolveRegistrationAccess(role, action)).toBe(levels[index]);
        expect(canPerformRegistrationAction(role, action)).toBe(levels[index] === 'S');
        expect(canPerformRegistrationAction(role, action, { hasGrant: true })).toBe(['S', 'D'].includes(levels[index]));
      });
    });
  }
  it('nega papéis e ações desconhecidos', () => {
    expect(canPerformRegistrationAction('UNKNOWN', 'REVIEW_REGISTRATION', { hasGrant: true })).toBe(false);
    expect(resolveRegistrationAccess('SUPER_ADMIN', 'UNKNOWN' as any)).toBe('N');
  });
});
