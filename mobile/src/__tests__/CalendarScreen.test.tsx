import React from 'react';
import { render } from '@testing-library/react-native';
import { CalendarScreen } from '../screens/CalendarScreen';

describe('CalendarScreen', () => {
  it('renders without duplicate page title', () => {
    const month = new Date(2026, 8, 1);
    const view = render(
      <CalendarScreen
        items={[]}
        month={month}
        onMonthChange={() => {}}
        classes={[]}
        canWriteEvents
        onOpenMeeting={() => {}}
        onCreateLiturgicalEvent={async () => {}}
        onUpdateLiturgicalEvent={async () => {}}
        onDeleteLiturgicalEvent={async () => {}}
        onCreateMeeting={async () => {}}
        onUpdateMeeting={async () => {}}
        onDeleteMeeting={async () => {}}
      />,
    );

    expect(view.getByTestId('calendar-screen')).toBeTruthy();
    expect(view.getByTestId('calendar-create-event')).toBeTruthy();
    expect(view.queryByText('Agenda')).toBeNull();
  });
});
