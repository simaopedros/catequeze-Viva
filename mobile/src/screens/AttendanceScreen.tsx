import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  BrandButton,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenTitle,
} from '../components/ui';
import { ATTENDANCE_STATUSES, copy, type AttendanceStatus } from '../copy/ptBR';
import { spacing } from '../theme';

export function AttendanceScreen({
  meeting,
  loading,
  error,
  onSave,
  busy,
}: {
  meeting: any;
  loading?: boolean;
  error?: string | null;
  onSave: (catechumenProfileId: string, status: string) => Promise<void> | void;
  busy?: boolean;
}) {
  const rows = useMemo(() => {
    return meeting?.attendance || meeting?.records || meeting?.enrollments || meeting?.catechumens || [];
  }, [meeting]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen testID="attendance-screen">
      <ScreenTitle title={copy.attendance.title} subtitle={copy.attendance.subtitle} />
      {error ? <ErrorState title={copy.attendance.errorTitle} body={error} /> : null}
      {rows.length === 0 ? (
        <EmptyState title={copy.attendance.emptyTitle} body={copy.attendance.emptyBody} />
      ) : (
        rows.map((row: any) => {
          const id = row.catechumenProfileId || row.id;
          const name =
            row.displayName ||
            row.name ||
            [row.firstName, row.lastName].filter(Boolean).join(' ') ||
            copy.attendance.catechumen;
          const status = (draft[id] || row.status || 'PRESENT') as AttendanceStatus;
          return (
            <Card key={id}>
              <AppText variant="titleSm">{name}</AppText>
              <AppText variant="caption" color="secondary" style={{ marginVertical: spacing.xs }}>
                {copy.attendance.status}: {copy.attendance.statuses[status] ?? status}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
                {ATTENDANCE_STATUSES.map((item) => (
                  <Chip
                    key={item}
                    label={copy.attendance.statuses[item]}
                    active={status === item}
                    onPress={() => setDraft((current) => ({ ...current, [id]: item }))}
                  />
                ))}
              </View>
              <BrandButton
                variant="soft"
                label={busy ? copy.attendance.saving : copy.attendance.save}
                disabled={busy}
                onPress={() => onSave(id, status)}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
