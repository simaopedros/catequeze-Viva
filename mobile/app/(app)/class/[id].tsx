import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { appRoutes } from '../../../src/navigation/routes';
import { ClassDetailScreen } from '../../../src/screens/ClassDetailScreen';

function firstUpcomingMeetingId(data: any) {
  const meetings = data?.meetings || [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const upcoming = meetings
    .filter((m: any) => m?.date && new Date(m.date) >= start)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0]?.id as string | undefined;
}

export default function ClassRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { data, loading, error } = useAsync(() => api.classDetails(String(id)), [id]);

  const classId = String(id);

  useLayoutEffect(() => {
    if (data?.name) {
      navigation.setOptions({ title: data.name });
    }
  }, [data?.name, navigation]);

  const attendanceMeetingId = useMemo(() => firstUpcomingMeetingId(data), [data]);

  return (
    <ClassDetailScreen
      data={data}
      loading={loading}
      error={error}
      onOpenMeeting={(meetingId) => router.push(appRoutes.meeting(meetingId))}
      onOpenCatechumens={() => router.push(appRoutes.catechumens)}
      onOpenAttendance={
        attendanceMeetingId
          ? () => router.push(appRoutes.attendance(attendanceMeetingId))
          : undefined
      }
      onOpenMeetings={() => {
        const next = firstUpcomingMeetingId(data);
        if (next) router.push(appRoutes.meeting(next));
      }}
      onOpenFamilies={() => router.push(appRoutes.families)}
      onOpenAllMeetings={() => router.push(appRoutes.calendar)}
    />
  );
}
