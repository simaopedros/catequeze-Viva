import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const source = readFileSync(resolve(__dirname, '../server/api/mobileManagement.ts'), 'utf8');

const REQUIRED_ROUTES = [
  ['mobileTeam', 'GET', '/mobile/team'],
  ['mobileTeamInvite', 'POST', '/mobile/team/invite'],
  ['mobileTeamResendInvite', 'POST', '/mobile/team/invite/resend'],
  ['mobileTeamCancelInvite', 'POST', '/mobile/team/invite/cancel'],
  ['mobileTeamRemoveMember', 'DELETE', '/mobile/team/members/:membershipId'],
  ['mobileTeamUpdateRole', 'PUT', '/mobile/team/members/:membershipId/role'],
  ['mobileTeamSetCoordinatorClasses', 'PUT', '/mobile/team/members/:membershipId/classes'],
  ['mobileFamilyInvites', 'GET', '/mobile/team/family-invites'],
  ['mobileAcceptInvitation', 'POST', '/mobile/invitations/accept'],
  ['mobileReportsOverview', 'GET', '/mobile/reports/overview'],
  ['mobileClassReport', 'GET', '/mobile/reports/classes/:id'],
  ['mobileUpdateProfile', 'PUT', '/mobile/profile'],
  ['mobileChangePassword', 'POST', '/mobile/profile/password'],
  ['mobileEmailPreferences', 'GET', '/mobile/profile/email-preferences'],
  ['mobileUpdateEmailPreference', 'POST', '/mobile/profile/email-preferences'],
  ['mobileRequestDataExport', 'POST', '/mobile/profile/data-export'],
  ['mobileTwoFactorStatusDetails', 'GET', '/mobile/profile/two-factor'],
  ['mobileTwoFactorStart', 'POST', '/mobile/profile/two-factor/start'],
  ['mobileTwoFactorVerifySetup', 'POST', '/mobile/profile/two-factor/verify'],
  ['mobileTwoFactorDisable', 'POST', '/mobile/profile/two-factor/disable'],
  ['mobilePastoralGroups', 'GET', '/mobile/groups'],
  ['mobileFormationTracks', 'GET', '/mobile/formation'],
  ['mobileSacramentalJourneys', 'GET', '/mobile/sacraments'],
  ['mobileSacramentalJourney', 'GET', '/mobile/sacraments/:id'],
  ['mobileSupportMessages', 'GET', '/mobile/support'],
] as const;

const REUSED_OPERATIONS = [
  'getParishTeam',
  'inviteUserToParish',
  'resendInvitation',
  'cancelInvitation',
  'removeMembership',
  'updateMembershipRole',
  'setCoordinatorClasses',
  'listFamilyPortalInvitations',
  'acceptInvitation',
  'getReportsOverview',
  'getClassPastoralReport',
  'updateUserProfile',
  'changePassword',
  'getMyEmailPreferences',
  'updateMyEmailPreferences',
  'requestDataExport',
  'getTwoFactorStatus',
  'startTwoFactorSetup',
  'verifyTwoFactorSetup',
  'disableTwoFactor',
  'listPastoralGroups',
  'listFormationTracks',
  'listSacramentalJourneys',
  'getSacramentalJourney',
  'getMySupportMessages',
];

describe('mobile management API wiring (Fase E)', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobileManagement"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(source).toContain(`export const ${fn}`);
  });

  it.each(REUSED_OPERATIONS)('reuses the shared %s operation', (operation) => {
    expect(source).toMatch(new RegExp(`\\b${operation}\\b`));
  });

  it('declares entities on every management api and verifies the mobile session by default', () => {
    const blocks = waspSource.split('\napi ').filter((block) => block.includes('@src/server/api/mobileManagement'));
    expect(blocks.length).toBe(REQUIRED_ROUTES.length);
    for (const block of blocks) expect(block).toMatch(/entities: \[[A-Za-z, ]+\]/);
    expect(source).toContain('if (!options.skipVerification) await requireMobileSessionVerification(opCtx)');
  });

  it('lets the 2FA status be read before the session is verified', () => {
    expect(source).toMatch(/mobileTwoFactorStatusDetails = mobileOp\(getTwoFactorStatus, [^,]+, \{ skipVerification: true \}\)/);
  });
});
