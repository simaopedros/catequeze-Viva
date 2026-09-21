import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { APP_TABS } from '../../../src/api/paths';
import { colors } from '../../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line, borderTopWidth: 1 },
      }}
    >
      {APP_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            headerShown: tab.name !== 'index',
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon as any} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
