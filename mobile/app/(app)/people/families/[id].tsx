import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { copy } from '../../../../src/copy/ptBR';
import { displayPerson } from '../../../../src/format';
import { useAsync } from '../../../../src/hooks/useAsync';
import { ErrorState, GroupedList, ListRow, LoadingState, Screen, ScreenTitle } from '../../../../src/components/ui';

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(() => api.familyDetails(String(id), workspaceId || undefined), [id, workspaceId]);
  return (
    <Screen>
      <ScreenTitle title={data?.name || copy.people.familiesTitle} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      <GroupedList header={copy.people.catechumensTitle}>
        {(data?.catechumens || []).map((item: any) => (
          <ListRow key={item.id} title={displayPerson(item)} accessory={false} />
        ))}
      </GroupedList>
    </Screen>
  );
}
