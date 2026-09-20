import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { SignupScreen } from '../screens/SignupScreen';

describe('home today composition', () => {
  it('renders the ink hero and pastoral shortcuts', () => {
    const onOpenAnnouncements = jest.fn();
    const view = render(
      <HomeScreen
        name="Ana"
        stats={{ activeClasses: 2, activeCatechumens: 12, avgAttendance: 80 }}
        meetings={[{ id: 'm1', title: 'Encontro 1', startsAt: '2026-09-21T19:00:00.000Z' }]}
        onOpenMeeting={jest.fn()}
        onOpenCommunity={jest.fn()}
        onOpenNotifications={jest.fn()}
        onOpenAnnouncements={onOpenAnnouncements}
        onOpenBirthdays={jest.fn()}
        onOpenCalendar={jest.fn()}
      />,
    );

    expect(view.getByTestId('hero-block')).toBeTruthy();
    expect(view.getByText('Olá, Ana')).toBeTruthy();
    expect(view.getByText('Encontro 1')).toBeTruthy();
    fireEvent.press(view.getByTestId('home-announcements'));
    expect(onOpenAnnouncements).toHaveBeenCalled();
  });
});

describe('signup screen', () => {
  it('submits trimmed credentials', () => {
    const onSubmit = jest.fn();
    const view = render(<SignupScreen onSubmit={onSubmit} onLogin={jest.fn()} />);
    fireEvent.changeText(view.getByTestId('signup-first'), 'Ana');
    fireEvent.changeText(view.getByTestId('signup-last'), 'Silva');
    fireEvent.changeText(view.getByTestId('signup-email'), ' Ana@paroquia.pt ');
    fireEvent.changeText(view.getByTestId('signup-password'), 'Teste@123');
    fireEvent.press(view.getByTestId('signup-submit'));
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ana@paroquia.pt',
      password: 'Teste@123',
      firstName: 'Ana',
      lastName: 'Silva',
    });
  });
});
