import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

export function CatechumenScreen({
  data,
  loading,
  error,
  onOpenFamily,
  onOpenClass,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenFamily?: (id: string) => void;
  onOpenClass?: (id: string) => void;
}) {
  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen testID="catechumen-screen">
        <EmptyState title="Catequizando indisponível" body={error || 'Perfil não encontrado.'} />
      </Screen>
    );
  }

  const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Catequizando';
  const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
  const journeys = Array.isArray(data.sacramentalJourneys) ? data.sacramentalJourneys : [];

  return (
    <Screen testID="catechumen-screen">
      <ScreenTitle title={name} subtitle={data.parish?.name || ''} />
      {data.household ? (
        <Pressable onPress={() => data.household?.id && onOpenFamily?.(data.household.id)} testID="open-family">
          <Card>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Família</Text>
            <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 2 }}>
              {data.household.name || 'Família'}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {(data.household.guardians || [])
                .map((g: any) => [g.user?.firstName, g.user?.lastName].filter(Boolean).join(' ') || g.user?.email)
                .filter(Boolean)
                .join(', ') || 'Sem responsáveis registados'}
            </Text>
          </Card>
        </Pressable>
      ) : null}
      <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: spacing.sm }}>Turmas</Text>
      {enrollments.length === 0 ? (
        <EmptyState title="Sem turmas" body="Este catequizando ainda não está inscrito em turmas." />
      ) : (
        enrollments.map((enrollment: any) => (
          <Pressable
            key={enrollment.id}
            onPress={() => enrollment.class?.id && onOpenClass?.(enrollment.class.id)}
            testID={`enrollment-${enrollment.id}`}
          >
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{enrollment.class?.name || 'Turma'}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {enrollment.class?.stage?.name || enrollment.status || ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
      {journeys.length > 0 ? (
        <>
          <Text style={{ color: colors.ink, fontWeight: '700', marginVertical: spacing.sm }}>
            Percursos sacramentais
          </Text>
          {journeys.map((journey: any) => {
            const milestones = Array.isArray(journey.milestones) ? journey.milestones : [];
            const done = milestones.filter((m: any) => m.status === 'DONE' || m.status === 'COMPLETED').length;
            return (
              <Card key={journey.id}>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>
                  {journey.template?.name || 'Percurso'}
                </Text>
                <Text style={{ color: colors.muted, marginTop: 4 }}>
                  {done}/{milestones.length} marcos concluídos
                </Text>
              </Card>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}
