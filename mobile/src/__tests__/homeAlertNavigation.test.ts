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
});
