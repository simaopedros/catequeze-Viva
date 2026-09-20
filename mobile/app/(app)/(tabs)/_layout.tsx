import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { APP_TABS } from '../../../src/api/paths';
import { colors, fonts } from '../../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.sansBold, fontWeight: '700', color: colors.ink, fontSize: 17 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.inkHairline,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.paper },
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
