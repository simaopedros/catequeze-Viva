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
    </Stack>
  );
}
