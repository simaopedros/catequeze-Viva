import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import type { ContentInput } from '../../../src/api/client';
import { useMutation } from '../../../src/hooks/useMutation';
import { ContentFormScreen } from '../../../src/screens/ContentScreens';

export default function NewContentRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const create = useMutation((values: ContentInput) => api.createContent({ ...values, workspaceId: workspaceId || undefined }), {
    successMessage: 'Conteúdo criado.',
    onSuccess: (created) => router.replace(`/(app)/content/${created.id}`),
  });
  return <ContentFormScreen mode="create" busy={create.busy} error={create.error} onSubmit={(values) => void create.run(values)} />;
}
