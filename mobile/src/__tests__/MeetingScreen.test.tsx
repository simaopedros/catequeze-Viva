import React from 'react';
import { render } from '@testing-library/react-native';
import { MeetingScreen } from '../screens/MeetingScreen';

describe('MeetingScreen', () => {
  it('renders mock-aligned layout with tabs and attendance CTA', () => {
    const view = render(
      <MeetingScreen
        data={{
          id: 'm1',
          theme: 'O Espírito Santo',
          date: '2025-06-15T15:00:00.000Z',
          details: 'Reflexão sobre a ação do Espírito Santo na vida do cristão e na igreja.',
          class: { name: 'Turma 3A - Crisma' },
          permissions: { canTakeAttendance: true },
          attendanceSummary: { registered: 2, totalActive: 10 },
          content: {
            materials: 'Apresentação.pdf\nVídeo: O Espírito Santo',
            biblicalRef: 'Jo 14,16-17',
          },
        }}
        onAttendance={() => undefined}
      />,
    );

    expect(view.getByTestId('meeting-screen')).toBeTruthy();
    expect(view.getByTestId('meeting-summary-card')).toBeTruthy();
    expect(view.getByTestId('meeting-theme-heading')).toHaveTextContent('Tema: O Espírito Santo');
    expect(view.getByTestId('meeting-tab-bar')).toBeTruthy();
    expect(view.getByTestId('open-attendance')).toHaveTextContent('Ver presenças');
    expect(view.getByText('Resumo do encontro')).toBeTruthy();
    expect(view.getByText('Materiais')).toBeTruthy();
    expect(view.getByTestId('meeting-materials-group')).toBeTruthy();
    expect(view.getByText('Passagem bíblica')).toBeTruthy();
  });
});
