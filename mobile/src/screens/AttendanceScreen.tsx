import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AttendanceHeaderCard,
  AttendanceSaveButton,
  AttendanceSearchField,
  AttendanceStudentRow,
} from '../components/attendanceUi';
import { EmptyState, LoadingState } from '../components/ui';
import {
  collectAttendanceChanges,
  computeSummaryFromLocal,
  cycleAttendanceStatus,
  filterParticipantsByQuery,
  mapAttendanceSheet,
  type AttendanceParticipant,
} from '../meetings/attendancePresentation';
import { formatMeetingSchedule } from '../meetings/meetingPresentation';
import { colors, contentHorizontalPadding, spacing, type AttendanceStatusKey } from '../theme';

function defaultStatusForParticipant(p: AttendanceParticipant): AttendanceStatusKey {
  return p.serverStatus ?? 'PRESENT';
}

export function AttendanceScreen({
  sheet,
  loading,
  error,
  saving,
  onSave,
}: {
  sheet: any;
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
  onSave: (changes: Array<{ catechumenProfileId: string; status: string }>) => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const horizontal = contentHorizontalPadding(width);
  const [query, setQuery] = useState('');
  const [localStatus, setLocalStatus] = useState<Record<string, AttendanceStatusKey>>({});

  const mapped = useMemo(() => {
    const base = mapAttendanceSheet(sheet);
    if (!base) return null;
    const scheduleLabel = formatMeetingSchedule(sheet?.meeting?.date, sheet?.meeting?.estimatedTime);
    const classSubtitle = base.className;
    return {
      ...base,
      scheduleLabel,
      participants: base.participants.map((p) => ({ ...p, subtitle: classSubtitle })),
    };
  }, [sheet]);

  useEffect(() => {
    if (!mapped) return;
    const seed: Record<string, AttendanceStatusKey> = {};
    for (const p of mapped.participants) {
      seed[p.id] = defaultStatusForParticipant(p);
    }
    setLocalStatus(seed);
    setQuery('');
  }, [mapped?.meetingId, sheet?.fetchedAt]);

  const filtered = useMemo(() => {
    if (!mapped) return [];
    return filterParticipantsByQuery(mapped.participants, query);
  }, [mapped, query]);

  const summary = useMemo(() => {
    if (!mapped) {
      return { total: 0, present: 0, absent: 0, justified: 0 };
    }
    return computeSummaryFromLocal(mapped.participants, localStatus);
  }, [mapped, localStatus]);

  const dirtyCount = useMemo(() => {
    if (!mapped) return 0;
    return collectAttendanceChanges(mapped.participants, localStatus).length;
  }, [mapped, localStatus]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <View style={{ paddingHorizontal: horizontal, paddingTop: spacing[4] }}>
          <LoadingState />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !mapped) {
    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <View style={{ paddingHorizontal: horizontal, paddingTop: spacing[4] }}>
          <EmptyState title="Presença indisponível" body={error || 'Não foi possível carregar a chamada.'} />
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    const changes = collectAttendanceChanges(mapped.participants, localStatus);
    if (changes.length === 0) {
      Alert.alert('Presença', 'Não há alterações para guardar.');
      return;
    }
    try {
      await onSave(changes);
    } catch (err) {
      Alert.alert('Presença', err instanceof Error ? err.message : 'Não foi possível gravar.');
    }
  };

  return (
    <SafeAreaView style={styles.root} testID="attendance-screen" edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: horizontal, paddingTop: spacing[2], paddingBottom: spacing[4] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AttendanceHeaderCard
          className={mapped.className}
          scheduleLabel={mapped.scheduleLabel}
          summary={summary}
        />
        <AttendanceSearchField value={query} onChangeText={setQuery} />

        {filtered.length === 0 ? (
          <EmptyState title="Nenhum resultado" body="Tente outro nome na busca." />
        ) : (
          <View style={styles.listCard}>
            {filtered.map((p) => {
              const status = localStatus[p.id] ?? defaultStatusForParticipant(p);
              return (
                <AttendanceStudentRow
                  key={p.id}
                  testID={`attendance.student.${p.id}`}
                  name={p.name}
                  subtitle={p.subtitle}
                  status={status}
                  disabled={saving}
                  onCycleStatus={() => {
                    const next = cycleAttendanceStatus(status);
                    setLocalStatus((current) => ({ ...current, [p.id]: next }));
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: horizontal }]}>
        <AttendanceSaveButton
          label={saving ? 'A guardar…' : dirtyCount > 0 ? `Guardar presenças (${dirtyCount})` : 'Guardar presenças'}
          onPress={() => void handleSave()}
          testID="attendance-save"
          disabled={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    paddingHorizontal: spacing[4],
    overflow: 'hidden',
  },
  footer: {
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    backgroundColor: colors.surface,
  },
});
