import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { useMutation } from '../../../src/hooks/useMutation';
import { ClassFormScreen, type ClassFormValues } from '../../../src/screens/ClassFormScreen';

export default function NewClassRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const communities = useAsync(() => api.communities(workspaceId || undefined), [workspaceId]);
  const create = useMutation(({ status: _status, ...values }: ClassFormValues) => api.createClass({ ...values, workspaceId: workspaceId || undefined }), {
    successMessage: 'Turma criada.',
    onSuccess: (created) => router.replace(`/(app)/class/${created.id}`),
  });

  return (
    <ClassFormScreen
      mode="create"
      communities={Array.isArray(communities.data) ? communities.data : communities.data?.items ?? []}
      busy={create.busy}
      error={create.error}
      onSubmit={(values) => void create.run(values)}
    />
  );
}
