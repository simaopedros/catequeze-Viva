import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { displayName, listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { resolveHomeAlertTarget } from '../../../src/home/homeAlertNavigation';
import { pickAttendanceMeetingIdFromDashboard } from '../../../src/meetings/pickAttendanceMeeting';
import { appRoutes } from '../../../src/navigation/routes';
import { HomeScreen } from '../../../src/screens/HomeScreen';

export default function HomeRoute() {
  const { api, user, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.dashboard(workspaceId || undefined), [workspaceId]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const workspaceName = listWorkspaces(bootstrap).find((w) => w.id === workspaceId)?.name;

  return (
    <HomeScreen
      name={displayName(user)}
      firstName={user?.firstName ?? undefined}
      avatarUrl={user?.avatarUrl}
      workspaceName={workspaceName}
      stats={data}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onOpenClasses={() => router.push('/(app)/(tabs)/classes')}
      onOpenCatechumens={() => router.push('/(app)/catechumens')}
      onOpenClass={(id) => router.push(`/(app)/class/${id}`)}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
      onOpenAttendance={(id) => router.push(appRoutes.attendance(id))}
      onOpenAttendanceOverview={(meetingId) => {
        if (meetingId) {
          router.push(appRoutes.attendance(meetingId));
          return;
        }
        router.push(appRoutes.classes);
      }}
      onOpenSacraments={() => router.push(appRoutes.journeys)}
      onOpenAlert={(alert) => {
        const target = resolveHomeAlertTarget(alert, {
          todayMeetingId: pickAttendanceMeetingIdFromDashboard(data),
        });
        if (!target) return;
        if (target.screen === 'messages') router.push(appRoutes.messages);
        else if (target.screen === 'notifications') router.push(appRoutes.notifications);
        else if (target.screen === 'classes') router.push(appRoutes.classes);
        else if (target.screen === 'catechumens') router.push(appRoutes.catechumens);
        else if (target.screen === 'attendance') router.push(appRoutes.attendance(target.meetingId));
      }}
    />
  );
}
