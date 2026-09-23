import React from 'react';
import { Text, View } from 'react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PrimaryButton,
  Screen,
  ScreenIntro,
  ScreenTitle,
} from '../components/ui';
import { colors, spacing, typography } from '../theme';

export function AnnouncementsScreen({
  rows,
  loading,
  error,
  refreshing,
  onOpen,
  onRefresh,
}: {
  rows: any[];
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onOpen: (id: string) => void;
  onRefresh?: () => void;
}) {
  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenIntro text="Avisos da paróquia." />
      {loading && rows.length === 0 ? <LoadingState /> : null}
      {error ? <ErrorState title="Comunicados indisponíveis" /> : null}
      {!loading && !error && rows.length === 0 ? <EmptyState title="Nenhum comunicado" /> : null}
      {rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.title}
          subtitle={row.acknowledged ? 'Leitura confirmada' : 'Aguardando confirmação · toque para abrir'}
          onPress={() => onOpen(row.id)}
        />
      ))}
    </Screen>
  );
}

export function AnnouncementDetailScreen({
  item,
  loading,
  error,
  onAcknowledge,
  busy,
}: {
  item: any;
  loading?: boolean;
  error?: string | null;
  onAcknowledge: () => void;
  busy?: boolean;
}) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !item) return <Screen><ErrorState title="Comunicados indisponíveis" /></Screen>;

  return (
    <Screen>
      <Text style={{ ...typography.headingMd, color: colors.text.primary, marginBottom: spacing[3] }}>{item.title}</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text.secondary }}>{item.body}</Text>
      {item.requireAck && !item.acknowledged ? (
        <PrimaryButton label={busy ? 'Confirmando…' : 'Confirmar leitura'} onPress={onAcknowledge} loading={busy} variant="accent" />
      ) : (
        <Text style={{ marginTop: spacing[4], color: colors.success, fontWeight: '600' }}>Leitura confirmada</Text>
      )}
    </Screen>
  );
}

export function JourneysScreen({
  rows,
  loading,
  error,
  refreshing,
  onOpen,
  onRefresh,
}: {
  rows: any[];
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onOpen: (id: string) => void;
  onRefresh?: () => void;
}) {
  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenIntro text="Marcos sacramentais dos catequizandos." />
      {loading && rows.length === 0 ? <LoadingState /> : null}
      {error ? <ErrorState title="Jornadas indisponíveis" /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="Sem jornadas. Quando uma jornada for aberta na web, ela aparece aqui." />
      ) : null}
      {rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.catechumenName || 'Catequizando'}
          subtitle={row.templateName || 'Jornada sacramental'}
          onPress={() => onOpen(row.id)}
        />
      ))}
    </Screen>
  );
}

export function JourneyDetailScreen({
  journey,
  loading,
  error,
  onToggleMilestone,
  busyId,
}: {
  journey: any;
  loading?: boolean;
  error?: string | null;
  onToggleMilestone: (milestoneId: string, completed: boolean) => void;
  busyId?: string | null;
}) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !journey) return <Screen><ErrorState title="Jornada indisponível" /></Screen>;

  const name = [journey.catechumenProfile?.firstName, journey.catechumenProfile?.lastName].filter(Boolean).join(' ');

  return (
    <Screen>
      <ScreenTitle title={name || 'Jornada'} subtitle={journey.template?.name} />
      {(journey.milestones || []).map((milestone: any) => {
        const completed = milestone.status === 'COMPLETED';
        return (
          <Card key={milestone.id}>
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>{milestone.templateMilestone?.name || milestone.name}</Text>
            <Text style={{ color: colors.text.muted, marginVertical: 4 }}>{completed ? 'Concluído' : 'Pendente'}</Text>
            <PrimaryButton
              label={completed ? 'Marcar como pendente' : 'Marcar como concluído'}
              variant="secondary"
              loading={busyId === milestone.id}
              disabled={busyId === milestone.id}
              onPress={() => onToggleMilestone(milestone.id, !completed)}
            />
          </Card>
        );
      })}
    </Screen>
  );
}
