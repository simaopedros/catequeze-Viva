import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { BrandButton, EmptyState, ErrorState, LoadingState, Screen, StatusPicker } from '../components/ui';
import { personName } from '../format';
import { colors, type } from '../theme';

export function AttendanceScreen({
  sheet,
  loading,
  error,
  onSave,
  onSaveAllPresent,
  busy,
}: {
  sheet: any;
  loading?: boolean;
  error?: string | null;
  onSave: (catechumenProfileId: string, status: string) => Promise<void> | void;
  onSaveAllPresent?: () => Promise<void> | void;
  busy?: boolean;
}) {
  const meeting = sheet?.meeting;
  const rows = useMemo(() => sheet?.participants || sheet?.attendance || [], [sheet]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const title = meeting?.title || meeting?.theme || 'Presença';

  return (
    <Screen testID="attendance-screen">
      <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold, fontSize: 12 }}>Chamada</Text>
      <Text style={{ color: colors.ink, fontFamily: type.display, fontSize: 32, marginBottom: 12 }}>{title}</Text>
      {error ? <ErrorState title="Não foi possível carregar" body={error} /> : null}
      {onSaveAllPresent && rows.length > 0 ? (
        <BrandButton
          label={busy ? 'Salvando…' : 'Marcar todos presentes'}
          disabled={busy}
          onPress={() => onSaveAllPresent()}
          testID="mark-all-present"
        />
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="Sem lista" body="Este encontro ainda não tem catequizandos para marcar." />
      ) : (
        rows.map((row: any) => {
          const id = row.catechumenProfileId || row.id;
          const name = personName(row);
          const status = draft[id] || row.status || 'PRESENT';
          return (
            <View
              key={id}
              style={{
                backgroundColor: colors.paper,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.line,
                padding: 16,
                marginTop: 12,
              }}
            >
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 }}>{name}</Text>
              <StatusPicker
                value={status}
                onChange={(next) => {
                  setDraft((current) => ({ ...current, [id]: next }));
                  void onSave(id, next);
                }}
              />
            </View>
          );
        })
      )}
    </Screen>
  );
}
