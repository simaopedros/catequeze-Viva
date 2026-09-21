import React from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { asList, personName } from '../format';
import { colors, type } from '../theme';

export function JourneysScreen({
  payload,
  loading,
  error,
  onOpen,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  const items = asList(payload);
  return (
    <Screen testID="journeys-screen">
      <ScreenTitle title="Jornadas" subtitle="O caminho sacramental de cada catequizando." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Jornadas indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Sem jornadas" body="Quando uma jornada for aberta na web, ela aparece aqui." />
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.id)}>
            <PersonRow
              name={personName(item.catechumenProfile, item.template?.name || 'Jornada')}
              detail={item.template?.sacrament?.name || item.template?.name || ''}
            />
          </Pressable>
        ))
      )}
    </Screen>
  );
}

export function JourneyDetailScreen({
  journey,
  loading,
  error,
  busy,
  onToggle,
}: {
  journey: any;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  onToggle: (milestoneId: string, status: 'COMPLETED' | 'PENDING') => void;
}) {
  const milestones = journey?.milestones || [];
  return (
    <Screen testID="journey-detail">
      <ScreenTitle
        title={personName(journey?.catechumenProfile, 'Jornada')}
        subtitle={journey?.template?.sacrament?.name || journey?.template?.name}
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Jornada indisponível" body={error} /> : null}
      {milestones.map((milestone: any) => {
        const done = milestone.status === 'COMPLETED' || milestone.status === 'APPROVED';
        const name = milestone.templateMilestone?.name || milestone.name || 'Marco';
        return (
          <Card key={milestone.id}>
            <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>{name}</Text>
            <Text style={{ color: done ? colors.success : colors.muted, marginTop: 4, fontFamily: type.body }}>
              {done ? 'Concluído' : 'Pendente'}
            </Text>
            <BrandButton
              variant={done ? 'ghost' : 'primary'}
              label={busy ? 'Salvando…' : done ? 'Marcar como pendente' : 'Marcar como concluído'}
              disabled={busy}
              onPress={() => onToggle(milestone.id, done ? 'PENDING' : 'COMPLETED')}
            />
          </Card>
        );
      })}
    </Screen>
  );
}
