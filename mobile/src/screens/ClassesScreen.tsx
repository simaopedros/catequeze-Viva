import React from 'react';
import { EmptyState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';

type ClassItem = {
  id: string;
  name?: string;
  year?: string | number | { name?: string };
  community?: { name?: string };
  stage?: { name?: string };
  sacrament?: { name?: string };
  _count?: { enrollments?: number; meetings?: number };
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
      <ScreenTitle title="Turmas" subtitle="Etapa, comunidade e a próxima agenda." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turmas indisponíveis" body={error} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="Sem turmas" body="Quando pertencer a uma turma, ela aparece aqui." />
      ) : (
        items.map((item) => {
          const yearName = typeof item.year === 'object' ? item.year?.name : item.year;
          const contextLabel = [item.community?.name, item.stage?.name || item.sacrament?.name, yearName]
            .filter(Boolean)
            .join(' · ');
          const enrolled = item._count?.enrollments;
          const meetingCount = item._count?.meetings;
          const counts =
            enrolled != null || meetingCount != null
              ? [
                  enrolled != null ? `${enrolled} catequizandos` : '',
                  meetingCount != null ? `${meetingCount} encontros` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')
              : undefined;
          return (
            <PersonRow
              key={item.id}
              testID={`class-${item.id}`}
              name={item.name || 'Turma'}
              hint={contextLabel || 'Comunidade'}
              chip={counts}
              onPress={() => onOpen(item.id)}
            />
          );
        })
      )}
    </Screen>
  );
}

export { asList as asClassList };
