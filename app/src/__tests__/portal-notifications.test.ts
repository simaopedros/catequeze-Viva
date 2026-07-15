import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPortalNotification,
  createPortalNotificationsMany,
  notifyPortalInviteCreated,
  notifyPortalInviteAccepted,
  notifyPortalInviteExpired,
  notifyMeetingChange,
  notifyDocumentPendingReview,
  notifyDocumentDecision,
  notifyJustificationSubmitted,
  notifyJustificationResponse,
  notifyMinorConsentRequested,
  __test__,
} from '../server/operations/portalNotifications';

function mockContext(overrides: any = {}) {
  const created: any[] = [];
  const Notification = {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn(async ({ data }: any) => {
      created.push(data);
      return { id: `n-${created.length}`, ...data };
    }),
    createMany: vi.fn(),
  };
  const User = {
    findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
      if (where.email === 'exists@example.com' || where.id === 'u-exists') {
        return { id: 'u-exists', locale: 'pt-BR', email: 'exists@example.com' };
      }
      if (where.id === 'u-staff') return { id: 'u-staff', locale: 'en' };
      if (where.id === 'u-g1') return { id: 'u-g1', locale: 'es' };
      return null;
    }),
  };
  const CatechesisClass = {
    findUnique: vi.fn().mockResolvedValue({
      catechists: [{ userId: 'u-ct' }],
      enrollments: [
        {
          catechumenProfile: {
            userId: 'u-cat',
            household: { guardians: [{ userId: 'u-g1' }, { userId: null }] },
          },
        },
      ],
    }),
  };
  const Membership = {
    findMany: vi.fn().mockResolvedValue([{ userId: 'u-staff' }, { userId: 'u-coord' }]),
  };
  const CatechumenProfile = {
    findUnique: vi.fn().mockResolvedValue({
      userId: 'u-cat',
      householdId: 'hh1',
      parishId: 'p1',
      household: {
        parishId: 'p1',
        guardians: [{ userId: 'u-g1' }],
      },
    }),
  };
  const GuardianProfile = {
    findMany: vi.fn().mockResolvedValue([{ userId: 'u-g1' }, { userId: 'u-g2' }]),
  };
  const ClassCatechist = {
    findMany: vi.fn().mockResolvedValue([{ userId: 'u-ct' }]),
  };

  return {
    created,
    context: {
      entities: {
        Notification,
        User,
        CatechesisClass,
        Membership,
        CatechumenProfile,
        GuardianProfile,
        ClassCatechist,
        ...overrides.entities,
      },
    },
    Notification,
  };
}

describe('portalNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPortalNotification writes SYSTEM/ATTENDANCE/DOCUMENT rows', async () => {
    const { context, created, Notification } = mockContext();
    await createPortalNotification(context, {
      userId: 'u1',
      type: 'SYSTEM',
      title: 'Hello',
      body: 'World',
      entityType: 'TEST',
      entityId: '1',
    });
    expect(Notification.create).toHaveBeenCalledTimes(1);
    expect(created[0]).toMatchObject({
      userId: 'u1',
      type: 'SYSTEM',
      title: 'Hello',
      body: 'World',
      entityType: 'TEST',
      entityId: '1',
    });
  });

  it('skips duplicate unread entity notifications', async () => {
    const { context, Notification } = mockContext();
    Notification.findFirst.mockResolvedValueOnce({ id: 'existing' });
    await createPortalNotification(context, {
      userId: 'u1',
      type: 'SYSTEM',
      title: 'Dup',
      entityType: 'X',
      entityId: 'y',
    });
    expect(Notification.create).not.toHaveBeenCalled();
  });

  it('notifyPortalInviteCreated only when user account exists', async () => {
    const { context, Notification } = mockContext();
    await notifyPortalInviteCreated(context, {
      invitationId: 'inv1',
      emailNormalized: 'exists@example.com',
      parishName: 'Paróquia Teste',
      roleLabel: 'Responsável',
    });
    expect(Notification.create).toHaveBeenCalled();
    expect(Notification.create.mock.calls[0][0].data.entityType).toBe(
      'PORTAL_INVITE_CREATED',
    );

    Notification.create.mockClear();
    await notifyPortalInviteCreated(context, {
      invitationId: 'inv2',
      emailNormalized: 'nope@example.com',
      parishName: 'X',
      roleLabel: 'Y',
    });
    expect(Notification.create).not.toHaveBeenCalled();
  });

  it('notifyPortalInviteAccepted notifies inviter', async () => {
    const { context, Notification } = mockContext();
    await notifyPortalInviteAccepted(context, {
      invitationId: 'inv1',
      invitedById: 'u-staff',
      acceptorName: 'Maria',
      roleLabel: 'Guardian',
    });
    expect(Notification.create).toHaveBeenCalled();
    const data = Notification.create.mock.calls[0][0].data;
    expect(data.userId).toBe('u-staff');
    expect(data.entityType).toBe('PORTAL_INVITE_ACCEPTED');
    // en locale title
    expect(data.title).toMatch(/Invitation accepted|Convite aceite/i);
  });

  it('notifyPortalInviteExpired targets inviter and existing email user', async () => {
    const { context, Notification } = mockContext();
    await notifyPortalInviteExpired(context, {
      invitationId: 'inv-x',
      invitedById: 'u-staff',
      emailNormalized: 'exists@example.com',
      parishName: 'Paróquia',
    });
    expect(Notification.create.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('notifyMeetingChange notifies family and catechists (not actor)', async () => {
    const { context, Notification } = mockContext();
    await notifyMeetingChange(context, {
      meetingId: 'm1',
      classId: 'c1',
      title: 'Primeiro encontro',
      date: new Date('2026-08-01'),
      cancelled: true,
      actorUserId: 'u-ct',
    });
    const userIds = Notification.create.mock.calls.map((c: any) => c[0].data.userId);
    expect(userIds).not.toContain('u-ct');
    expect(userIds).toEqual(expect.arrayContaining(['u-g1', 'u-cat']));
    expect(Notification.create.mock.calls[0][0].data.entityType).toBe(
      'MEETING_CANCELLED',
    );
  });

  it('notifyDocumentPendingReview notifies staff memberships', async () => {
    const { context, Notification } = mockContext();
    await notifyDocumentPendingReview(context, {
      documentId: 'd1',
      documentName: 'Certidão',
      parishId: 'p1',
    });
    expect(Notification.create.mock.calls.length).toBe(2);
    expect(Notification.create.mock.calls[0][0].data.type).toBe('DOCUMENT');
  });

  it('notifyDocumentDecision reaches guardians', async () => {
    const { context, Notification } = mockContext();
    await notifyDocumentDecision(context, {
      documentId: 'd2',
      documentName: 'Batismo',
      decision: 'REJECTED',
      reason: 'Ilegível',
      uploadedById: 'u-up',
      catechumenProfileId: 'cp1',
    });
    const userIds = Notification.create.mock.calls.map((c: any) => c[0].data.userId);
    expect(userIds).toEqual(expect.arrayContaining(['u-up', 'u-cat', 'u-g1']));
  });

  it('notifyJustificationSubmitted notifies catechists', async () => {
    const { context, Notification } = mockContext();
    await notifyJustificationSubmitted(context, {
      attendanceId: 'a1',
      meetingId: 'm1',
      classId: 'c1',
      meetingTitle: 'Encontro 2',
      whoName: 'João',
      actorUserId: 'u-g1',
    });
    expect(Notification.create).toHaveBeenCalled();
    expect(Notification.create.mock.calls[0][0].data.userId).toBe('u-ct');
    expect(Notification.create.mock.calls[0][0].data.entityType).toBe(
      'JUSTIFICATION_SUBMITTED',
    );
  });

  it('notifyJustificationResponse notifies family', async () => {
    const { context, Notification } = mockContext();
    await notifyJustificationResponse(context, {
      attendanceId: 'a2',
      meetingId: 'm1',
      meetingTitle: 'Encontro 2',
      status: 'JUSTIFIED',
      catechumenProfileId: 'cp1',
      actorUserId: 'u-ct',
    });
    const userIds = Notification.create.mock.calls.map((c: any) => c[0].data.userId);
    expect(userIds).toEqual(expect.arrayContaining(['u-cat', 'u-g1']));
  });

  it('notifyMinorConsentRequested notifies linked guardians', async () => {
    const { context, Notification } = mockContext();
    await notifyMinorConsentRequested(context, {
      catechumenProfileId: 'cp1',
      catechumenName: 'Ana',
      householdId: 'hh1',
    });
    const userIds = Notification.create.mock.calls.map((c: any) => c[0].data.userId);
    expect(userIds).toEqual(expect.arrayContaining(['u-g1', 'u-g2']));
    expect(Notification.create.mock.calls[0][0].data.link).toBe('/app/consents');
  });

  it('createPortalNotificationsMany de-dupes by user+entity', async () => {
    const { context, Notification } = mockContext();
    await createPortalNotificationsMany(context, [
      { userId: 'u1', type: 'SYSTEM', title: 'A', entityType: 'E', entityId: '1' },
      { userId: 'u1', type: 'SYSTEM', title: 'A', entityType: 'E', entityId: '1' },
      { userId: 'u2', type: 'SYSTEM', title: 'B' },
    ]);
    expect(Notification.create).toHaveBeenCalledTimes(2);
  });

  it('copy helpers cover all locales', () => {
    for (const loc of ['pt-BR', 'en', 'es'] as const) {
      const c = __test__.copyFor(loc);
      expect(c.inviteCreated('P', 'R').title).toBeTruthy();
      expect(c.meetingCancelled('M').body).toContain('M');
      expect(c.minorConsent('X').link || c.minorConsent('X').body).toBeTruthy();
    }
  });

  it('never throws when Notification entity missing', async () => {
    await expect(
      createPortalNotification({ entities: {} }, {
        userId: 'u1',
        type: 'SYSTEM',
        title: 'x',
      }),
    ).resolves.toBeUndefined();
  });
});
