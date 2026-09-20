import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { copy } from '../../../../src/copy/ptBR';
import { displayPerson } from '../../../../src/format';
import { useAsync } from '../../../../src/hooks/useAsync';
import { BrandButton, ErrorState, GroupedList, ListRow, LoadingState, Screen, ScreenTitle } from '../../../../src/components/ui';

export default function CatechumenDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumenDetails(String(id)), [id]);

  return (
    <Screen>
      <ScreenTitle title={displayPerson(data || {})} subtitle={data?.email} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      <GroupedList>
        <ListRow title={copy.people.familiesTitle} meta={data?.household?.name || '—'} accessory={false} />
        {(data?.enrollments || []).map((enrollment: any) => (
          <ListRow
            key={enrollment.id}
            title={enrollment.class?.name || copy.classes.fallback}
            onPress={() => enrollment.class?.id && router.push(`/(app)/class/${enrollment.class.id}`)}
          />
        ))}
      </GroupedList>
      <BrandButton variant="ghost" label={copy.common.back} onPress={() => router.back()} />
    </Screen>
  );
}
