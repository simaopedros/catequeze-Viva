import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useAuth, usePermissions } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { ClassAttendanceMatrixScreen } from '../../../../src/screens/ClassAttendanceMatrixScreen';

export default function ClassAttendanceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const detail = useAsync(() => api.classDetails(String(id)), [id]);
  const matrix = useAsync(
    () => api.classAttendanceMatrix(String(id), { toDate: new Date(Date.now() + 365 * 86400000).toISOString(), take: 80 }),
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      if (matrix.data) void matrix.reload();
    }, [matrix.reload]),
  );

  const meetings = Array.isArray(matrix.data) ? matrix.data : matrix.data?.meetings ?? [];

  return (
    <ClassAttendanceMatrixScreen
      className={detail.data?.name}
      meetings={meetings}
      enrolledCount={detail.data?._count?.enrollments ?? detail.data?.enrollments?.length}
      loading={matrix.loading}
      error={matrix.error}
      refreshing={matrix.refreshing}
      onRefresh={() => void matrix.reload()}
      onOpenMeeting={(meetingId) => router.push({ pathname: `/(app)/meeting/${meetingId}/attendance`, params: { classId: String(id) } })}
      onCreateMeeting={permissions.canOperate ? () => router.push({ pathname: '/(app)/meeting/new', params: { classId: String(id), className: detail.data?.name ?? '' } }) : undefined}
    />
  );
}
