import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function AppLayout() {
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="community/compose" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="community/search" options={{ title: 'Pesquisar' }} />
      <Stack.Screen name="community/members" options={{ title: 'Membros' }} />
      <Stack.Screen name="community/topics" options={{ title: 'Tópicos' }} />
      <Stack.Screen name="community/shorts" options={{ title: 'Shorts' }} />
      <Stack.Screen name="community/following" options={{ title: 'A seguir' }} />
      <Stack.Screen name="community/edit" options={{ title: 'Editar perfil' }} />
      <Stack.Screen name="community/blocked" options={{ title: 'Bloqueados' }} />
      <Stack.Screen name="community/connections" options={{ title: 'Ligações' }} />
      <Stack.Screen name="community/p/[slug]" options={{ title: 'Publicação' }} />
      <Stack.Screen name="community/t/[slug]" options={{ title: 'Tópico' }} />
      <Stack.Screen name="community/[handle]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="class/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="class-meetings" options={{ title: 'Encontros' }} />
      <Stack.Screen
        name="meeting/[id]/index"
        options={{ title: 'Encontro', contentStyle: { backgroundColor: colors.surface } }}
      />
      <Stack.Screen name="meeting/[id]/attendance" options={{ title: 'Presença' }} />
      <Stack.Screen name="messages/[id]" options={{ title: 'Conversa' }} />
      <Stack.Screen name="bible/index" options={{ title: 'Bíblia' }} />
      <Stack.Screen name="bible/[bookId]/index" options={{ title: 'Livro' }} />
      <Stack.Screen name="bible/[bookId]/[chapter]" options={{ title: 'Capítulo' }} />
      <Stack.Screen name="documents" options={{ title: 'Documentos' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notificações' }} />
      <Stack.Screen name="calendar" options={{ title: 'Agenda' }} />
      <Stack.Screen name="announcements/index" options={{ title: 'Comunicados' }} />
      <Stack.Screen name="announcements/[id]" options={{ title: 'Comunicado' }} />
      <Stack.Screen name="journeys/index" options={{ title: 'Jornadas' }} />
      <Stack.Screen name="journeys/[id]" options={{ title: 'Jornada' }} />
      <Stack.Screen name="catechism/index" options={{ title: 'Catecismo' }} />
      <Stack.Screen name="catechism/[number]" options={{ title: 'Catecismo' }} />
      <Stack.Screen name="catechumens/index" options={{ title: 'Catequizandos' }} />
      <Stack.Screen name="catechumens/[id]" options={{ title: 'Catequizando' }} />
      <Stack.Screen name="families/index" options={{ title: 'Famílias' }} />
      <Stack.Screen name="families/[id]" options={{ title: 'Família' }} />
    </Stack>
  );
}
