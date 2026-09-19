import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const opsSource = readFileSync(resolve(__dirname, '../server/api/mobileOperations.ts'), 'utf8');

const REQUIRED_ROUTES = [
  ['mobileCreateClass', 'POST', '/mobile/classes'],
  ['mobileUpdateClass', 'PUT', '/mobile/classes/:id'],
  ['mobileClassAttendanceMatrix', 'GET', '/mobile/classes/:id/attendance'],
  ['mobileClassPlan', 'GET', '/mobile/classes/:id/plan'],
  ['mobileClassChat', 'POST', '/mobile/classes/:id/chat'],
  ['mobileEnrollCatechumens', 'POST', '/mobile/classes/:id/enrollments'],
  ['mobileCancelEnrollment', 'DELETE', '/mobile/classes/:id/enrollments/:enrollmentId'],
  ['mobileAddClassCatechist', 'POST', '/mobile/classes/:id/catechists'],
  ['mobileRemoveClassCatechist', 'DELETE', '/mobile/classes/:id/catechists/:userId'],
  ['mobileCommunities', 'GET', '/mobile/communities'],
  ['mobileCatechists', 'GET', '/mobile/catechists'],
  ['mobileCreateMeeting', 'POST', '/mobile/meetings'],
  ['mobileUpdateMeeting', 'PUT', '/mobile/meetings/:id'],
  ['mobileDeleteMeeting', 'DELETE', '/mobile/meetings/:id'],
  ['mobileMeetingAttendanceSheet', 'GET', '/mobile/meetings/:id/sheet'],
  ['mobileMeetingAttendance', 'GET', '/mobile/meetings/:id/attendance'],
  ['mobileJustifyAbsenceByMeeting', 'POST', '/mobile/meetings/:id/justify'],
  ['mobileSaveAttendanceBatch', 'POST', '/mobile/attendance/batch'],
  ['mobileJustifyAbsence', 'POST', '/mobile/attendance/justify'],
  ['mobileCreateCatechumen', 'POST', '/mobile/catechumens'],
  ['mobileUpdateCatechumen', 'PUT', '/mobile/catechumens/:id'],
  ['mobileDeleteCatechumen', 'DELETE', '/mobile/catechumens/:id'],
  ['mobileCatechumenAttendanceReport', 'GET', '/mobile/catechumens/:id/attendance-report'],
  ['mobileCatechumenUploadToken', 'POST', '/mobile/catechumens/:id/upload-token'],
  ['mobileCreateFamily', 'POST', '/mobile/families'],
  ['mobileUpdateFamily', 'PUT', '/mobile/families/:id'],
  ['mobileAddGuardian', 'POST', '/mobile/families/:id/guardians'],
  ['mobileUpdateGuardian', 'PUT', '/mobile/families/:id/guardians/:guardianId'],
  ['mobileRemoveGuardian', 'DELETE', '/mobile/families/:id/guardians/:guardianId'],
  ['mobileConsents', 'GET', '/mobile/consents'],
  ['mobileSaveConsent', 'POST', '/mobile/consents'],
] as const;

const REUSED_OPERATIONS = [
  'createClass',
  'updateClass',
  'enrollCatechumen',
  'bulkEnrollCatechumens',
  'cancelEnrollment',
  'addAssistantCatechist',
  'removeCatechistFromClass',
  'getMonthlyPlan',
  'getOrCreateClassChat',
  'listCommunities',
  'listParishCatechists',
  'createMeeting',
  'updateMeeting',
  'deleteMeeting',
  'getMeetingAttendance',
  'getMeetingAttendanceSheet',
  'getClassAttendanceMatrix',
  'saveAttendanceBatch',
  'justifyAbsence',
  'justifyAbsenceByMeeting',
  'createCatechumen',
  'updateCatechumen',
  'deleteCatechumen',
  'getCatechumenAttendanceReport',
  'generateCatechumenUploadToken',
  'createHousehold',
  'updateHousehold',
  'addGuardianToHousehold',
  'updateGuardianProfile',
  'removeGuardianFromHousehold',
  'listConsents',
  'saveConsent',
];

describe('mobile operations API wiring (Fase B)', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobileOperations"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(opsSource).toContain(`export const ${fn}`);
  });

  it.each(REUSED_OPERATIONS)('reuses the shared %s operation', (operation) => {
    expect(opsSource).toMatch(new RegExp(`\\b${operation}\\b`));
  });

  it('every mobile operations api declares entities', () => {
    const blocks = waspSource.split('\napi ').filter((block) => block.includes('@src/server/api/mobileOperations'));
    expect(blocks.length).toBe(REQUIRED_ROUTES.length);
    for (const block of blocks) {
      expect(block).toMatch(/entities: \[[A-Za-z, ]+\]/);
    }
  });

  it('always verifies the mobile session before delegating', () => {
    const handlers = opsSource.match(/export const mobile\w+/g) ?? [];
    expect(handlers.length).toBe(REQUIRED_ROUTES.length);
    expect(opsSource).toContain('await requireMobileSessionVerification(opCtx)');
  });
});
