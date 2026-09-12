import React from 'react';
import { Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { planLabel, subscriptionStatusLabel } from '../lib/billing';
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
        <Text style={{ color: colors.muted, marginTop: 6 }}>{planLabel(data?.planId || data?.planName)}</Text>
        <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 12 }}>Estado</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>
          {subscriptionStatusLabel(data?.status) || 'sem cobrança activa'}
        </Text>
        {data?.interval === 'year' || data?.interval === 'month' ? (
          <>
            <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 12 }}>Intervalo</Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              {data.interval === 'year' ? 'Anual' : 'Mensal'}
            </Text>
          </>
        ) : null}
      </Card>
    </Screen>
  );
}
