import React, { useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

const STATUSES = [
  { id: 'PRESENT', label: 'Presente' },
  { id: 'ABSENT', label: 'Ausente' },
  { id: 'LATE', label: 'Atraso' },
  { id: 'JUSTIFIED', label: 'Justificada' },
] as const;

export function AttendanceScreen({
  meeting,
  loading,
  error,
  onSave,
  busy,
}: {
  meeting: any;
  loading?: boolean;
  error?: string | null;
  onSave: (catechumenProfileId: string, status: string) => Promise<void> | void;
  busy?: boolean;
}) {
  const rows = useMemo(() => {
    return (
      meeting?.attendance ||
      meeting?.records ||
      meeting?.enrollments ||
      meeting?.catechumens ||
      []
    );
  }, [meeting]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen testID="attendance-screen">
      <ScreenTitle title="Presença" subtitle="Toque no estado e grave cada catequizando." />
      {error ? <EmptyState title="Não foi possível carregar" body={error} /> : null}
      {rows.length === 0 ? (
        <EmptyState title="Sem lista" body="Este encontro ainda não tem catequizandos para marcar." />
      ) : (
        rows.map((row: any) => {
          const id = row.catechumenProfileId || row.id;
          const name =
            row.displayName ||
            row.name ||
            [row.firstName, row.lastName].filter(Boolean).join(' ') ||
            'Catequizando';
          const status = draft[id] || row.status || 'PRESENT';
          return (
            <Card key={id}>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{name}</Text>
              <Text style={{ color: colors.muted, marginVertical: 8 }}>Estado: {status}</Text>
              {STATUSES.map((item) => (
                <Pressable key={item.id} onPress={() => setDraft((current) => ({ ...current, [id]: item.id }))}>
                  <Text style={{ color: status === item.id ? colors.goldDark : colors.muted, marginBottom: 4 }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
              <BrandButton label={busy ? 'A gravar…' : 'Gravar'} disabled={busy} onPress={() => onSave(id, status)} />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
