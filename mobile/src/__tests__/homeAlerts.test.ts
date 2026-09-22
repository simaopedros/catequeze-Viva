import { buildHomeAlertItems, mapAniversarianteToAlert } from '../home/homeAlerts';

describe('homeAlerts', () => {
  it('maps API aniversariantes with first and last name', () => {
    const alert = mapAniversarianteToAlert({
      id: 'c1',
      firstName: 'Maria',
      lastName: 'Silva',
      birthDate: '2012-09-22T00:00:00.000Z',
    });
    expect(alert.message).toBe('Aniversário: Maria Silva');
    expect(alert.meta).toMatch(/dia|Hoje/);
  });

  it('merges dashboard alerts, roll call and birthdays without duplicates', () => {
    const items = buildHomeAlertItems(
      {
        recentAlerts: [{ type: 'warning', message: 'Presença média abaixo de 50%.' }],
        openRollCallIncomplete: true,
        pendingAttendanceMeeting: {
          id: 'm-pending',
          class: { name: 'Turma 2A' },
        },
        aniversariantes: [{ firstName: 'João', birthDate: '2010-03-01T00:00:00.000Z' }],
      },
      { attendanceMeetingId: 'm-live' },
    );

    expect(items.some((i) => i.message.includes('Chamada em curso'))).toBe(true);
    expect(items.find((i) => i.meetingId === 'm-pending')).toBeTruthy();
    expect(items.find((i) => i.message.startsWith('Aniversário: João'))).toBeTruthy();
  });
});
