import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import type { CatechumenInput } from '../../../../src/api/client';
import { Screen, SkeletonList } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { CatechumenFormScreen } from '../../../../src/screens/CatechumenFormScreen';
import { asFamilyList } from '../../../../src/screens/FamiliesListScreen';

export default function EditCatechumenRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const detail = useAsync(() => api.catechumenDetails(String(id)), [id]);
  const families = useAsync(() => api.families({ workspaceId: workspaceId || undefined }), [workspaceId]);
  const update = useMutation((values: CatechumenInput) => api.updateCatechumen(String(id), values), {
    successMessage: 'Ficha atualizada.',
    onSuccess: () => router.back(),
  });

  if (detail.loading && !detail.data) {
    return (
      <Screen>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  return (
    <CatechumenFormScreen
      mode="edit"
      initial={
        detail.data
          ? {
              firstName: detail.data.firstName,
              lastName: detail.data.lastName,
              email: detail.data.email,
              birthDate: detail.data.birthDate,
              householdId: detail.data.householdId ?? detail.data.household?.id ?? null,
            }
          : null
      }
      families={asFamilyList(families.data)}
      busy={update.busy}
      error={update.error ?? detail.error}
      onSubmit={(values) => void update.run(values)}
      onCreateFamily={() => router.push('/(app)/family/new')}
    />
  );
}
