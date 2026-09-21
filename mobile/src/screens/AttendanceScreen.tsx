import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingState,
  PresenceSelector,
  PrimaryButton,
  Screen,
  ScreenTitle,
} from '../components/ui';
import { spacing, type AttendanceStatusKey } from '../theme';

const API_TO_UI: Record<string, AttendanceStatusKey> = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
};

function normalizeStatus(raw?: string): AttendanceStatusKey {
  if (!raw) return 'PRESENT';
  const key = raw.toUpperCase();
  return API_TO_UI[key] ?? 'PRESENT';
}

export function AttendanceScreen({
  meeting,
  loading,
  error,
  onMark,
  onMarkAllPresent,
  markingId,
  markingAll,
}: {
  meeting: any;
  loading?: boolean;
  error?: string | null;
  onMark: (catechumenProfileId: string, status: AttendanceStatusKey) => Promise<void>;
  onMarkAllPresent?: () => Promise<void>;
  markingId?: string | null;
  markingAll?: boolean;
}) {
  const rows = useMemo(() => {
    return meeting?.attendance || meeting?.records || meeting?.enrollments || meeting?.catechumens || [];
  }, [meeting]);

  const [localStatus, setLocalStatus] = useState<Record<string, AttendanceStatusKey>>({});

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const meetingTitle = meeting?.title || meeting?.theme || 'Chamada';

  return (
    <Screen testID="attendance-screen">
      <ScreenTitle title="Presença" subtitle="Chamada" />
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#17212B', marginBottom: spacing[2] }}>{meetingTitle}</Text>
      {rows.length > 0 && onMarkAllPresent ? (
        <PrimaryButton
          label={markingAll ? 'Marcando…' : 'Marcar todos presentes'}
          onPress={onMarkAllPresent}
          disabled={markingAll}
          variant="secondary"
        />
      ) : null}
      {error ? <ErrorState title="Não foi possível carregar" /> : null}
      {rows.length === 0 ? (
        <EmptyState title="Sem lista" />
      ) : (
        rows.map((row: any) => {
          const id = row.catechumenProfileId || row.id;
          const name =
            row.displayName ||
            row.name ||
            [row.firstName, row.lastName].filter(Boolean).join(' ') ||
            'Catequizando';
          const serverStatus = normalizeStatus(row.status);
          const status = localStatus[id] ?? serverStatus;
          const busy = markingId === id;

          return (
            <View key={id} style={{ marginBottom: 12 }} testID={`attendance.student.${id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <Avatar name={name} size={40} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#17212B', flex: 1 }}>{name}</Text>
              </View>
              <PresenceSelector
                value={status}
                disabled={busy || markingAll}
                onChange={async (next) => {
                  const previous = status;
                  setLocalStatus((current) => ({ ...current, [id]: next }));
                  try {
                    await onMark(id, next);
                  } catch {
                    setLocalStatus((current) => ({ ...current, [id]: previous }));
                    Alert.alert('Presença', 'Não foi possível gravar.');
                  }
                }}
              />
            </View>
          );
        })
      )}
    </Screen>
  );
}
