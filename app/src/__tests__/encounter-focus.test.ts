/**
 * encounter-focus.test.ts — PR3: pickFocusMeeting + buildPrimaryCta
 */
import { describe, it, expect } from 'vitest';
import {
  pickFocusMeeting,
  buildPrimaryCta,
  startOfDay,
  endOfDay,
} from '../shared/encounter';

function m(
  partial: Partial<{
    id: string;
    date: Date;
    status: string;
    contentId: string | null;
  }>,
) {
  return {
    id: partial.id || 'm1',
    title: 'T',
    date: partial.date || new Date(),
    status: partial.status || 'NOT_STARTED',
    contentId: partial.contentId ?? null,
  };
}

describe('pickFocusMeeting', () => {
  const now = new Date('2026-06-15T12:00:00');

  it('prefers IN_PROGRESS over today', () => {
    const today = new Date(now);
    today.setHours(18, 0, 0, 0);
    const inProg = new Date(now);
    inProg.setDate(inProg.getDate() + 1);
    const picked = pickFocusMeeting(
      [
        m({ id: 'today', date: today, status: 'NOT_STARTED' }),
        m({ id: 'ip', date: inProg, status: 'IN_PROGRESS' }),
      ],
      now,
    );
    expect(picked?.meeting.id).toBe('ip');
    expect(picked?.focusKind).toBe('in_progress');
  });

  it('picks today before upcoming', () => {
    const today = new Date(now);
    today.setHours(19, 0, 0, 0);
    const next = new Date(now);
    next.setDate(next.getDate() + 2);
    const picked = pickFocusMeeting(
      [
        m({ id: 'up', date: next, status: 'NOT_STARTED' }),
        m({ id: 'td', date: today, status: 'NOT_STARTED' }),
      ],
      now,
    );
    expect(picked?.meeting.id).toBe('td');
    expect(picked?.focusKind).toBe('today');
  });

  it('picks earliest upcoming after end of day', () => {
    const a = new Date(now);
    a.setDate(a.getDate() + 3);
    const b = new Date(now);
    b.setDate(b.getDate() + 1);
    const picked = pickFocusMeeting(
      [m({ id: 'a', date: a }), m({ id: 'b', date: b })],
      now,
    );
    expect(picked?.meeting.id).toBe('b');
    expect(picked?.focusKind).toBe('upcoming');
  });

  it('picks most recent past when nothing upcoming', () => {
    const older = new Date(now);
    older.setDate(older.getDate() - 10);
    const newer = new Date(now);
    newer.setDate(newer.getDate() - 1);
    const picked = pickFocusMeeting(
      [
        m({ id: 'old', date: older, status: 'COMPLETED' }),
        m({ id: 'new', date: newer, status: 'COMPLETED' }),
      ],
      now,
    );
    expect(picked?.meeting.id).toBe('new');
    expect(picked?.focusKind).toBe('recent');
  });

  it('ignores CANCELLED', () => {
    const today = new Date(now);
    today.setHours(10, 0, 0, 0);
    const picked = pickFocusMeeting(
      [m({ id: 'c', date: today, status: 'CANCELLED' })],
      now,
    );
    expect(picked).toBeNull();
  });

  it('startOfDay/endOfDay bound today window', () => {
    const s = startOfDay(now);
    const e = endOfDay(now);
    expect(s.getHours()).toBe(0);
    expect(e.getHours()).toBe(23);
  });
});

describe('buildPrimaryCta', () => {
  it('staff PREPARE without content', () => {
    const cta = buildPrimaryCta({
      role: 'staff',
      focusKind: 'today',
      meeting: {
        id: 'm1',
        status: 'NOT_STARTED',
        classId: 'c1',
        hasContent: false,
      },
    });
    expect(cta.action).toBe('PREPARE');
    expect(cta.href).toBe('/app/meetings/m1');
  });

  it('staff START with content', () => {
    const cta = buildPrimaryCta({
      role: 'staff',
      focusKind: 'today',
      meeting: {
        id: 'm1',
        status: 'NOT_STARTED',
        classId: 'c1',
        hasContent: true,
      },
    });
    expect(cta.action).toBe('START');
  });

  it('staff CONTINUE_ATTENDANCE when in progress incomplete', () => {
    const cta = buildPrimaryCta({
      role: 'staff',
      focusKind: 'in_progress',
      meeting: {
        id: 'm1',
        status: 'IN_PROGRESS',
        classId: 'c1',
        hasContent: true,
      },
      attendance: { registered: 5, totalActive: 20 },
    });
    expect(cta.action).toBe('CONTINUE_ATTENDANCE');
    expect(cta.href).toContain('/attendance');
  });

  it('staff COMPLETE when all registered', () => {
    const cta = buildPrimaryCta({
      role: 'staff',
      focusKind: 'in_progress',
      meeting: {
        id: 'm1',
        status: 'IN_PROGRESS',
        classId: 'c1',
        hasContent: true,
      },
      attendance: { registered: 20, totalActive: 20 },
    });
    expect(cta.action).toBe('COMPLETE');
  });

  it('guardian JUSTIFY with absent', () => {
    const cta = buildPrimaryCta({
      role: 'guardian',
      focusKind: 'today',
      meeting: {
        id: 'm1',
        status: 'COMPLETED',
        classId: 'c1',
        hasContent: false,
      },
      attendance: { registered: 1, totalActive: 1, myStatus: 'ABSENT' },
      dependentId: 'd1',
    });
    expect(cta.action).toBe('JUSTIFY');
    expect(cta.href).toContain('action=justify');
    expect(cta.href).toContain('dependentId=d1');
  });

  it('catechumen always VIEW', () => {
    const cta = buildPrimaryCta({
      role: 'catechumen',
      focusKind: 'upcoming',
      meeting: {
        id: 'm1',
        status: 'NOT_STARTED',
        classId: 'c1',
        hasContent: true,
      },
    });
    expect(cta.action).toBe('VIEW');
  });

  it('empty meeting NONE', () => {
    const cta = buildPrimaryCta({
      role: 'staff',
      focusKind: 'none',
      meeting: null,
    });
    expect(cta.action).toBe('NONE');
  });
});
