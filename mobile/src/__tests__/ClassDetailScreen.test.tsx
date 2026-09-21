import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ClassDetailScreen } from '../screens/ClassDetailScreen';

describe('ClassDetailScreen', () => {
  it('renders summary, actions and upcoming meetings', () => {
    const onOpenMeeting = jest.fn();
    const onOpenCatechumens = jest.fn();
    const future = new Date();
    future.setDate(future.getDate() + 7);

    const view = render(
      <ClassDetailScreen
        data={{
          name: '3A - Crisma',
          _count: { enrollments: 14 },
          meetings: [
            { id: 'm1', theme: 'O Espírito Santo', date: future.toISOString() },
          ],
        }}
        onOpenMeeting={onOpenMeeting}
        onOpenCatechumens={onOpenCatechumens}
        onOpenAttendance={jest.fn()}
        onOpenMeetings={jest.fn()}
        onOpenFamilies={jest.fn()}
      />,
    );

    expect(view.getByTestId('class-summary-card')).toBeTruthy();
    expect(view.getByText('3A - Crisma')).toBeTruthy();
    expect(view.getByText('14 catequizandos')).toBeTruthy();
    expect(view.getByTestId('class-action-catechumens')).toBeTruthy();
    expect(view.getByText('Tema: O Espírito Santo')).toBeTruthy();

    fireEvent.press(view.getByTestId('class-action-catechumens'));
    expect(onOpenCatechumens).toHaveBeenCalled();
  });
});
