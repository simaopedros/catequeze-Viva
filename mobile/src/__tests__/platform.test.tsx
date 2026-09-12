import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { asItems, formatDate, personName, pickItems, statusLabel } from '../lib/payload';
import { MORE_SECTIONS, getMoreSections } from '../screens/moreModules';
import { MoreScreen } from '../screens/MoreScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { APP_TABS, MOBILE_PATHS } from '../api/paths';
import { appRoutes } from '../navigation/routes';

describe('payload helpers', () => {
  it('unwraps arrays, items and named collections', () => {
    expect(asItems([{ id: '1' }])).toHaveLength(1);
    expect(asItems({ items: [{ id: '2' }] })).toEqual([{ id: '2' }]);
    expect(asItems({ members: [{ id: '3' }] })).toEqual([{ id: '3' }]);
    expect(asItems(null)).toEqual([]);
    expect(pickItems({ events: [{ id: 'e1' }], meetings: [{ id: 'm1' }] }, 'events')).toEqual([{ id: 'e1' }]);
  });

  it('formats names and pastoral statuses in Portuguese', () => {
    expect(personName({ firstName: 'Ana', lastName: 'Silva' })).toBe('Ana Silva');
    expect(personName({ displayName: 'João' })).toBe('João');
    expect(statusLabel('PRESENT')).toBe('Presente');
    expect(statusLabel('JUSTIFIED')).toBe('Justificado');
    expect(statusLabel('LATE')).toBe('Atrasado');
    expect(formatDate('2026-03-19T12:00:00.000Z')).toMatch(/2026/);
  });
});

describe('platform catalogue', () => {
  it('keeps five tabs aligned with the web bar and covers Mais groups', () => {
    expect(APP_TABS.map((tab) => tab.label)).toEqual([
      'Início',
      'Comunidade',
      'Turmas',
      'Calendário',
      'Mais',
    ]);
    const ids = MORE_SECTIONS.flatMap((section) => section.items.map((item) => item.id));
    expect(ids).toEqual(
      expect.arrayContaining([
        'messages',
        'catechumens',
        'families',
        'team',
        'family-invites',
        'library',
        'bible',
        'catechism',
        'announcements',
        'formation',
        'sacraments',
        'journey-templates',
        'parishes',
        'reports',
        'billing',
        'consents',
      ]),
    );
    expect(ids).not.toContain('calendar');
    expect(ids).not.toContain('ai');
  });

  it('hides personal-workspace and guardian-only destinations', () => {
    const personal = getMoreSections({ workspaceType: 'PERSONAL', role: 'PERSONAL_OWNER' });
    const personalIds = personal.flatMap((section) => section.items.map((item) => item.id));
    expect(personalIds).not.toContain('parishes');
    expect(personalIds).not.toContain('reports');
    expect(personalIds).not.toContain('consents');

    const guardian = getMoreSections({ role: 'GUARDIAN' });
    const guardianIds = guardian.flatMap((section) => section.items.map((item) => item.id));
    expect(guardianIds).toContain('consents');
    expect(guardianIds).not.toContain('parishes');
  });

  it('matches the new Wasp /mobile platform routes', () => {
    expect(MOBILE_PATHS.content).toBe('/mobile/content');
    expect(MOBILE_PATHS.contentDetails('abc')).toBe('/mobile/content/abc');
    expect(MOBILE_PATHS.announcementAck('n1')).toBe('/mobile/announcements/n1/ack');
    expect(MOBILE_PATHS.catechismEntry(247)).toBe('/mobile/catechism/247');
    expect(MOBILE_PATHS.team).toBe('/mobile/team');
    expect(MOBILE_PATHS.meetingAttendance('m1')).toBe('/mobile/meetings/m1/attendance');
    expect(MOBILE_PATHS.familyInvites).toBe('/mobile/family-invites');
    expect(appRoutes.catechumen('c1')).toBe('/(app)/catechumens/c1');
    expect(appRoutes.contentItem('x')).toBe('/(app)/content/x');
    expect(appRoutes.calendar).toBe('/(app)/(tabs)/calendar');
    expect(appRoutes.messages).toBe('/(app)/messages');
  });
});

describe('platform UI', () => {
  it('opens pastoral modules from Mais', () => {
    const onOpenHref = jest.fn();
    const view = render(
      <MoreScreen
        name="Ana"
        workspaces={[{ id: 'p1', name: 'São José' }]}
        workspaceId="p1"
        onSelectWorkspace={jest.fn()}
        onOpenHref={onOpenHref}
        onOpenProfile={jest.fn()}
        onLogout={jest.fn()}
      />,
    );

    expect(view.getByTestId('more-screen')).toBeTruthy();
    expect(view.getByText('Catequizandos')).toBeTruthy();
    expect(view.getByText('Biblioteca')).toBeTruthy();
    expect(view.getByText('Mensagens')).toBeTruthy();
    fireEvent.press(view.getByTestId('more-library'));
    expect(onOpenHref).toHaveBeenCalledWith(appRoutes.content);
  });

  it('lists catalog rows and home shortcuts', () => {
    const onOpen = jest.fn();
    const catalog = render(
      <CatalogScreen
        title="Catequizandos"
        subtitle="Lista"
        items={[{ id: 'c1', title: 'Ana', subtitle: 'Crisma' }]}
        emptyTitle="Vazio"
        emptyBody=""
        onOpen={onOpen}
      />,
    );
    fireEvent.press(catalog.getByTestId('item-c1'));
    expect(onOpen).toHaveBeenCalledWith('c1');

    const onOpenHref = jest.fn();
    const onOpenMeeting = jest.fn();
    const home = render(
      <HomeScreen
        name="Ana"
        stats={{
          activeClasses: 2,
          activeCatechumens: 12,
          avgAttendance: 88,
          pendingAttendanceMeeting: { id: 'm-pending', title: 'Quaresma', class: { name: 'Crisma 1' } },
        }}
        onOpenMeeting={onOpenMeeting}
        onOpenCommunity={jest.fn()}
        onOpenNotifications={jest.fn()}
        onOpenHref={onOpenHref}
      />,
    );
    expect(home.getByTestId('home-screen')).toBeTruthy();
    expect(home.getByText('88%')).toBeTruthy();
    fireEvent.press(home.getByTestId('pending-attendance'));
    expect(onOpenMeeting).toHaveBeenCalledWith('m-pending');
    fireEvent.press(home.getByText('Biblioteca'));
    expect(onOpenHref).toHaveBeenCalledWith('/(app)/content');
  });

  it('renders attendance chips with Portuguese labels', () => {
    const onSave = jest.fn();
    const view = render(
      <AttendanceScreen
        meeting={{
          meeting: { title: 'Encontro 1' },
          summary: { present: 1, absent: 0, late: 0, justified: 0 },
          participants: [{ catechumenProfileId: 'c1', firstName: 'Ana', lastName: 'Silva', status: 'PRESENT' }],
        }}
        onSave={onSave}
      />,
    );
    expect(view.getByTestId('attendance-screen')).toBeTruthy();
    expect(view.getByText('Ana Silva')).toBeTruthy();
    expect(view.getByText('Presente')).toBeTruthy();
    expect(view.getByText('Atrasado')).toBeTruthy();
    expect(view.getByText('Justificado')).toBeTruthy();
    fireEvent.press(view.getByText('Ausente'));
    fireEvent.press(view.getByText('Salvar'));
    expect(onSave).toHaveBeenCalledWith('c1', 'ABSENT');
  });
});
