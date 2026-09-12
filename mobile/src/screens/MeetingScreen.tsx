import React from 'react';
import { Text } from 'react-native';
import { BrandButton, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { formatDate } from '../lib/payload';
import { colors, fonts } from '../theme';

export function MeetingScreen({
  data,
  loading,
  error,
  onAttendance,
  canMarkAttendance = true,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onAttendance: () => void;
  canMarkAttendance?: boolean;
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
      <Screen>
        <EmptyState title="Encontro indisponível" body={error || 'Não encontrado.'} />
      </Screen>
    );
  }

  return (
    <Screen testID="meeting-screen">
      <ScreenTitle title={data.title || data.theme || 'Encontro'} subtitle={data.class?.name || ''} />
      <Text style={{ color: colors.muted, marginBottom: 16, fontFamily: fonts.sans }}>
        {formatDate(data.startsAt || data.date) || ''}
      </Text>
      {data.notes ? (
        <Text style={{ color: colors.inkSoft, marginBottom: 16, fontFamily: fonts.sans }}>{data.notes}</Text>
      ) : null}
      {canMarkAttendance ? (
        <BrandButton label="Marcar presença" onPress={onAttendance} testID="open-attendance" />
      ) : null}
    </Screen>
  );
}
