import React from 'react';
import { Text } from 'react-native';
import { BrandButton, CrudBar, EmptyState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { asItems, formatDate, personName, statusLabel } from '../lib/payload';
import { colors, fonts, spacing } from '../theme';

export function ClassDetailScreen({
  data,
  loading,
  error,
  onOpenMeeting,
  onOpenCatechumen,
  onEdit,
  onArchive,
  onCreateMeeting,
  onEnroll,
  canWrite,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenCatechumen?: (id: string) => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onCreateMeeting?: () => void;
  onEnroll?: () => void;
  canWrite?: boolean;
}) {
  const meetings = asItems(data?.meetings).length
    ? asItems(data?.meetings)
    : asItems(data?.upcomingMeetings);
  const enrollments = asItems(data?.enrollments, ['enrollments']);
  const summary = data?.attendanceSummary;

  return (
    <Screen testID="class-detail-screen">
      <ScreenTitle
        title={data?.name || 'Turma'}
        subtitle={[data?.community?.name, data?.stage?.name, data?.sacrament?.name]
          .filter(Boolean)
          .filter((value, index, all) => all.indexOf(value) === index)
          .join(' · ')}
      />
      <CrudBar
        canWrite={canWrite}
        onEdit={onEdit}
        onDelete={onArchive}
        onCreate={onCreateMeeting}
        createLabel="Novo encontro"
        editLabel="Editar turma"
        deleteLabel="Arquivar"
      />
      {canWrite && onEnroll ? (
        <BrandButton variant="ghost" label="Inscrever catequizando" onPress={onEnroll} testID="class-enroll" />
      ) : null}
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turma indisponível" body={error} /> : null}
      {summary ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.sans, marginBottom: spacing.md }}>
          {summary.attendanceRate != null
            ? `${Math.round(Number(summary.attendanceRate))}% de presença`
            : 'Sem taxa ainda'}
          {summary.totalMeetings ? ` · ${summary.totalMeetings} encontros` : ''}
        </Text>
      ) : null}
      <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: 8 }}>Catequizandos</Text>
      {enrollments.length === 0 && !loading ? (
        <EmptyState title="Sem inscritos" body="Esta turma ainda não tem catequizandos inscritos." />
      ) : (
        enrollments.map((row: any) => {
          const profile = row.catechumenProfile || row;
          const id = profile.id || row.catechumenProfileId;
          return (
            <PersonRow
              key={row.id || id}
              name={personName(profile)}
              hint={statusLabel(row.status)}
              photoUrl={profile.photoUrl}
              onPress={() => id && onOpenCatechumen?.(id)}
            />
          );
        })
      )}
      <Text
        style={{
          color: colors.ink,
          fontFamily: fonts.serif,
          fontSize: 20,
          marginBottom: 8,
          marginTop: spacing.sm,
        }}
      >
        Encontros
      </Text>
      {meetings.length === 0 && !loading ? (
        <EmptyState title="Sem encontros" body="Esta turma ainda não tem encontros listados." />
      ) : (
        meetings.map((meeting: any) => (
          <PersonRow
            key={meeting.id}
            name={meeting.title || meeting.theme || 'Encontro'}
            hint={[formatDate(meeting.startsAt || meeting.date), meeting.status ? statusLabel(meeting.status) : '']
              .filter(Boolean)
              .join(' · ')}
            onPress={() => onOpenMeeting(meeting.id)}
          />
        ))
      )}
    </Screen>
  );
}
