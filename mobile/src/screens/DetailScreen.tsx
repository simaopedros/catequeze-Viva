import React from 'react';
import { Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

export function DetailScreen({
  title,
  subtitle,
  loading,
  error,
  rows,
  children,
  testID,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  rows?: { label: string; value?: string | null }[];
  children?: React.ReactNode;
  testID?: string;
}) {
  if (loading) {
    return (
      <Screen testID={testID}>
        <LoadingState />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen testID={testID}>
        <EmptyState title="Não encontrado" body={error} />
      </Screen>
    );
  }

  return (
    <Screen testID={testID}>
      <ScreenTitle title={title} subtitle={subtitle} />
      {rows && rows.length > 0 ? (
        <Card>
          {rows
            .filter((row) => row.value)
            .map((row) => (
              <Text key={row.label} style={{ color: colors.ink, marginBottom: spacing.sm }}>
                <Text style={{ fontWeight: '700' }}>{row.label}: </Text>
                {row.value}
              </Text>
            ))}
        </Card>
      ) : null}
      {children}
    </Screen>
  );
}
