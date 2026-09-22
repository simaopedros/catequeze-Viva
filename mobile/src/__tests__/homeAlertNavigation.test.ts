import { resolveHomeAlertTarget } from '../home/homeAlertNavigation';

describe('resolveHomeAlertTarget', () => {
  it('routes birthdays to catechumens', () => {
    expect(resolveHomeAlertTarget({ type: 'birthday', message: 'Aniversário' })).toEqual({
      screen: 'catechumens',
    });
  });

  it('routes messages to messages tab', () => {
    expect(resolveHomeAlertTarget({ type: 'message', message: 'Nova mensagem' })).toEqual({
      screen: 'messages',
    });
  });

  it('routes attendance warnings to meeting when available', () => {
    expect(
      resolveHomeAlertTarget({ type: 'warning', message: 'Presença média baixa' }, { todayMeetingId: 'm1' }),
    ).toEqual({ screen: 'attendance', meetingId: 'm1' });
  });

  it('prefers explicit meetingId on the alert', () => {
    expect(
      resolveHomeAlertTarget({
        type: 'warning',
        message: 'Chamada em curso',
        meetingId: 'm-explicit',
      }),
    ).toEqual({ screen: 'attendance', meetingId: 'm-explicit' });
  });

  it('routes info about classes to classes screen', () => {
    expect(
      resolveHomeAlertTarget({
        type: 'info',
        message: 'Nenhuma turma ativa. Crie uma turma para começar.',
      }),
    ).toEqual({ screen: 'classes' });
  });
});
