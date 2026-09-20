import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { labelFor, TAB_ROUTE_BY_ICON } from '../../../src/navigation/visible';
import { NAV_ICON } from '../../../src/navigation/destinations';
import { visibleNavForSession } from '../../../src/navigation/navContext';
import { copy } from '../../../src/copy/ptBR';
import { colors, fonts } from '../../../src/theme';

const ALL_TAB_NAMES = ['index', 'community', 'classes', 'calendar', 'messages', 'groups', 'bible-tab', 'more'] as const;

export default function TabsLayout() {
  const { bootstrap, workspaceId } = useAuth();
  const nav = visibleNavForSession(bootstrap, workspaceId, listWorkspaces(bootstrap));
  const visibleNames = new Set(
    nav.bottomBar
      .map((item) => TAB_ROUTE_BY_ICON[item.iconKey])
      .filter(Boolean)
      .concat(['more']),
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.sansBold, fontWeight: '700', color: colors.ink, fontSize: 17 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.stroke,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      {ALL_TAB_NAMES.map((name) => {
        const iconKey =
          name === 'index'
            ? 'dashboard'
            : name === 'bible-tab'
              ? 'bible'
              : name === 'more'
                ? 'more'
                : name;
        const title = name === 'more' ? copy.tabs.more : labelFor(iconKey);
        const icon = name === 'more' ? 'ellipsis-horizontal' : NAV_ICON[iconKey] || 'ellipse-outline';
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              href: visibleNames.has(name) ? undefined : null,
              tabBarIcon: ({ color, size }) => <Ionicons name={icon as any} color={color} size={size} />,
            }}
          />
        );
      })}
    </Tabs>
  );
}
