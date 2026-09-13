import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { getMobileBottomTabKeys } from '../../../src/screens/bottomTabs';
import { colors, fonts } from '../../../src/theme';

export default function TabsLayout() {
  const { bootstrap, workspaceId } = useAuth();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const keys = getMobileBottomTabKeys(nav.role, nav.isAdmin);
  const show = (key: string) => keys.includes(key);
  const pathname = usePathname();
  const immersive = /(^|\/)community\/?$/.test(pathname || '');

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: immersive ? '#000' : colors.paper },
        headerTintColor: immersive ? '#D4AF37' : colors.ink,
        headerTitleStyle: { fontFamily: fonts.serif },
        tabBarActiveTintColor: immersive ? '#D4AF37' : colors.goldDark,
        tabBarInactiveTintColor: immersive ? '#8a8a8a' : colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        tabBarStyle: immersive
          ? { backgroundColor: '#000000', borderTopColor: '#1a1a1a', minHeight: 52 }
          : {
              backgroundColor: colors.paper,
              borderTopColor: colors.line,
              minHeight: 56,
            },
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
          headerShown: false,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
