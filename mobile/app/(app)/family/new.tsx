import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import type { FamilyInput } from '../../../src/api/client';
import { useAsync } from '../../../src/hooks/useAsync';
import { useMutation } from '../../../src/hooks/useMutation';
import { FamilyFormScreen } from '../../../src/screens/FamilyFormScreen';

export default function NewFamilyRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const communities = useAsync(() => api.communities(workspaceId || undefined), [workspaceId]);
  const create = useMutation((values: FamilyInput) => api.createFamily({ ...values, workspaceId: workspaceId || undefined }), {
    successMessage: 'Família criada.',
    onSuccess: (created) => router.replace(`/(app)/family/${created.id}`),
  });

  return (
    <FamilyFormScreen
      mode="create"
      communities={Array.isArray(communities.data) ? communities.data : communities.data?.items ?? []}
      busy={create.busy}
      error={create.error}
      onSubmit={(values) => void create.run(values)}
    />
  );
}
