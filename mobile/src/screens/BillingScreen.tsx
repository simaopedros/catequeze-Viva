import React from 'react';
import { Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

export function BillingScreen({
  data,
  loading,
  error,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <Screen testID="billing-screen">
      <ScreenTitle
        title="Assinatura"
        subtitle="O estado do plano nesta conta. Checkout, PIX e portal de faturação ficam na web."
      />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Assinatura indisponível" body={error} /> : null}
      <Card>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>Plano</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>{data?.planId || '—'}</Text>
        <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 12 }}>Estado</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>{data?.status || 'sem cobrança activa'}</Text>
        <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 12 }}>Intervalo</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>
          {data?.interval === 'year' ? 'Anual' : data?.interval === 'month' ? 'Mensal' : '—'}
        </Text>
      </Card>
    </Screen>
  );
}
