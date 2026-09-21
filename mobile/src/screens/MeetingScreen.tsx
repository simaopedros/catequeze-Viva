import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MeetingBodyText,
  MeetingMaterialRowItem,
  MeetingSectionTitle,
  MeetingSummaryCard,
  MeetingTabBar,
  MeetingThemeHeading,
  type MeetingTabKey,
} from '../components/meetingUi';
import { EmptyState, LoadingState, PrimaryButton } from '../components/ui';
import {
  buildMaterialRows,
  formatMeetingSchedule,
  meetingSummaryText,
  meetingThemeLabel,
} from '../meetings/meetingPresentation';
import { colors, contentHorizontalPadding, spacing } from '../theme';

export function MeetingScreen({
  data,
  loading,
  error,
  onAttendance,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onAttendance: () => void;
}) {
  const { width } = useWindowDimensions();
  const horizontal = contentHorizontalPadding(width);
  const [tab, setTab] = useState<MeetingTabKey>('info');

  const canTakeAttendance = Boolean(data?.permissions?.canTakeAttendance ?? true);

  const scheduleLabel = useMemo(
    () => formatMeetingSchedule(data?.date, data?.content?.estimatedTime),
    [data?.date, data?.content?.estimatedTime],
  );
  const themeLabel = useMemo(() => (data ? meetingThemeLabel(data) : ''), [data]);
  const summary = useMemo(() => (data ? meetingSummaryText(data) : null), [data]);
  const materials = useMemo(() => (data ? buildMaterialRows(data) : []), [data]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <View style={{ paddingHorizontal: horizontal, paddingTop: spacing[4] }}>
          <LoadingState />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <View style={{ paddingHorizontal: horizontal, paddingTop: spacing[4] }}>
          <EmptyState title="Encontro indisponível" body={error || 'Não encontrado.'} />
        </View>
      </SafeAreaView>
    );
  }

  const className = data.class?.name || 'Turma';
  const registered = data.attendanceSummary?.registered ?? 0;
  const totalActive = data.attendanceSummary?.totalActive ?? 0;

  return (
    <SafeAreaView style={styles.root} testID="meeting-screen" edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: horizontal,
          paddingTop: spacing[4],
          paddingBottom: spacing[4],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <MeetingSummaryCard className={className} scheduleLabel={scheduleLabel} />
        <MeetingThemeHeading label={themeLabel} />
        <MeetingTabBar active={tab} onChange={setTab} />

        {tab === 'info' ? (
          <View testID="meeting-tab-panel-info">
            <MeetingSectionTitle>Resumo do encontro</MeetingSectionTitle>
            {summary ? (
              <MeetingBodyText>{summary}</MeetingBodyText>
            ) : (
              <MeetingBodyText>Sem resumo publicado para este encontro.</MeetingBodyText>
            )}

            <MeetingSectionTitle>Materiais</MeetingSectionTitle>
            {materials.length === 0 ? (
              <Text style={styles.muted}>Nenhum material listado.</Text>
            ) : (
              materials.map((row) => <MeetingMaterialRowItem key={row.id} row={row} />)
            )}
          </View>
        ) : null}

        {tab === 'attendance' ? (
          <View testID="meeting-tab-panel-attendance">
            <MeetingSectionTitle>Presença</MeetingSectionTitle>
            {data.attendanceSummary ? (
              <MeetingBodyText>
                {`Chamada registada: ${registered} de ${totalActive} catequizandos ativos.`}
              </MeetingBodyText>
            ) : (
              <MeetingBodyText>Abra a lista de presenças para marcar ou rever a chamada deste encontro.</MeetingBodyText>
            )}
            {data.myAttendance?.status ? (
              <Text style={styles.muted}>Seu registo: {data.myAttendance.status}</Text>
            ) : null}
          </View>
        ) : null}

        {tab === 'content' ? (
          <View testID="meeting-tab-panel-content">
            {data.content?.openingPrayer ? (
              <>
                <MeetingSectionTitle>Oração inicial</MeetingSectionTitle>
                <MeetingBodyText>{data.content.openingPrayer}</MeetingBodyText>
              </>
            ) : null}
            {data.content?.mainContent ? (
              <>
                <MeetingSectionTitle>Conteúdo principal</MeetingSectionTitle>
                <MeetingBodyText>{data.content.mainContent}</MeetingBodyText>
              </>
            ) : null}
            {data.content?.activity ? (
              <>
                <MeetingSectionTitle>Atividade</MeetingSectionTitle>
                <MeetingBodyText>{data.content.activity}</MeetingBodyText>
              </>
            ) : null}
            {!data.content?.openingPrayer && !data.content?.mainContent && !data.content?.activity ? (
              <EmptyState title="Sem conteúdo" body="O conteúdo pedagógico ainda não foi publicado." />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {canTakeAttendance ? (
        <View style={[styles.footer, { paddingHorizontal: horizontal }]}>
          <PrimaryButton
            label="Ver presenças"
            onPress={onAttendance}
            testID="open-attendance"
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  footer: {
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  muted: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacing[4],
  },
});
