import React from 'react';
import { ClassListCard } from '../components/pastoralUi';
import { EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';

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
          <ClassListCard
            key={item.id}
            testID={`class-${item.id}`}
            name={item.name || 'Turma'}
            community={item.community?.name}
            year={item.year}
            onPress={() => onOpen(item.id)}
          />
        ))
      )}
    </Screen>
  );
}

export { asList as asClassList };
