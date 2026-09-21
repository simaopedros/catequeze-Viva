import { Tabs } from 'expo-router';
import { BookOpen, Home, Menu, MessageCircle, Users } from 'lucide-react-native';
import { APP_TABS } from '../../../src/api/paths';
import { colors, spacing } from '../../../src/theme';

const TAB_ICONS = {
  home: Home,
  users: Users,
  'book-open': BookOpen,
  'message-circle': MessageCircle,
  menu: Menu,
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary[800],
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: '#E7ECF1',
          borderTopWidth: 1,
          height: 58,
          paddingBottom: spacing[1],
          paddingTop: spacing[1],
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {APP_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.icon as keyof typeof TAB_ICONS];
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.label,
              headerShown: tab.name !== 'index',
              tabBarIcon: ({ color }) => (Icon ? <Icon color={color} size={22} strokeWidth={2} /> : null),
            }}
          />
        );
      })}
    </Tabs>
  );
}
