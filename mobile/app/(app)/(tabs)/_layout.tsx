import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { getMobileBottomTabKeys } from '../../../src/screens/bottomTabs';
import { colors } from '../../../src/theme';

export default function TabsLayout() {
  const { bootstrap, workspaceId } = useAuth();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const keys = getMobileBottomTabKeys(nav.role, nav.isAdmin);
  const show = (key: string) => keys.includes(key);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.cream,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: '#8aa0b5',
        tabBarStyle: { backgroundColor: colors.ink, borderTopColor: colors.inkSoft },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Comunidade',
          href: show('community') ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Turmas',
          href: show('classes') ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendário',
          href: show('calendar') ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensagens',
          href: show('messages') ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
