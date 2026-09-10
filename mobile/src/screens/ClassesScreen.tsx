import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

type ClassItem = {
  id: string;
  name?: string;
  year?: string | number;
  community?: { name?: string };
};

function asList(payload: any): ClassItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.classes)) return payload.classes;
  return [];
}

export function ClassesScreen({
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
    <Screen testID="classes-screen">
      <ScreenTitle title="Turmas" subtitle="Encontros, catequizandos e presença." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turmas indisponíveis" body={error} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="Sem turmas" body="Quando pertencer a uma turma, ela aparece aqui." />
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.id)} testID={`class-${item.id}`}>
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>{item.name || 'Turma'}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {item.community?.name || 'Comunidade'} {item.year ? `· ${item.year}` : ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

export { asList as asClassList };
