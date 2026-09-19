import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import type { CatechumenInput } from '../../../src/api/client';
import { useAsync } from '../../../src/hooks/useAsync';
import { useMutation } from '../../../src/hooks/useMutation';
import { CatechumenFormScreen } from '../../../src/screens/CatechumenFormScreen';
import { asFamilyList } from '../../../src/screens/FamiliesListScreen';

export default function NewCatechumenRoute() {
  const { householdId } = useLocalSearchParams<{ householdId?: string }>();
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const families = useAsync(() => api.families({ workspaceId: workspaceId || undefined }), [workspaceId]);
  const create = useMutation((values: CatechumenInput) => api.createCatechumen({ ...values, workspaceId: workspaceId || undefined }), {
    successMessage: 'Catequizando criado.',
    onSuccess: (created) => router.replace(`/(app)/catechumen/${created.id}`),
  });

  return (
    <CatechumenFormScreen
      mode="create"
      initial={householdId ? { householdId } : null}
      families={asFamilyList(families.data)}
      busy={create.busy}
      error={create.error}
      onSubmit={(values) => void create.run(values)}
      onCreateFamily={() => router.push('/(app)/family/new')}
    />
  );
}
