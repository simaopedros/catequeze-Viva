import { Stack } from 'expo-router';
import { colors, fontFamilies } from '../../src/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.cream,
        headerTitleStyle: { fontFamily: fontFamilies.semibold, fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="community/compose" options={{ title: 'Publicar' }} />
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
      <Stack.Screen name="class/new" options={{ title: 'Nova turma' }} />
      <Stack.Screen name="class/[id]/index" options={{ title: 'Turma' }} />
      <Stack.Screen name="class/[id]/edit" options={{ title: 'Editar turma' }} />
      <Stack.Screen name="class/[id]/enroll" options={{ title: 'Inscrever' }} />
      <Stack.Screen name="class/[id]/catechists" options={{ title: 'Catequistas' }} />
      <Stack.Screen name="class/[id]/attendance" options={{ title: 'Presenças' }} />
      <Stack.Screen name="catechumens/index" options={{ title: 'Catequizandos' }} />
      <Stack.Screen name="families/index" options={{ title: 'Famílias' }} />
      <Stack.Screen name="catechumen/new" options={{ title: 'Novo catequizando' }} />
      <Stack.Screen name="catechumen/[id]/index" options={{ title: 'Catequizando' }} />
      <Stack.Screen name="catechumen/[id]/edit" options={{ title: 'Editar catequizando' }} />
      <Stack.Screen name="family/new" options={{ title: 'Nova família' }} />
      <Stack.Screen name="family/[id]/index" options={{ title: 'Família' }} />
      <Stack.Screen name="family/[id]/edit" options={{ title: 'Editar família' }} />
      <Stack.Screen name="family/[id]/guardian" options={{ title: 'Responsável' }} />
      <Stack.Screen name="meeting/new" options={{ title: 'Novo encontro' }} />
      <Stack.Screen name="meeting/[id]/index" options={{ title: 'Encontro' }} />
      <Stack.Screen name="meeting/[id]/edit" options={{ title: 'Editar encontro' }} />
      <Stack.Screen name="meeting/[id]/attendance" options={{ title: 'Presença' }} />
      <Stack.Screen name="messages/new" options={{ title: 'Nova conversa' }} />
      <Stack.Screen name="messages/[id]" options={{ title: 'Conversa' }} />
      <Stack.Screen name="bible/index" options={{ title: 'Bíblia' }} />
      <Stack.Screen name="bible/[bookId]/index" options={{ title: 'Livro' }} />
      <Stack.Screen name="bible/[bookId]/[chapter]" options={{ title: 'Capítulo' }} />
      <Stack.Screen name="documents" options={{ title: 'Documentos' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notificações' }} />
      <Stack.Screen name="search" options={{ title: 'Pesquisar' }} />
      <Stack.Screen name="announcements" options={{ title: 'Avisos' }} />
      <Stack.Screen name="birthdays" options={{ title: 'Aniversários' }} />
    </Stack>
  );
}
