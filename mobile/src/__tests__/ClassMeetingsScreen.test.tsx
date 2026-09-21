import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ClassMeetingsScreen } from '../screens/ClassMeetingsScreen';

describe('ClassMeetingsScreen', () => {
  it('lista encontros e abre formulário de criação', () => {
    const onOpenAttendance = jest.fn();
    const view = render(
      <ClassMeetingsScreen
        className="3A"
        meetingsPayload={{ items: [{ id: 'm1', title: 'Encontro 1', date: '2026-09-25T10:00:00.000Z' }] }}
        onOpenMeeting={jest.fn()}
        onOpenAttendance={onOpenAttendance}
        onCreateMeeting={jest.fn()}
      />,
    );

    expect(view.getByTestId('class-meetings-screen')).toBeTruthy();
    fireEvent.press(view.getByTestId('create-meeting-toggle'));
    expect(view.getByTestId('create-meeting-form')).toBeTruthy();
    fireEvent.press(view.getByTestId('meeting-attendance-m1'));
    expect(onOpenAttendance).toHaveBeenCalledWith('m1');
  });
});
