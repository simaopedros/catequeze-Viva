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
      <Stack.Screen name="catechumens/index" options={{ title: 'Catequizandos' }} />
      <Stack.Screen name="catechumens/[id]" options={{ title: 'Catequizando' }} />
      <Stack.Screen name="families/index" options={{ title: 'Famílias' }} />
      <Stack.Screen name="families/[id]" options={{ title: 'Família' }} />
      <Stack.Screen name="team" options={{ title: 'Equipa' }} />
      <Stack.Screen name="communities" options={{ title: 'Comunidades' }} />
      <Stack.Screen name="content/index" options={{ title: 'Biblioteca' }} />
      <Stack.Screen name="content/[id]" options={{ title: 'Conteúdo' }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendário' }} />
      <Stack.Screen name="announcements" options={{ title: 'Comunicados' }} />
      <Stack.Screen name="formation/index" options={{ title: 'Formação' }} />
      <Stack.Screen name="formation/[id]" options={{ title: 'Percurso' }} />
      <Stack.Screen name="sacraments/index" options={{ title: 'Sacramentos' }} />
      <Stack.Screen name="sacraments/[id]" options={{ title: 'Jornada' }} />
      <Stack.Screen name="catechism/index" options={{ title: 'Catecismo' }} />
      <Stack.Screen name="directory/index" options={{ title: 'Diretório' }} />
      <Stack.Screen name="reports" options={{ title: 'Relatórios' }} />
      <Stack.Screen name="birthdays" options={{ title: 'Aniversariantes' }} />
      <Stack.Screen name="official-library" options={{ title: 'Pasta oficial' }} />
      <Stack.Screen name="groups/index" options={{ title: 'Grupos' }} />
      <Stack.Screen name="groups/[id]" options={{ title: 'Grupo' }} />
      <Stack.Screen name="billing" options={{ title: 'Assinatura' }} />
      <Stack.Screen name="settings" options={{ title: 'Definições' }} />
      <Stack.Screen name="years" options={{ title: 'Anos catequéticos' }} />
      <Stack.Screen name="ai" options={{ title: 'Assistência editorial' }} />
    </Stack>
  );
}
