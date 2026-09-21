import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AttendanceScreen } from '../screens/AttendanceScreen';

describe('AttendanceScreen', () => {
  it('renders mock-aligned attendance layout', () => {
    const view = render(
      <AttendanceScreen
        sheet={{
          fetchedAt: '2026-01-01T00:00:00.000Z',
          meeting: {
            id: 'm1',
            date: '2025-06-15T15:00:00.000Z',
            class: { name: 'Turma 3A - Crisma' },
          },
          summary: { total: 2, present: 1, absent: 1, justified: 0 },
          participants: [
            { catechumenProfileId: 'p1', firstName: 'Ana', lastName: 'Silva', status: 'PRESENT' },
            { catechumenProfileId: 'p2', firstName: 'Carla', lastName: 'Oliveira', status: 'ABSENT' },
          ],
        }}
        onSave={async () => undefined}
      />,
    );

    expect(view.getByTestId('attendance-screen')).toBeTruthy();
    expect(view.getByTestId('attendance-header-card')).toBeTruthy();
    expect(view.getByTestId('attendance-stats')).toBeTruthy();
    expect(view.getByTestId('attendance-search')).toBeTruthy();
    expect(view.getByPlaceholderText('Buscar catequizando...')).toBeTruthy();
    expect(view.getByTestId('attendance-save')).toHaveTextContent('Salvar presenças');
    expect(view.getByText('Ana Silva')).toBeTruthy();
    fireEvent.changeText(view.getByPlaceholderText('Buscar catequizando...'), 'Carla');
    expect(view.getByText('Carla Oliveira')).toBeTruthy();
    expect(view.queryByText('Ana Silva')).toBeNull();
  });
});
