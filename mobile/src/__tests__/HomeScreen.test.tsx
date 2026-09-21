import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { shortClassLabel } from '../components/homeUi';

describe('HomeScreen mock layout', () => {
  it('renders header, meeting card, stats, alerts and class carousel', () => {
    const view = render(
      <HomeScreen
        name="Pedro Silva"
        firstName="Pedro"
        workspaceName="Paróquia São João"
        stats={{
          activeClasses: 5,
          activeCatechumens: 48,
          avgAttendance: 82,
          pendingSacraments: 3,
          todayMeetings: [
            {
              id: 'm1',
              class: { name: 'Turma 3A - Crisma' },
              theme: 'O Espírito Santo',
              startsAt: '2026-06-15T15:00:00.000Z',
              endsAt: '2026-06-15T16:30:00.000Z',
            },
          ],
          recentAlerts: [{ type: 'message', message: 'Nova mensagem na turma 3A' }],
          myClasses: [
            { id: 'c1', name: 'Turma 1A', enrollmentCount: 12 },
            { id: 'c2', name: 'Turma 2A', enrollmentCount: 10 },
          ],
        }}
        onOpenMeeting={jest.fn()}
        onOpenAttendance={jest.fn()}
        onOpenClasses={jest.fn()}
      />,
    );

    expect(view.getByTestId('home-header')).toBeTruthy();
    expect(view.getByText('Pedro')).toBeTruthy();
    expect(view.getByTestId('home-meeting-card')).toBeTruthy();
    expect(view.getByText('Encontro hoje')).toBeTruthy();
    expect(view.getByText('Fazer a chamada')).toBeTruthy();
    expect(view.getByTestId('home-stats-row')).toBeTruthy();
    expect(view.getByText('5')).toBeTruthy();
    expect(view.getByTestId('home-alerts')).toBeTruthy();
    expect(view.getByTestId('home-classes-carousel')).toBeTruthy();
    expect(view.getByText('Ver todas')).toBeTruthy();
  });

  it('shortens class labels for carousel chips', () => {
    expect(shortClassLabel('Turma 3A - Crisma')).toBe('3A');
    expect(shortClassLabel('Turma 1A')).toBe('1A');
  });
});
