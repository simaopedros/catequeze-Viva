import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const crudSource = readFileSync(resolve(__dirname, '../server/api/mobileCrud.ts'), 'utf8');

const REQUIRED_ROUTES = [
  ['mobileCreateClass', 'POST', '/mobile/classes'],
  ['mobileUpdateClass', 'POST', '/mobile/classes/:id'],
  ['mobileArchiveClass', 'POST', '/mobile/classes/:id/archive'],
  ['mobileEnrollCatechumen', 'POST', '/mobile/classes/:id/enroll'],
  ['mobileCreateMeeting', 'POST', '/mobile/meetings'],
  ['mobileUpdateMeeting', 'POST', '/mobile/meetings/:id'],
  ['mobileDeleteMeeting', 'POST', '/mobile/meetings/:id/delete'],
  ['mobileCreateCalendarEvent', 'POST', '/mobile/calendar'],
  ['mobileDeleteCalendarEvent', 'POST', '/mobile/calendar/:id/delete'],
  ['mobileCreateConversation', 'POST', '/mobile/conversations'],
  ['mobileCreateAnnouncement', 'POST', '/mobile/announcements'],
  ['mobilePublishAnnouncement', 'POST', '/mobile/announcements/:id/publish'],
  ['mobileCreateGroup', 'POST', '/mobile/groups'],
  ['mobileJoinGroup', 'POST', '/mobile/groups/:id/join'],
  ['mobileCreateCatechumen', 'POST', '/mobile/catechumens'],
  ['mobileUpdateCatechumen', 'POST', '/mobile/catechumens/:id'],
  ['mobileDeleteCatechumen', 'POST', '/mobile/catechumens/:id/delete'],
  ['mobileCreateHousehold', 'POST', '/mobile/families'],
  ['mobileUpdateHousehold', 'POST', '/mobile/families/:id'],
  ['mobileInviteUser', 'POST', '/mobile/team/invite'],
  ['mobileUpdateMembershipRole', 'POST', '/mobile/team/:id/role'],
  ['mobileCreateFamilyInvite', 'POST', '/mobile/family-invites'],
  ['mobileVerifyDocument', 'POST', '/mobile/documents/:id/verify'],
  ['mobileCreateContent', 'POST', '/mobile/content'],
  ['mobileUpdateContent', 'POST', '/mobile/content/:id'],
  ['mobileCreateSacrament', 'POST', '/mobile/sacraments'],
  ['mobileUpdateSacrament', 'POST', '/mobile/sacraments/:id'],
  ['mobileUpdateMilestone', 'POST', '/mobile/sacraments/milestones/:id'],
  ['mobileCreateFormation', 'POST', '/mobile/formation'],
  ['mobileUpdateFormation', 'POST', '/mobile/formation/:id'],
  ['mobileDeleteFormation', 'POST', '/mobile/formation/:id/delete'],
  ['mobileCreateParish', 'POST', '/mobile/parishes'],
  ['mobileUpdateParish', 'POST', '/mobile/parishes/:id'],
  ['mobileDeleteParish', 'POST', '/mobile/parishes/:id/delete'],
  ['mobileExportReports', 'POST', '/mobile/reports/export'],
] as const;

describe('mobile pastoral CRUD API wiring', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobileCrud"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(crudSource).toContain(`export async function ${fn}`);
  });

  it('reuses Wasp operations instead of parallel Prisma writes', () => {
    expect(crudSource).toContain("from '../operations/classOperations'");
    expect(crudSource).toContain("from '../operations/meetingOperations'");
    expect(crudSource).toContain("from '../operations/calendarOperations'");
    expect(crudSource).toContain("from '../operations/conversationOperations'");
    expect(crudSource).toContain("from '../operations/pastoralAnnouncementOperations'");
    expect(crudSource).toContain("from '../operations/pastoralGroupOperations'");
    expect(crudSource).toContain("from '../operations/catechumenOperations'");
    expect(crudSource).toContain("from '../operations/familyOperations'");
    expect(crudSource).toContain("from '../operations/memberOperations'");
    expect(crudSource).toContain("from '../operations/documentOperations'");
    expect(crudSource).toContain("from '../operations/contentOperations'");
    expect(crudSource).toContain("from '../operations/sacramentOperations'");
    expect(crudSource).toContain("from '../operations/formationOperations'");
    expect(crudSource).toContain("from '../operations/parishOperations'");
    expect(crudSource).toContain('assertTwoFactorSessionVerified');
    expect(crudSource).toContain('UserTwoFactor:');
    expect(crudSource).toContain('enrollCatechumen({ classId, catechumenProfileId }');
    expect(crudSource).toContain('updateMembershipRole({ membershipId, role, communityId }');
  });
});
