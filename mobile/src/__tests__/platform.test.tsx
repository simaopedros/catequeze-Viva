import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { asItems, formatDate, personName, pickItems, statusLabel, workspaceTypeLabel } from '../lib/payload';
import { planLabel, subscriptionStatusLabel } from '../lib/billing';
import { MORE_SECTIONS, getMoreSections } from '../screens/moreModules';
import { MoreScreen } from '../screens/MoreScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { ClassesScreen } from '../screens/ClassesScreen';
import { ClassDetailScreen } from '../screens/ClassDetailScreen';
import { BillingScreen } from '../screens/BillingScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { ThreadScreen } from '../screens/ThreadScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { APP_TABS, MOBILE_PATHS } from '../api/paths';
import { appRoutes } from '../navigation/routes';

describe('payload helpers', () => {
  it('unwraps arrays, items and named collections', () => {
    expect(asItems([{ id: '1' }])).toHaveLength(1);
    expect(asItems({ items: [{ id: '2' }] })).toEqual([{ id: '2' }]);
    expect(asItems({ members: [{ id: '3' }] })).toEqual([{ id: '3' }]);
    expect(asItems(null)).toEqual([]);
    expect(asItems({ notifications: [{ id: 'n1' }] })).toEqual([{ id: 'n1' }]);
    expect(asItems({ classReports: [{ id: 'c1' }] }, ['classReports'])).toEqual([{ id: 'c1' }]);
  });

  it('formats names and pastoral statuses in Portuguese', () => {
    expect(personName({ firstName: 'Ana', lastName: 'Silva' })).toBe('Ana Silva');
    expect(personName({ displayName: 'João' })).toBe('João');
    expect(statusLabel('PRESENT')).toBe('Presente');
    expect(statusLabel('JUSTIFIED')).toBe('Justificado');
    expect(statusLabel('LATE')).toBe('Atrasado');
    expect(statusLabel('INITIAL')).toBe('Inicial');
    expect(workspaceTypeLabel('PARISH')).toBe('Paróquia');
    expect(formatDate('2026-03-19T12:00:00.000Z')).toMatch(/2026/);
    expect(planLabel('single')).toBe('Plano Catequista');
    expect(subscriptionStatusLabel('active')).toBe('Ativa');
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

    const guardianBar = getMoreSections({ role: 'GUARDIAN', hiddenIds: ['messages'] });
    expect(guardianBar.flatMap((section) => section.items.map((item) => item.id))).not.toContain('messages');
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
        workspaces={[{ id: 'p1', name: 'Paróquia São José (TESTE)', type: 'PARISH' }]}
        workspaceId="p1"
        onSelectWorkspace={jest.fn()}
        onOpenHref={onOpenHref}
        onOpenProfile={jest.fn()}
        onLogout={jest.fn()}
      />,
    );

    expect(view.getByTestId('more-screen')).toBeTruthy();
    expect(view.getByText(/Paróquia São José \(TESTE\) · Paróquia/)).toBeTruthy();
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
    expect(home.getByText('Sem encontros à vista')).toBeTruthy();
  });

  it('shows recent meetings on home when nothing is upcoming', () => {
    const onOpenMeeting = jest.fn();
    const home = render(
      <HomeScreen
        name="Ana"
        stats={{
          upcomingMeetings: [],
          todayMeetings: [],
          recentMeetings: [
            {
              id: 'm-recent',
              title: 'Encontro 2 - A Crisma e o Compromisso',
              date: '2026-06-14T19:00:00.000Z',
              class: { name: 'Turma Crisma 2026' },
            },
          ],
        }}
        onOpenMeeting={onOpenMeeting}
        onOpenCommunity={jest.fn()}
        onOpenNotifications={jest.fn()}
        onOpenHref={jest.fn()}
      />,
    );
    expect(home.getByText('Encontros recentes')).toBeTruthy();
    expect(home.getByText('Encontro 2 - A Crisma e o Compromisso')).toBeTruthy();
    expect(home.getByText(/Turma Crisma 2026/)).toBeTruthy();
    fireEvent.press(home.getByTestId('meeting-m-recent'));
    expect(onOpenMeeting).toHaveBeenCalledWith('m-recent');
  });

  it('lists class counts instead of a blank year', () => {
    const onOpen = jest.fn();
    const view = render(
      <ClassesScreen
        payload={[
          {
            id: 'test-class-crisma-001',
            name: 'Turma Crisma 2026',
            community: { name: 'Comunidade São José' },
            stage: { name: 'Crisma' },
            _count: { enrollments: 4, meetings: 2 },
          },
        ]}
        onOpen={onOpen}
      />,
    );
    expect(view.getByText('Comunidade São José · Crisma')).toBeTruthy();
    expect(view.getByText('4 catequizando(s) · 2 encontro(s)')).toBeTruthy();
    fireEvent.press(view.getByTestId('class-test-class-crisma-001'));
    expect(onOpen).toHaveBeenCalledWith('test-class-crisma-001');
  });

  it('opens a class meeting from the turma details', () => {
    const onOpenMeeting = jest.fn();
    const view = render(
      <ClassDetailScreen
        data={{
          name: 'Turma Crisma 2026',
          community: { name: 'São José' },
          attendanceSummary: { attendanceRate: 75, totalMeetings: 2 },
          enrollments: [{ id: 'e1', status: 'ENROLLED', catechumenProfile: { id: 'c1', firstName: 'Pedro', lastName: 'Lima' } }],
          meetings: [{ id: 'm1', title: 'Encontro 2', date: '2026-06-14T19:00:00.000Z', status: 'NOT_STARTED' }],
        }}
        onOpenMeeting={onOpenMeeting}
      />,
    );
    expect(view.getByText(/75% de presença/)).toBeTruthy();
    fireEvent.press(view.getByText('Encontro 2'));
    expect(onOpenMeeting).toHaveBeenCalledWith('m1');
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

  it('does not pretend unfilled attendance is Presente', () => {
    const onSave = jest.fn();
    const view = render(
      <AttendanceScreen
        meeting={{
          meeting: { title: 'Encontro 2' },
          summary: { registered: 0, total: 1, present: 0, absent: 0, late: 0, justified: 0 },
          participants: [{ catechumenProfileId: 'c1', firstName: 'Carlos', lastName: 'Souza', status: null }],
        }}
        onSave={onSave}
      />,
    );
    expect(view.getByText(/Não preenchido/)).toBeTruthy();
    expect(view.getByText(/preenchidos/)).toBeTruthy();
    fireEvent.press(view.getByText('Salvar'));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Presente'));
    fireEvent.press(view.getByText('Salvar'));
    expect(onSave).toHaveBeenCalledWith('c1', 'PRESENT');
  });

  it('switches attendance to a sibling meeting of the same class', () => {
    const onSelectMeeting = jest.fn();
    const view = render(
      <AttendanceScreen
        meeting={{
          meeting: { id: 'm2', title: 'Encontro 2' },
          summary: { registered: 0, total: 0, present: 0, absent: 0, late: 0, justified: 0 },
          participants: [],
          siblingMeetings: [
            { id: 'm2', title: 'Encontro 2 - A Crisma e o Compromisso', date: '2026-06-14T19:00:00.000Z', status: 'NOT_STARTED' },
            { id: 'm1', title: 'Encontro 1 - O Espírito Santo', date: '2026-06-07T19:00:00.000Z', status: 'COMPLETED' },
          ],
        }}
        onSave={jest.fn()}
        onSelectMeeting={onSelectMeeting}
      />,
    );
    expect(view.getByText('Encontros desta turma')).toBeTruthy();
    fireEvent.press(view.getByTestId('sibling-meeting-m1'));
    expect(onSelectMeeting).toHaveBeenCalledWith('m1');
  });

  it('shows Portuguese billing names and unread messages', () => {
    const billing = render(<BillingScreen data={{ planId: 'single', status: 'active', interval: null }} />);
    expect(billing.getByText('Plano Catequista')).toBeTruthy();
    expect(billing.getByText('Ativa')).toBeTruthy();

    const onOpen = jest.fn();
    const messages = render(
      <MessagesScreen
        payload={[
          {
            id: 'c1',
            title: 'Coordenação São José (TESTE)',
            unreadCount: 1,
            lastMessage: { content: 'Bem-vindos à coordenação!' },
          },
        ]}
        onOpen={onOpen}
      />,
    );
    expect(messages.getByText('1 por ler')).toBeTruthy();
    fireEvent.press(messages.getByTestId('conversation-c1'));
    expect(onOpen).toHaveBeenCalledWith('c1');

    const thread = render(
      <ThreadScreen
        data={{
          conversation: { title: 'Coordenação São José (TESTE)' },
          messages: [
            { id: 'm1', content: 'Olá', sender: { firstName: 'Catequista', lastName: 'Responsável' } },
          ],
        }}
        onSend={jest.fn()}
      />,
    );
    expect(thread.getByText('Coordenação São José (TESTE)')).toBeTruthy();
    expect(thread.getByText('Catequista Responsável')).toBeTruthy();
    expect(thread.getByText('Olá')).toBeTruthy();

    const notes = render(
      <NotificationsScreen
        payload={{ notifications: [{ id: 'n1', title: 'Aviso pastoral', body: 'Encontro amanhã' }] }}
        onRead={jest.fn()}
      />,
    );
    expect(notes.getByText('Aviso pastoral')).toBeTruthy();
  });
});
