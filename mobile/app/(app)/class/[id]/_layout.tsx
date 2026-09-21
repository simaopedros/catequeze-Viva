import { Stack } from 'expo-router';
import { colors } from '../../../../src/theme';

export default function ClassDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary[800],
        headerTitleStyle: { fontWeight: '700', fontSize: 20, color: colors.text.primary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Turma' }} />
    </Stack>
  );
}
