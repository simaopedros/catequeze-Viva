import { Stack } from 'expo-router';
import { copy } from '../../src/copy/ptBR';
import { navigationChrome } from '../../src/theme';

export default function AppLayout() {
  return (
    <Stack screenOptions={navigationChrome}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="community/compose" options={{ title: copy.compose.title }} />
      <Stack.Screen name="community/search" options={{ title: copy.search.title }} />
      <Stack.Screen name="community/members" options={{ title: copy.people.membersTitle }} />
      <Stack.Screen name="community/topics" options={{ title: copy.topics.title }} />
      <Stack.Screen name="community/shorts" options={{ title: copy.community.shortsTitle }} />
      <Stack.Screen name="community/following" options={{ title: copy.community.followingTitle }} />
      <Stack.Screen name="community/edit" options={{ title: copy.editProfile.title }} />
      <Stack.Screen name="community/blocked" options={{ title: copy.people.blockedTitle }} />
      <Stack.Screen name="community/connections" options={{ title: 'Ligações' }} />
      <Stack.Screen name="community/p/[slug]" options={{ title: copy.post.title }} />
      <Stack.Screen name="community/t/[slug]" options={{ title: copy.topics.title }} />
      <Stack.Screen name="community/[handle]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="class/[id]" options={{ title: copy.classes.fallback }} />
      <Stack.Screen name="meeting/[id]" options={{ title: copy.meeting.fallback }} />
      <Stack.Screen name="meeting/[id]/attendance" options={{ title: copy.attendance.title }} />
      <Stack.Screen name="messages/[id]" options={{ title: copy.messages.fallback }} />
      <Stack.Screen name="bible/index" options={{ title: copy.bible.title }} />
      <Stack.Screen name="bible/[bookId]/index" options={{ title: copy.bible.book }} />
      <Stack.Screen name="bible/[bookId]/[chapter]" options={{ title: 'Capítulo' }} />
      <Stack.Screen name="documents" options={{ title: copy.documents.title }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
      <Stack.Screen name="notifications" options={{ title: copy.notifications.title }} />
      <Stack.Screen name="messages/new" options={{ title: copy.messages.new }} />
      <Stack.Screen name="announcements/index" options={{ title: copy.announcements.title }} />
      <Stack.Screen name="announcements/new" options={{ title: copy.announcements.title }} />
      <Stack.Screen name="announcements/[id]" options={{ title: copy.announcements.title }} />
      <Stack.Screen name="groups/index" options={{ title: copy.groups.title }} />
      <Stack.Screen name="groups/[id]" options={{ title: copy.groups.title }} />
      <Stack.Screen name="birthdays" options={{ title: copy.birthdays.title }} />
      <Stack.Screen name="people/catechumens/index" options={{ title: copy.people.catechumensTitle }} />
      <Stack.Screen name="people/catechumens/new" options={{ title: copy.people.newCatechumen }} />
      <Stack.Screen name="people/catechumens/[id]" options={{ title: copy.people.catechumensTitle }} />
      <Stack.Screen name="people/families/index" options={{ title: copy.people.familiesTitle }} />
      <Stack.Screen name="people/families/new" options={{ title: copy.people.newFamily }} />
      <Stack.Screen name="people/families/[id]" options={{ title: copy.people.familiesTitle }} />
      <Stack.Screen name="people/team" options={{ title: copy.people.teamTitle }} />
      <Stack.Screen name="people/invites" options={{ title: copy.people.invitesTitle }} />
      <Stack.Screen name="content/library" options={{ title: 'Biblioteca' }} />
      <Stack.Screen name="content/official" options={{ title: 'Pasta oficial' }} />
      <Stack.Screen name="content/catechism/index" options={{ title: 'Catecismo' }} />
      <Stack.Screen name="content/catechism/[number]" options={{ title: 'Catecismo' }} />
      <Stack.Screen name="content/directory/index" options={{ title: 'Diretório' }} />
      <Stack.Screen name="content/directory/[number]" options={{ title: 'Diretório' }} />
      <Stack.Screen name="content/journeys" options={{ title: 'Sacramentos' }} />
      <Stack.Screen name="content/journey-templates" options={{ title: 'Modelos de jornada' }} />
      <Stack.Screen name="manage/parishes" options={{ title: 'Paróquias' }} />
      <Stack.Screen name="manage/communities" options={{ title: 'Comunidades' }} />
      <Stack.Screen name="manage/reports" options={{ title: 'Relatórios' }} />
      <Stack.Screen name="manage/years" options={{ title: 'Anos catequéticos' }} />
      <Stack.Screen name="manage/formation" options={{ title: 'Formação' }} />
      <Stack.Screen name="settings/index" options={{ title: copy.settings.title }} />
      <Stack.Screen name="settings/consents" options={{ title: copy.settings.consents }} />
    </Stack>
  );
}
