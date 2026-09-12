import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, Screen, ScreenTitle, StatusChip } from '../components/ui';
import { personName, statusLabel } from '../lib/payload';
import { colors, spacing } from '../theme';

const STATUSES = [
  { id: 'PRESENT', label: 'Presente', tone: 'success' as const },
  { id: 'ABSENT', label: 'Ausente', tone: 'danger' as const },
  { id: 'LATE', label: 'Atrasado', tone: 'gold' as const },
  { id: 'JUSTIFIED', label: 'Justificado', tone: 'neutral' as const },
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
      meeting?.participants ||
      meeting?.attendance ||
      meeting?.records ||
      meeting?.enrollments ||
      meeting?.catechumens ||
      []
    );
  }, [meeting]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const summary = meeting?.summary;

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen testID="attendance-screen">
      <ScreenTitle
        title="Presença"
        subtitle={meeting?.meeting?.title || meeting?.title || 'Toque no estado e salve cada catequizando.'}
      />
      {error ? <EmptyState title="Não foi possível carregar" body={error} /> : null}
      {summary ? (
        <Card>
          <Text style={{ color: colors.muted }}>Resumo</Text>
          <Text style={{ color: colors.ink, marginTop: 6 }}>
            {summary.registered ?? 0} de {summary.total ?? rows.length} preenchidos
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {summary.present ?? 0} presentes · {summary.absent ?? 0} ausentes · {summary.late ?? 0} atrasados ·{' '}
            {summary.justified ?? 0} justificados
          </Text>
        </Card>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="Sem lista" body="Este encontro ainda não tem catequizandos para marcar." />
      ) : (
        rows.map((row: any) => {
          const id = row.catechumenProfileId || row.catechumenProfile?.id || row.id;
          const name = personName(row.catechumenProfile || row, 'Catequizando');
          const status = draft[id] || row.status || null;
          return (
            <Card key={id}>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{name}</Text>
              <Text style={{ color: colors.muted, marginVertical: 8 }}>
                Estado: {status ? statusLabel(status) || status : 'Não preenchido'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
                {STATUSES.map((item) => (
                  <StatusChip
                    key={item.id}
                    label={item.label}
                    tone={item.tone}
                    selected={status === item.id}
                    onPress={() => setDraft((current) => ({ ...current, [id]: item.id }))}
                  />
                ))}
              </View>
              <BrandButton
                label={busy ? 'Salvando…' : 'Salvar'}
                disabled={busy || !status}
                onPress={() => status && onSave(id, status)}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
