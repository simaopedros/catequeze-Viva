import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import type { FamilyInput } from '../../../../src/api/client';
import { Screen, SkeletonList } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { FamilyFormScreen } from '../../../../src/screens/FamilyFormScreen';

export default function EditFamilyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const detail = useAsync(() => api.familyDetails(String(id)), [id]);
  const update = useMutation((values: FamilyInput) => api.updateFamily(String(id), values), {
    successMessage: 'Família atualizada.',
    onSuccess: () => router.back(),
  });

  if (detail.loading && !detail.data) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  return (
    <FamilyFormScreen
      mode="edit"
      initial={detail.data ? { name: detail.data.name, address: detail.data.address, phone: detail.data.phone } : null}
      communities={[]}
      busy={update.busy}
      error={update.error ?? detail.error}
      onSubmit={(values) => void update.run(values)}
    />
  );
}
