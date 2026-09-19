import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth, usePermissions } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { useAsync } from '../../src/hooks/useAsync';
import { BirthdaysScreen } from '../../src/screens/BirthdaysScreen';

export default function BirthdaysRoute() {
  const { api } = useAuth();
  const permissions = usePermissions();
  const { notify } = useFeedback();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const { data, loading, error, reload, refreshing } = useAsync(() => api.birthdays({ days }), [days]);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <BirthdaysScreen
      items={Array.isArray(data) ? data : []}
      loading={loading}
      error={error}
      days={days}
      onChangeDays={setDays}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      busyId={busyId}
      canManage={permissions.canOperate}
      onOpenCatechumen={(id) => router.push(`/(app)/catechumen/${id}`)}
      onToggleGift={async (catechumenId) => {
        setBusyId(catechumenId);
        try {
          await api.toggleBirthdayGift(catechumenId);
          await reload();
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Não foi possível atualizar.', 'error');
        } finally {
          setBusyId(null);
        }
      }}
    />
  );
}
