import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { displayName, unreadCount, useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { useFeedback } from '../../../src/components/Feedback';
import { useAsync } from '../../../src/hooks/useAsync';
import { HomeScreen } from '../../../src/screens/HomeScreen';

export default function HomeRoute() {
  const { api, user, bootstrap, workspaceId } = useAuth();
  const permissions = usePermissions();
  const { notify } = useFeedback();
  const router = useRouter();
  const stats = useAsync(() => api.dashboard(workspaceId || undefined), [workspaceId]);
  const focus = useAsync(() => api.dashboardFocus(workspaceId || undefined).catch(() => null), [workspaceId]);
  const announcements = useAsync(() => api.announcements(workspaceId || undefined).catch(() => []), [workspaceId]);
  const birthdays = useAsync(() => (permissions.canOperate ? api.birthdays({ days: 14 }).catch(() => []) : Promise.resolve([])), [workspaceId, permissions.canOperate]);

  useFocusEffect(
    useCallback(() => {
      void focus.reload();
      void announcements.reload();
    }, [focus.reload, announcements.reload]),
  );

  const reloadAll = () => Promise.all([stats.reload(), focus.reload(), announcements.reload(), birthdays.reload()]);

  return (
    <HomeScreen
      name={displayName(user)}
      stats={stats.data}
      loading={stats.loading}
      error={stats.error}
      refreshing={stats.refreshing}
      onRefresh={() => void reloadAll()}
      unread={unreadCount(bootstrap)}
      focus={focus.data}
      announcements={Array.isArray(announcements.data) ? announcements.data : []}
      birthdays={Array.isArray(birthdays.data) ? birthdays.data : []}
      onAcknowledgeAnnouncement={async (id) => {
        try {
          await api.acknowledgeAnnouncement(id);
          notify('Aviso confirmado.', 'success');
          await announcements.reload();
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Não foi possível confirmar.', 'error');
        }
      }}
      onOpenAnnouncements={() => router.push('/(app)/announcements')}
      onOpenBirthdays={() => router.push('/(app)/birthdays')}
      onOpenAttendance={permissions.canOperate ? (meetingId, classId) => router.push({ pathname: `/(app)/meeting/${meetingId}/attendance`, params: classId ? { classId } : {} }) : undefined}
      onSearch={() => router.push('/(app)/search')}
      onOpenCommunity={() => router.push('/(app)/(tabs)/community')}
      onOpenMessages={() => router.push('/(app)/(tabs)/messages')}
      onOpenClasses={() => router.push('/(app)/(tabs)/classes')}
      onOpenBible={() => router.push('/(app)/bible')}
      onOpenNotifications={() => router.push('/(app)/notifications')}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
    />
  );
}
