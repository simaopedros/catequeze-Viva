import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import {
  BrandButton,
  Card,
  EmptyState,
  KeyValue,
  ListCard,
  ListRow,
  Row,
  Screen,
  ScreenTitle,
  SectionHeader,
  FilterChips,
  IconAction,
  SkeletonList,
  StatCard,
  Tag,
} from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDateTime, fullName } from '../utils/format';

function attendanceRate(summary: any): number | null {
  const rate = summary?.attendanceRate;
  // O backend devolve a taxa já em percentagem (0-100).
  if (typeof rate === 'number') return Math.round(rate);
  if (typeof rate === 'string' && rate.trim()) return Number.parseFloat(rate) || null;
  return null;
}

const CATECHIST_ROLE_LABELS: Record<string, string> = {
  LEAD: 'Principal',
  ASSISTANT: 'Auxiliar',
};

const STATUS_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  PAUSED: { label: 'Pausada', tone: 'warning' },
  CONCLUDED: { label: 'Concluída', tone: 'info' },
  ARCHIVED: { label: 'Arquivada', tone: 'neutral' },
};

const MEETING_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' | 'danger' }> = {
  SCHEDULED: { label: 'Agendado', tone: 'info' },
  NOT_STARTED: { label: 'Por iniciar', tone: 'neutral' },
  IN_PROGRESS: { label: 'A decorrer', tone: 'warning' },
  COMPLETED: { label: 'Concluído', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'danger' },
};

export function catechistRoleLabel(role: unknown): string {
  if (typeof role !== 'string' || !role) return '';
  return CATECHIST_ROLE_LABELS[role] ?? role;
}

type Tab = 'overview' | 'enrollments' | 'catechists' | 'meetings';

export function ClassDetailScreen({
  data,
  loading,
  error,
  onOpenMeeting,
  onOpenCatechumen,
  onOpenAttendance,
  onEdit,
  onCreateMeeting,
  onEnroll,
  onOpenChat,
  onManageCatechists,
  onUnenroll,
  refreshing,
  onRefresh,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenCatechumen?: (id: string) => void;
  onOpenAttendance?: () => void;
  onEdit?: () => void;
  onCreateMeeting?: () => void;
  onEnroll?: () => void;
  onOpenChat?: () => void;
  onManageCatechists?: () => void;
  onUnenroll?: (enrollmentId: string, name: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const meetings: any[] = data?.meetings || data?.upcomingMeetings || [];
  const enrollments: any[] = Array.isArray(data?.enrollments) ? data.enrollments : [];
  const catechists: any[] = Array.isArray(data?.catechists) ? data.catechists : [];
  const summary = data?.attendanceSummary;
  const rate = attendanceRate(summary);
  const status = data?.status ? STATUS_LABEL[data.status] : null;

  return (
    <Screen testID="class-detail-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle
        eyebrow={data?.community?.name || 'Turma'}
        title={data?.name || 'Turma'}
        subtitle={[data?.schedule, data?.location].filter(Boolean).join(' · ') || data?.description || undefined}
        action={status ? <Tag label={status.label} tone={status.tone} /> : undefined}
      />
      {loading && !data ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Turma indisponível" body={error} /> : null}
      {data ? (
        <>
          <Row style={{ marginBottom: spacing.sm }}>
            {onOpenAttendance ? <BrandButton icon="clipboard-check-outline" label="Marcar presenças" onPress={onOpenAttendance} testID="open-attendance" style={{ flex: 1 }} /> : null}
            {onOpenChat ? <IconAction icon="message-text-outline" label="Chat da turma" onPress={onOpenChat} testID="open-class-chat" /> : null}
            {onEdit ? <IconAction icon="pencil-outline" label="Editar turma" onPress={onEdit} testID="edit-class" /> : null}
          </Row>
          <FilterChips<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: 'Resumo', icon: 'view-dashboard-outline' },
              {
                value: 'enrollments',
                label: `Inscritos${data?._count?.enrollments != null ? ` (${data._count.enrollments})` : ''}`,
                icon: 'account-child-outline',
              },
              { value: 'catechists', label: 'Cateq.', icon: 'account-tie-outline' },
              { value: 'meetings', label: 'Encontros', icon: 'calendar-outline' },
            ]}
          />

          {tab === 'overview' ? (
            <>
              <Row style={{ alignItems: 'stretch' }}>
                <StatCard label="Encontros" value={summary?.totalMeetings ?? data?._count?.meetings ?? meetings.length} icon="calendar-outline" />
                <StatCard label="Presença" value={rate != null ? `${rate}%` : '—'} icon="chart-arc" />
              </Row>
              <Row style={{ alignItems: 'stretch' }}>
                <StatCard label="Presenças" value={summary?.presentCount ?? 0} icon="check-circle-outline" />
                <StatCard label="Faltas" value={summary?.absentCount ?? 0} icon="close-circle-outline" />
              </Row>
              <Card>
                <KeyValue label="Comunidade" value={data?.community?.name} />
                <KeyValue label="Ano" value={data?.year} />
                <KeyValue label="Horário" value={data?.schedule || data?.meetingDay} />
                <KeyValue label="Local" value={data?.location} />
                <KeyValue label="Capacidade" value={data?.capacity} />
                {data?.description ? (
                  <Text variant="bodyMedium" style={{ color: colors.muted, marginTop: spacing.xs }}>
                    {data.description}
                  </Text>
                ) : null}
              </Card>
            </>
          ) : null}

          {tab === 'enrollments' ? (
            <>
              {onEnroll ? <BrandButton variant="gold" icon="account-plus-outline" label="Inscrever catequizando" onPress={onEnroll} testID="enroll-open" /> : null}
              <SectionHeader title="Catequizandos" icon="account-child-outline" />
              {enrollments.length === 0 ? (
                <EmptyState icon="account-child-outline" title="Sem catequizandos" body="Esta turma ainda não tem inscrições ativas." />
              ) : (
                <ListCard>
                  {enrollments.map((enrollment: any, index: number) => {
                    const profile = enrollment.catechumenProfile || enrollment.catechumen || {};
                    const name = fullName(profile, 'Catequizando');
                    return (
                      <ListRow
                        key={enrollment.id}
                        testID={`catechumen-${profile.id || enrollment.id}`}
                        left={<Avatar name={name} url={profile.avatarUrl} size={36} />}
                        title={name}
                        subtitle={profile.birthDate ? `Nasc. ${profile.birthDate.slice(0, 10)}` : undefined}
                        right={
                          onUnenroll ? (
                            <BrandButton variant="text" label="Remover" onPress={() => onUnenroll(enrollment.id, name)} style={{ marginTop: 0 }} />
                          ) : undefined
                        }
                        onPress={profile.id && onOpenCatechumen ? () => onOpenCatechumen(profile.id) : undefined}
                        last={index === enrollments.length - 1}
                      />
                    );
                  })}
                </ListCard>
              )}
            </>
          ) : null}

          {tab === 'catechists' ? (
            <>
              {onManageCatechists ? <BrandButton variant="gold" icon="account-multiple-plus-outline" label="Gerir catequistas" onPress={onManageCatechists} testID="manage-catechists" /> : null}
              <SectionHeader title="Catequistas" icon="account-tie-outline" />
              {catechists.length === 0 ? (
                <EmptyState icon="account-tie-outline" title="Sem catequistas" body="Ainda não há catequistas atribuídos a esta turma." />
              ) : (
                <ListCard>
                  {catechists.map((entry: any, index: number) => {
                    const user = entry.user || {};
                    const name = fullName(user, 'Catequista');
                    const role = catechistRoleLabel(entry.role);
                    return (
                      <ListRow
                        key={entry.id || user.id || name}
                        left={<Avatar name={name} url={user.avatarUrl} size={36} />}
                        title={name}
                        subtitle={user.email}
                        right={role ? <Tag label={role} tone={entry.role === 'LEAD' ? 'gold' : 'neutral'} /> : undefined}
                        last={index === catechists.length - 1}
                      />
                    );
                  })}
                </ListCard>
              )}
            </>
          ) : null}

          {tab === 'meetings' ? (
            <>
              {onCreateMeeting ? <BrandButton variant="gold" icon="calendar-plus" label="Novo encontro" onPress={onCreateMeeting} testID="create-meeting" /> : null}
              <SectionHeader title="Encontros" icon="calendar-outline" />
              {meetings.length === 0 ? (
                <EmptyState icon="calendar-blank-outline" title="Sem encontros" body="Esta turma ainda não tem encontros listados." />
              ) : (
                <ListCard>
                  {meetings.map((meeting: any, index: number) => {
                    const meetingStatus = meeting.status ? MEETING_STATUS[meeting.status] : null;
                    return (
                      <ListRow
                        key={meeting.id}
                        testID={`meeting-${meeting.id}`}
                        icon="calendar-outline"
                        title={meeting.title || meeting.theme || 'Encontro'}
                        subtitle={formatDateTime(meeting.startsAt || meeting.date)}
                        right={meetingStatus ? <Tag label={meetingStatus.label} tone={meetingStatus.tone} /> : undefined}
                        onPress={() => onOpenMeeting(meeting.id)}
                        last={index === meetings.length - 1}
                      />
                    );
                  })}
                </ListCard>
              )}
            </>
          ) : null}
        </>
      ) : null}
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
