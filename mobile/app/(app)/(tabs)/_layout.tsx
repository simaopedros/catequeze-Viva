import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_TABS } from '../../../src/api/paths';
import { unreadCount, useAuth } from '../../../src/auth/AuthContext';
import { colors, fontFamilies } from '../../../src/theme';

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index: { active: 'home-variant', inactive: 'home-variant-outline' },
  community: { active: 'account-group', inactive: 'account-group-outline' },
  classes: { active: 'school', inactive: 'school-outline' },
  messages: { active: 'message-text', inactive: 'message-text-outline' },
  more: { active: 'dots-horizontal-circle', inactive: 'dots-horizontal-circle-outline' },
};

export default function TabsLayout() {
  const { bootstrap } = useAuth();
  const unread = unreadCount(bootstrap);
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.inkSoft,
          height: 56 + tabBarBottom,
          paddingTop: 6,
          paddingBottom: tabBarBottom,
        },
        tabBarLabelStyle: { fontFamily: fontFamilies.medium, fontSize: 11 },
      }}
    >
      {APP_TABS.map((tab) => {
        const icons = TAB_ICONS[tab.name] ?? { active: 'circle', inactive: 'circle-outline' };
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.label,
              tabBarBadge: tab.name === 'index' && unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
              tabBarBadgeStyle: { backgroundColor: colors.gold, color: colors.ink, fontFamily: fontFamilies.semibold, fontSize: 10 },
              tabBarIcon: ({ color, size, focused }) => (
                <MaterialCommunityIcons name={(focused ? icons.active : icons.inactive) as any} color={color} size={size} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
