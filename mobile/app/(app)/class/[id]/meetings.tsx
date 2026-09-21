import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { appRoutes } from '../../../../src/navigation/routes';
import { ClassMeetingsScreen } from '../../../../src/screens/ClassMeetingsScreen';

export default function ClassMeetingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = String(id);
  const { api } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [creating, setCreating] = useState(false);

  const classDetails = useAsync(() => api.classDetails(classId), [classId]);
  const meetings = useAsync(() => api.meetings(classId), [classId]);

  useLayoutEffect(() => {
    const name = classDetails.data?.name;
    navigation.setOptions({ title: name ? `Encontros · ${name}` : 'Encontros' });
  }, [classDetails.data?.name, navigation]);

  return (
    <ClassMeetingsScreen
      className={classDetails.data?.name}
      meetingsPayload={meetings.data}
      loading={meetings.loading}
      error={meetings.error}
      creating={creating}
      onReload={() => void meetings.reload()}
      onOpenMeeting={(meetingId) => router.push(appRoutes.meeting(meetingId))}
      onOpenAttendance={(meetingId) => router.push(appRoutes.attendance(meetingId))}
      onCreateMeeting={async (draft) => {
        setCreating(true);
        try {
          await api.createMeeting({
            classId,
            title: draft.title,
            theme: draft.theme || undefined,
            date: draft.date,
          });
          await meetings.reload();
          await classDetails.reload();
        } finally {
          setCreating(false);
        }
      }}
    />
  );
}
