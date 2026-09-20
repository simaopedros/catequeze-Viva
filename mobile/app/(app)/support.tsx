import React, { useState } from 'react';
import { useAuth, displayName } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { useAsync } from '../../src/hooks/useAsync';
import { SupportScreen } from '../../src/screens/SecondaryScreens';

export default function SupportRoute() {
  const { api, user } = useAuth();
  const { notify } = useFeedback();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.supportMessages(), []);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <SupportScreen
      items={Array.isArray(data) ? data : []}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      defaultName={displayName(user)}
      defaultEmail={user?.email ?? ''}
      submitting={submitting}
      submitError={submitError}
      onSubmit={async (values) => {
        setSubmitting(true);
        setSubmitError(null);
        try {
          await api.submitSupportMessage(values);
          notify('Pedido enviado. Respondemos por e-mail.', 'success');
          await reload();
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Não foi possível enviar o pedido.';
          setSubmitError(message);
          notify(message, 'error');
          return false;
        } finally {
          setSubmitting(false);
        }
      }}
    />
  );
}
