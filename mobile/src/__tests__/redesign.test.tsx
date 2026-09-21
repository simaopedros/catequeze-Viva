import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ATTENDANCE_OPTIONS, StatusPicker } from '../components/ui';
import { HomeScreen } from '../screens/HomeScreen';
import { PeopleListScreen } from '../screens/PeopleScreens';
import { ShortsScreen } from '../screens/ShortsScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn(), loop: false }),
  VideoView: () => null,
}));

jest.mock('react-native-webview', () => ({
  WebView: () => null,
}));

describe('pastoral redesign', () => {
  it('labels attendance with the real JUSTIFIED status', () => {
    const onChange = jest.fn();
    const view = render(<StatusPicker value="PRESENT" onChange={onChange} />);
    expect(ATTENDANCE_OPTIONS.map((item) => item.value)).toEqual(['PRESENT', 'ABSENT', 'LATE', 'JUSTIFIED']);
    expect(view.getByText('Justificada')).toBeTruthy();
    fireEvent.press(view.getByTestId('status-JUSTIFIED'));
    expect(onChange).toHaveBeenCalledWith('JUSTIFIED');
  });

  it('puts today meeting and the call action on the home screen', () => {
    const onOpenAttendance = jest.fn();
    const view = render(
      <HomeScreen
        name="Ana"
        stats={{
          activeClasses: 2,
          activeCatechumens: 18,
          avgAttendance: 80,
          todayMeetings: [{ id: 'm1', title: 'Crescer na fé', class: { name: 'Crisma' }, date: '2026-09-21T19:00:00.000Z' }],
        }}
        onOpenMeeting={jest.fn()}
        onOpenAttendance={onOpenAttendance}
        onOpenClasses={jest.fn()}
        onOpenCatechumens={jest.fn()}
        onOpenCalendar={jest.fn()}
      />,
    );
    expect(view.getByText('Crescer na fé')).toBeTruthy();
    fireEvent.press(view.getByTestId('encounter-action'));
    expect(onOpenAttendance).toHaveBeenCalledWith('m1');
    expect(view.getByText('18')).toBeTruthy();
    expect(view.getByText('80%')).toBeTruthy();
  });

  it('shows an empty state when there are no catechumens', () => {
    const view = render(
      <PeopleListScreen
        testID="catechumens-screen"
        title="Catequizandos"
        subtitle="Consulta"
        payload={[]}
        onOpen={jest.fn()}
      />,
    );
    expect(view.getByText('Ninguém por aqui')).toBeTruthy();
  });

  it('shows an error state instead of an empty list', () => {
    const view = render(
      <PeopleListScreen
        testID="catechumens-screen"
        title="Catequizandos"
        subtitle="Consulta"
        payload={null}
        error="falhou"
        onOpen={jest.fn()}
      />,
    );
    expect(view.getByText('Lista indisponível')).toBeTruthy();
    expect(view.getByText('falhou')).toBeTruthy();
  });

  it('says a short is not ready when it has no playable url', () => {
    const view = render(
      <ShortsScreen
        posts={[{ id: 's1', slug: 'curto', body: 'Paz', author: { displayName: 'João' }, media: [] }]}
        onOpenAuthor={jest.fn()}
      />,
    );
    expect(view.getByText('Este vídeo ainda não está pronto.')).toBeTruthy();
  });
});
