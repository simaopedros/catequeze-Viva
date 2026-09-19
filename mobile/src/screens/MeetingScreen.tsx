import React from 'react';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, IconAction, KeyValue, Row, Screen, ScreenTitle, SkeletonList, Tag } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDateTime } from '../utils/format';

const MEETING_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' | 'danger' }> = {
  SCHEDULED: { label: 'Agendado', tone: 'info' },
  NOT_STARTED: { label: 'Por iniciar', tone: 'neutral' },
  IN_PROGRESS: { label: 'A decorrer', tone: 'warning' },
  COMPLETED: { label: 'Concluído', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'danger' },
};

// Espelha isAllowedMeetingStatusTransition do backend.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ['IN_PROGRESS', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
};

export function MeetingScreen({
  data,
  loading,
  error,
  onAttendance,
  onEdit,
  onChangeStatus,
  onDelete,
  onOpenClass,
  onShare,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onAttendance: () => void;
  onEdit?: () => void;
  onChangeStatus?: (status: string) => void;
  onDelete?: () => void;
  onOpenClass?: () => void;
  onShare?: () => void;
}) {
  if (loading && !data) {
    return (
      <Screen>
        <SkeletonList rows={2} />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen testID="meeting-screen">
        <EmptyState icon="cloud-off-outline" title="Encontro indisponível" body={error || 'Não encontrado.'} />
      </Screen>
    );
  }

  const status = data.status ? MEETING_STATUS[data.status] : null;
  const attendance = data.attendanceSummary || data._count;

  return (
    <Screen testID="meeting-screen">
      <ScreenTitle
        eyebrow={data.class?.name || 'Encontro'}
        title={data.title || data.theme || 'Encontro'}
        subtitle={formatDateTime(data.startsAt || data.date)}
        action={status ? <Tag label={status.label} tone={status.tone} /> : undefined}
      />
      <Row>
        <BrandButton icon="clipboard-check-outline" label="Marcar presenças" onPress={onAttendance} testID="open-attendance" style={{ flex: 1 }} />
        {onEdit ? <IconAction icon="pencil-outline" label="Editar encontro" onPress={onEdit} testID="edit-meeting" /> : null}
      </Row>
      <Card>
        <KeyValue label="Turma" value={data.class?.name} />
        <KeyValue label="Local" value={data.location || data.class?.location} />
        <KeyValue label="Duração" value={data.durationMinutes ? `${data.durationMinutes} min` : undefined} />
        <KeyValue label="Conteúdo" value={data.contentItem?.title || data.content?.title} />
        {attendance ? <KeyValue label="Presenças registadas" value={attendance.presentCount ?? attendance.attendance} /> : null}
      </Card>
      {data.theme && data.title ? (
        <Card>
          <Text variant="labelMedium" style={{ color: colors.goldDark, marginBottom: 4 }}>
            TEMA
          </Text>
          <Text variant="bodyLarge" style={{ color: colors.ink }}>
            {data.theme}
          </Text>
        </Card>
      ) : null}
      {data.notes || data.description ? (
        <Card>
          <Text variant="labelMedium" style={{ color: colors.goldDark, marginBottom: 4 }}>
            NOTAS
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.inkSoft, lineHeight: 22 }}>
            {data.notes || data.description}
          </Text>
        </Card>
      ) : null}
      {onChangeStatus && (ALLOWED_TRANSITIONS[String(data.status)] ?? []).length > 0 ? (
        <Card>
          <Text variant="labelMedium" style={{ color: colors.goldDark, marginBottom: spacing.xs }}>
            ATUALIZAR ESTADO
          </Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {(ALLOWED_TRANSITIONS[String(data.status)] ?? []).map((value) => (
              <BrandButton
                key={value}
                variant={value === 'CANCELLED' ? 'ghost' : value === 'COMPLETED' ? 'primary' : 'gold'}
                icon={value === 'IN_PROGRESS' ? 'play-outline' : value === 'COMPLETED' ? 'check-circle-outline' : 'cancel'}
                label={value === 'IN_PROGRESS' ? 'Iniciar encontro' : value === 'COMPLETED' ? 'Concluir' : 'Cancelar'}
                onPress={() => onChangeStatus(value)}
                style={{ flexGrow: 1, marginTop: 0 }}
                testID={`status-${value}`}
              />
            ))}
          </Row>
        </Card>
      ) : null}
      <Row style={{ flexWrap: 'wrap' }}>
        {onOpenClass ? <BrandButton variant="text" icon="school-outline" label="Ver turma" onPress={onOpenClass} /> : null}
        {onShare ? <BrandButton variant="text" icon="share-variant-outline" label="Partilhar na Comunidade" onPress={onShare} /> : null}
        {onDelete ? <BrandButton variant="text" icon="delete-outline" label="Apagar" onPress={onDelete} testID="delete-meeting" /> : null}
      </Row>
    </Screen>
  );
}
