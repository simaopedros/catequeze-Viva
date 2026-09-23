import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PastoralBottomSheet } from '../components/PastoralBottomSheet';
import { ClassMeetingCard, ClassMeetingsHero } from '../components/classMeetingsUi';
import {
  BrandButton,
  EmptyState,
  Field,
  LoadingState,
  PrimaryButton,
  Screen,
  SectionHeader,
} from '../components/ui';
import { countUpcomingMeetings, partitionClassMeetings } from '../meetings/classMeetingsPresentation';
import { asMeetingList, type MeetingListItem } from '../meetings/meetingUtils';
import { colors, radius, spacing, typography } from '../theme';

export function ClassMeetingsScreen({
  className,
  enrollmentCount,
  meetingsPayload,
  loading,
  error,
  creating,
  refreshing,
  onOpenMeeting,
  onOpenAttendance,
  onCreateMeeting,
  onReload,
}: {
  className?: string;
  enrollmentCount?: number;
  meetingsPayload: unknown;
  loading?: boolean;
  error?: string | null;
  creating?: boolean;
  refreshing?: boolean;
  onOpenMeeting: (meetingId: string) => void;
  onOpenAttendance: (meetingId: string) => void;
  onCreateMeeting: (draft: { title: string; theme: string; date: string }) => Promise<void>;
  onReload?: () => void;
}) {
  const meetings = useMemo(() => asMeetingList(meetingsPayload), [meetingsPayload]);
  const { upcoming, past } = useMemo(() => partitionClassMeetings(meetings), [meetings]);
  const upcomingCount = useMemo(() => countUpcomingMeetings(meetings), [meetings]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      Alert.alert('Encontro', 'Indique um título com pelo menos 3 caracteres.');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Encontro', 'Indique a data do encontro.');
      return;
    }
    try {
      await onCreateMeeting({ title: trimmedTitle, theme: theme.trim(), date: date.trim() });
      setTitle('');
      setTheme('');
      setSheetOpen(false);
      onReload?.();
    } catch (err) {
      Alert.alert('Encontro', err instanceof Error ? err.message : 'Não foi possível criar o encontro.');
    }
  };

  const renderSection = (label: string, rows: MeetingListItem[]) => {
    if (rows.length === 0) return null;
    return (
      <View style={styles.section}>
        <SectionHeader title={label} />
        {rows.map((meeting) => (
          <ClassMeetingCard
            key={meeting.id}
            meeting={meeting}
            onOpenMeeting={() => onOpenMeeting(meeting.id)}
            onOpenAttendance={() => onOpenAttendance(meeting.id)}
          />
        ))}
      </View>
    );
  };

  return (
    <Screen
      testID="class-meetings-screen"
      variant="form"
      onRefresh={onReload}
      refreshing={refreshing}
    >
      <ClassMeetingsHero
        className={className}
        enrollmentCount={enrollmentCount}
        meetingCount={meetings.length}
        upcomingCount={upcomingCount}
        onCreate={() => setSheetOpen(true)}
      />

      {loading && meetings.length === 0 ? <LoadingState /> : null}
      {error ? <EmptyState title="Encontros indisponíveis" body={error} /> : null}

      {!loading && !error && meetings.length === 0 ? (
        <EmptyState
          title="Ainda não há encontros"
          body="Crie o primeiro encontro para planear aulas e registar presenças."
        />
      ) : null}

      {!error ? (
        <>
          {renderSection('Próximos', upcoming)}
          {renderSection('Anteriores', past)}
        </>
      ) : null}

      <PastoralBottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        testID="create-meeting-form"
        sheetStyle={styles.sheetExtra}
      >
          <Text style={styles.sheetTitle}>Novo encontro</Text>
          {className ? <Text style={styles.sheetSubtitle}>Turma {className}</Text> : null}
          <Field
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Encontro 12"
            testID="meeting-title"
          />
          <Field
            label="Tema"
            value={theme}
            onChangeText={setTheme}
            placeholder="Ex.: Os dons do Espírito Santo"
          />
          <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} testID="meeting-date" />
          <BrandButton
            testID="create-meeting-submit"
            label={creating ? 'A guardar…' : 'Guardar encontro'}
            onPress={submit}
            disabled={creating}
          />
          <PrimaryButton label="Cancelar" variant="ghost" onPress={() => setSheetOpen(false)} />
      </PastoralBottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[2],
  },
  sheetExtra: {
    padding: spacing[4],
    paddingBottom: spacing[6],
  },
  sheetTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
  },
  sheetSubtitle: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginBottom: spacing[2],
  },
});
