import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { asItems, formatDate, personName, statusLabel } from '../lib/payload';
import { MORE_SECTIONS } from '../screens/moreModules';
import { MoreScreen } from '../screens/MoreScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { APP_TABS, MOBILE_PATHS } from '../api/paths';
import { appRoutes } from '../navigation/routes';

describe('payload helpers', () => {
  it('unwraps arrays, items and named collections', () => {
    expect(asItems([{ id: '1' }])).toHaveLength(1);
    expect(asItems({ items: [{ id: '2' }] })).toEqual([{ id: '2' }]);
    expect(asItems({ members: [{ id: '3' }] })).toEqual([{ id: '3' }]);
    expect(asItems(null)).toEqual([]);
  });

  it('formats names and pastoral statuses in Portuguese', () => {
    expect(personName({ firstName: 'Ana', lastName: 'Silva' })).toBe('Ana Silva');
    expect(personName({ displayName: 'João' })).toBe('João');
    expect(statusLabel('PRESENT')).toBe('Presente');
    expect(statusLabel('JUSTIFIED')).toBe('Justificada');
    expect(formatDate('2026-03-19T12:00:00.000Z')).toMatch(/2026/);
  });
});

describe('platform catalogue', () => {
  it('keeps five tabs and covers people, content and pastoral modules', () => {
    expect(APP_TABS).toHaveLength(5);
    const ids = MORE_SECTIONS.flatMap((section) => section.items.map((item) => item.id));
    expect(ids).toEqual(
      expect.arrayContaining([
        'catechumens',
        'families',
        'team',
        'library',
        'bible',
        'catechism',
        'calendar',
        'announcements',
        'formation',
        'sacraments',
        'reports',
        'billing',
      ]),
    );
    expect(MORE_SECTIONS.flatMap((section) => section.items).find((item) => item.id === 'ai')?.live).toBe(
      false,
    );
  });

  it('matches the new Wasp /mobile platform routes', () => {
    expect(MOBILE_PATHS.content).toBe('/mobile/content');
    expect(MOBILE_PATHS.contentDetails('abc')).toBe('/mobile/content/abc');
    expect(MOBILE_PATHS.announcementAck('n1')).toBe('/mobile/announcements/n1/ack');
    expect(MOBILE_PATHS.catechismEntry(247)).toBe('/mobile/catechism/247');
    expect(MOBILE_PATHS.team).toBe('/mobile/team');
    expect(appRoutes.catechumen('c1')).toBe('/(app)/catechumens/c1');
    expect(appRoutes.contentItem('x')).toBe('/(app)/content/x');
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
    const home = render(
      <HomeScreen
        name="Ana"
        onOpenMeeting={jest.fn()}
        onOpenCommunity={jest.fn()}
        onOpenNotifications={jest.fn()}
        onOpenHref={onOpenHref}
      />,
    );
    expect(home.getByTestId('home-screen')).toBeTruthy();
    fireEvent.press(home.getByText('Biblioteca'));
    expect(onOpenHref).toHaveBeenCalledWith('/(app)/content');
  });
});
