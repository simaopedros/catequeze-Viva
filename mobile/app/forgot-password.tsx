import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../src/auth/AuthContext';
import { ForgotPasswordScreen } from '../src/screens/ForgotPasswordScreen';

export default function ForgotPasswordRoute() {
  const { requestPasswordReset } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ForgotPasswordScreen
      busy={busy}
      sent={sent}
      error={error}
      onBack={() => router.replace('/login')}
      onSubmit={async (email) => {
        setBusy(true);
        setError(null);
        try {
          await requestPasswordReset(email);
          setSent(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível enviar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
