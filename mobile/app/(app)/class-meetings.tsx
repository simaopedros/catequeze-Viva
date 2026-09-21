import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { paramId } from '../../src/navigation/routeParams';
import { appRoutes } from '../../src/navigation/routes';
import { ClassMeetingsScreen } from '../../src/screens/ClassMeetingsScreen';

export default function ClassMeetingsRoute() {
  const params = useLocalSearchParams<{ classId?: string | string[] }>();
  const classId = useMemo(() => paramId(params.classId), [params.classId]);
  const { api } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [creating, setCreating] = useState(false);

  const classDetails = useAsync(
    () => (classId ? api.classDetails(classId) : Promise.reject(new Error('Turma inválida.'))),
    [classId, api],
  );
  const meetings = useAsync(
    () => (classId ? api.meetings(classId) : Promise.reject(new Error('Turma inválida.'))),
    [classId, api],
  );

  useLayoutEffect(() => {
    const name = classDetails.data?.name;
    navigation.setOptions({ title: name ? `Encontros · ${name}` : 'Encontros' });
  }, [classDetails.data?.name, navigation]);

  if (!classId) {
    return (
      <ClassMeetingsScreen
        meetingsPayload={[]}
        error="Turma não encontrada. Volte e abra a turma novamente."
        onOpenMeeting={() => undefined}
        onOpenAttendance={() => undefined}
        onCreateMeeting={async () => undefined}
      />
    );
  }

  return (
    <ClassMeetingsScreen
      className={classDetails.data?.name}
      meetingsPayload={meetings.data}
      loading={meetings.loading || classDetails.loading}
      error={meetings.error || classDetails.error}
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
