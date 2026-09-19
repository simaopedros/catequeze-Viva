import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import type { GuardianInput } from '../../../../src/api/client';
import { ConfirmDialog, Screen, SkeletonList } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { GuardianFormScreen } from '../../../../src/screens/FamilyFormScreen';

export default function GuardianRoute() {
  const { id, guardianId, familyName } = useLocalSearchParams<{ id: string; guardianId?: string; familyName?: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const detail = useAsync(() => (guardianId ? api.familyDetails(String(id)) : Promise.resolve(null)), [id, guardianId]);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const guardian = useMemo(() => (detail.data?.guardians ?? []).find((item: any) => item.id === guardianId), [detail.data, guardianId]);

  const save = useMutation(
    (values: GuardianInput) => (guardianId ? api.updateGuardian(String(id), String(guardianId), values) : api.addGuardian(String(id), values)),
    { successMessage: guardianId ? 'Responsável atualizado.' : 'Responsável adicionado.', onSuccess: () => router.back() },
  );
  const remove = useMutation(() => api.removeGuardian(String(id), String(guardianId)), {
    successMessage: 'Responsável removido.',
    onSuccess: () => router.back(),
  });

  if (guardianId && detail.loading && !detail.data) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  return (
    <>
      <GuardianFormScreen
        mode={guardianId ? 'edit' : 'create'}
        familyName={familyName || detail.data?.name}
        initial={
          guardian
            ? {
                firstName: guardian.firstName ?? guardian.user?.firstName ?? '',
                lastName: guardian.lastName ?? guardian.user?.lastName ?? '',
                phone: guardian.phone ?? guardian.user?.phone ?? '',
                relationship: guardian.relationship ?? undefined,
              }
            : null
        }
        busy={save.busy}
        error={save.error ?? detail.error}
        onSubmit={(values) => void save.run(values)}
        onRemove={guardianId ? () => setConfirmRemove(true) : undefined}
      />
      <ConfirmDialog
        visible={confirmRemove}
        title="Remover responsável"
        body="O responsável deixa de estar ligado a esta família."
        confirmLabel="Remover"
        destructive
        loading={remove.busy}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          await remove.run();
          setConfirmRemove(false);
        }}
      />
    </>
  );
}
