import {
  collectAttendanceChanges,
  cycleAttendanceStatus,
  fromApiAttendanceStatus,
  toApiAttendanceStatus,
} from '../meetings/attendancePresentation';

describe('attendancePresentation', () => {
  it('maps JUSTIFIED to EXCUSED in UI', () => {
    expect(fromApiAttendanceStatus('JUSTIFIED')).toBe('EXCUSED');
    expect(toApiAttendanceStatus('EXCUSED')).toBe('JUSTIFIED');
  });

  it('cycles status in mock order', () => {
    expect(cycleAttendanceStatus('PRESENT')).toBe('LATE');
    expect(cycleAttendanceStatus('LATE')).toBe('ABSENT');
    expect(cycleAttendanceStatus('ABSENT')).toBe('EXCUSED');
  });

  it('collects only changed rows', () => {
    const participants = [
      { id: 'a', name: 'Ana', serverStatus: 'PRESENT' as const },
      { id: 'b', name: 'Bruno', serverStatus: 'PRESENT' as const },
    ];
    const changes = collectAttendanceChanges(participants, { b: 'ABSENT' });
    expect(changes).toEqual([{ catechumenProfileId: 'b', status: 'ABSENT' }]);
  });
});
