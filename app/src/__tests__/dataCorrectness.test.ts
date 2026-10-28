import { describe, expect, it } from 'vitest';
import { attendanceRateFromTotals, attendanceRateDisplay } from '../shared/attendanceMetrics';
import { attendanceExportProfiles } from '../shared/attendanceExport';
import { buildNextActions } from '../shared/dashboardActions';

describe('attendance correctness', () => {
  it('weights records instead of averaging class percentages', () => {
    const classes = [{ attended: 1, total: 1 }, { attended: 0, total: 9 }];
    expect(attendanceRateFromTotals(classes.reduce((s, c) => s + c.attended, 0), classes.reduce((s, c) => s + c.total, 0))).toBe(10);
  });
  it('distinguishes no roll calls from all absences', () => {
    expect(attendanceRateDisplay(0, 0, 'Sem chamadas registradas')).toBe('Sem chamadas registradas');
    expect(attendanceRateDisplay(0, 9, 'Sem chamadas registradas')).toBe('0%');
  });
  it('omits impossible attendance action for an empty class', () => {
    const pending = { id: 'm', date: new Date(), class: { id: 'c', name: 'Turma' }, enrollmentCount: 0 };
    expect(buildNextActions({ pendingAttendanceMeeting: pending }, null).some(a => a.id === 'register_attendance')).toBe(false);
    expect(buildNextActions({ pendingAttendanceMeeting: { ...pending, enrollmentCount: 1 } }, null).some(a => a.id === 'register_attendance')).toBe(true);
  });
  it('includes historical participants only from supplied class attendance and deduplicates', () => {
    const current = { id: 'current' }, historical = { id: 'historical' };
    expect(attendanceExportProfiles([{ catechumenProfile: current }], [{ attendance: [
      { catechumenProfile: current }, { catechumenProfile: historical }, { catechumenProfile: historical },
    ] }])).toEqual([current, historical]);
    expect(attendanceExportProfiles([], [])).toEqual([]);
  });
});
