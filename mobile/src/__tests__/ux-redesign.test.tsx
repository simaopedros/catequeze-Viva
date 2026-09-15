import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { canManagePastoral, canMarkAttendance } from '../lib/roleAccess';
import { getMobileBottomTabKeys } from '../screens/bottomTabs';
import { getMoreSections } from '../screens/moreModules';
import { HomeScreen } from '../screens/HomeScreen';
import { MeetingScreen } from '../screens/MeetingScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';

describe('UX redesign role IA', () => {
  it('mirrors web tabs and hides attendance from the family portal', () => {
    expect(getMobileBottomTabKeys('LEAD_CATECHIST')).toEqual([
      'dashboard',
      'community',
      'classes',
      'calendar',
    ]);
    expect(getMobileBottomTabKeys('GUARDIAN')).toEqual(['dashboard', 'community', 'calendar', 'messages']);
    expect(canMarkAttendance('GUARDIAN')).toBe(false);
    expect(canMarkAttendance('LEAD_CATECHIST')).toBe(true);
    expect(canManagePastoral('GUARDIAN')).toBe(false);
    expect(canManagePastoral('LEAD_CATECHIST')).toBe(true);

    const guardianMais = getMoreSections({ role: 'GUARDIAN' })
      .flatMap((section) => section.items.map((item) => item.id));
    expect(guardianMais).not.toContain('families');
    expect(guardianMais).toContain('consents');
    expect(guardianMais).toContain('catechumens');
  });

  it('does not offer Marcar presença to a guardian', () => {
    const home = render(
      <HomeScreen
        name="Maria"
        role="GUARDIAN"
        stats={{ pendingAttendanceMeeting: { id: 'm1', title: 'Encontro 2' } }}
        onOpenMeeting={jest.fn()}
        onOpenCommunity={jest.fn()}
        onOpenNotifications={jest.fn()}
        onOpenHref={jest.fn()}
      />,
    );
    expect(home.queryByText('Marcar presença')).toBeNull();
    expect(home.queryByTestId('pending-attendance')).toBeNull();
    expect(home.getByTestId('shortcut-messages')).toBeTruthy();

    const meeting = render(
      <MeetingScreen
        data={{ title: 'Encontro 2', class: { name: 'Crisma' } }}
        canMarkAttendance={false}
        onAttendance={jest.fn()}
      />,
    );
    expect(meeting.queryByTestId('open-attendance')).toBeNull();
    expect(meeting.queryByText('Marcar presença')).toBeNull();
  });

  it('never prints PRESENT on the attendance sheet', () => {
    const view = render(
      <AttendanceScreen
        meeting={{
          meeting: { title: 'Encontro 1' },
          participants: [{ catechumenProfileId: 'c1', firstName: 'Ana', status: 'PRESENT' }],
        }}
        onSave={jest.fn()}
      />,
    );
    expect(view.queryByText('PRESENT')).toBeNull();
    expect(view.getAllByText('Presente').length).toBeGreaterThan(0);
  });
});
