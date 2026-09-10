import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { APP_TABS } from '../../../src/api/paths';
import { colors } from '../../../src/theme';

export default function TabsLayout() {
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
      {APP_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon as any} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
