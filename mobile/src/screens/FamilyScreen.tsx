import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

export function FamilyScreen({
  data,
  loading,
  error,
  onOpenCatechumen,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenCatechumen?: (id: string) => void;
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
      <Screen testID="family-screen">
        <EmptyState title="Família indisponível" body={error || 'Família não encontrada.'} />
      </Screen>
    );
  }

  const guardians = Array.isArray(data.guardians) ? data.guardians : [];
  const catechumens = Array.isArray(data.catechumens) ? data.catechumens : [];

  return (
    <Screen testID="family-screen">
      <ScreenTitle title={data.name || 'Família'} subtitle={data.community?.name || ''} />
      <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: spacing.sm }}>Responsáveis</Text>
      {guardians.length === 0 ? (
        <EmptyState title="Sem responsáveis" body="Ainda não há responsáveis registados nesta família." />
      ) : (
        guardians.map((guardian: any) => (
          <Card key={guardian.id}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>
              {[guardian.user?.firstName, guardian.user?.lastName].filter(Boolean).join(' ') || 'Responsável'}
            </Text>
            {guardian.user?.email ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{guardian.user.email}</Text>
            ) : null}
          </Card>
        ))
      )}
      <Text style={{ color: colors.ink, fontWeight: '700', marginVertical: spacing.sm }}>Catequizandos</Text>
      {catechumens.length === 0 ? (
        <EmptyState title="Sem catequizandos" body="Ainda não há catequizandos nesta família." />
      ) : (
        catechumens.map((catechumen: any) => (
          <Pressable
            key={catechumen.id}
            onPress={() => onOpenCatechumen?.(catechumen.id)}
            testID={`family-catechumen-${catechumen.id}`}
          >
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {[catechumen.firstName, catechumen.lastName].filter(Boolean).join(' ') || 'Catequizando'}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
