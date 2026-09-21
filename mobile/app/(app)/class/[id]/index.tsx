import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { pickAttendanceMeetingId } from '../../../../src/meetings/meetingUtils';
import { appRoutes } from '../../../../src/navigation/routes';
import { ClassDetailScreen } from '../../../../src/screens/ClassDetailScreen';

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

  const meetings = data?.meetings || [];
  const attendanceMeetingId = useMemo(() => pickAttendanceMeetingId(meetings), [meetings]);

  const openMeetingsHub = () => router.push(appRoutes.classMeetings(classId));

  return (
    <ClassDetailScreen
      data={data}
      loading={loading}
      error={error}
      onOpenMeeting={(meetingId) => router.push(appRoutes.meeting(meetingId))}
      onOpenCatechumens={() => router.push(appRoutes.catechumens)}
      onOpenAttendance={() => {
        if (attendanceMeetingId) {
          router.push(appRoutes.attendance(attendanceMeetingId));
          return;
        }
        openMeetingsHub();
      }}
      onOpenMeetings={openMeetingsHub}
      onOpenFamilies={() => router.push(appRoutes.families)}
      onOpenAllMeetings={openMeetingsHub}
    />
  );
}
