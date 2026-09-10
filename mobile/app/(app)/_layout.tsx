import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.cream,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="community/compose" options={{ title: 'Publicar' }} />
      <Stack.Screen name="community/[handle]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="class/[id]" options={{ title: 'Turma' }} />
      <Stack.Screen name="meeting/[id]" options={{ title: 'Encontro' }} />
      <Stack.Screen name="meeting/[id]/attendance" options={{ title: 'Presença' }} />
      <Stack.Screen name="messages/[id]" options={{ title: 'Conversa' }} />
      <Stack.Screen name="bible/index" options={{ title: 'Bíblia' }} />
      <Stack.Screen name="bible/[bookId]/index" options={{ title: 'Livro' }} />
      <Stack.Screen name="bible/[bookId]/[chapter]" options={{ title: 'Capítulo' }} />
      <Stack.Screen name="documents" options={{ title: 'Documentos' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notificações' }} />
    </Stack>
  );
}
