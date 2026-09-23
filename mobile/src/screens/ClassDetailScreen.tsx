import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  CLASS_DETAIL_ACTIONS,
  ClassActionButton,
  ClassMeetingPreviewRow,
  ClassSummaryCard,
  formatClassMeetingWhen,
} from '../components/classDetailUi';
import { EmptyState, LoadingState, Screen, SectionHeader } from '../components/ui';
import { colors, spacing } from '../theme';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  date?: string;
  startsAt?: string;
};

function enrollmentOf(data: any) {
  return data?.enrollmentCount ?? data?.catechumenCount ?? data?._count?.enrollments ?? 0;
}

function meetingDate(meeting: Meeting) {
  return meeting.date || meeting.startsAt;
}

function upcomingMeetings(meetings: Meeting[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return meetings
    .filter((m) => {
      const raw = meetingDate(m);
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d >= startOfToday;
    })
    .sort((a, b) => new Date(meetingDate(a)!).getTime() - new Date(meetingDate(b)!).getTime());
}

export function ClassDetailScreen({
  data,
  loading,
  error,
  onOpenMeeting,
  onOpenCatechumens,
  onOpenAttendance,
  onOpenMeetings,
  onOpenFamilies,
  onOpenAllMeetings,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenCatechumens?: () => void;
  onOpenAttendance?: () => void;
  onOpenMeetings?: () => void;
  onOpenFamilies?: () => void;
  onOpenAllMeetings?: () => void;
}) {
  const meetings = (data?.meetings || data?.upcomingMeetings || []) as Meeting[];
  const upcoming = useMemo(() => upcomingMeetings(meetings), [meetings]);
  const preview = upcoming.slice(0, 3);
  const name = data?.name || 'Turma';
  const enrollment = enrollmentOf(data);

  const actions = [
    { key: 'catechumens', onPress: onOpenCatechumens },
    { key: 'attendance', onPress: onOpenAttendance },
    { key: 'meetings', onPress: onOpenMeetings },
    { key: 'families', onPress: onOpenFamilies },
  ] as const;

  const visibleActions = actions.filter((action) => Boolean(action.onPress));

  return (
    <Screen testID="class-detail-screen">
      <ClassSummaryCard name={name} enrollmentCount={enrollment} />

      <Text style={{ color: colors.text.muted, fontSize: 13, marginBottom: spacing[3] }}>
        Encontros e presença: use os atalhos abaixo. «Encontros» permite criar sessões; «Presença» abre a chamada.
      </Text>

      <View testID="class-actions" style={{ marginBottom: spacing[4] }}>
        {visibleActions.map((action) => {
          const meta = CLASS_DETAIL_ACTIONS[action.key];
          return (
            <ClassActionButton
              key={action.key}
              testID={`class-action-${action.key}`}
              label={meta.label}
              icon={meta.icon}
              onPress={action.onPress!}
            />
          );
        })}
      </View>

      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turma indisponível" body={error} /> : null}

      <SectionHeader title="Próximos encontros" actionLabel="Ver todas" onAction={onOpenAllMeetings} />

      {!loading && preview.length === 0 ? (
        <EmptyState title="Sem encontros" body="Esta turma ainda não tem encontros agendados." />
      ) : (
        preview.map((meeting) => (
          <ClassMeetingPreviewRow
            key={meeting.id}
            whenLabel={formatClassMeetingWhen(meetingDate(meeting))}
            theme={meeting.theme || meeting.title}
            onPress={() => onOpenMeeting(meeting.id)}
          />
        ))
      )}

      {!loading && preview.length > 0 && meetings.length > preview.length && onOpenAllMeetings ? (
        <Pressable onPress={onOpenAllMeetings} style={{ marginTop: spacing[2], minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.primary[700], fontWeight: '600', textAlign: 'center' }}>Ver mais encontros</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
