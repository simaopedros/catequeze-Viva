import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../src/auth/AuthContext';
import { LoginScreen } from '../src/screens/LoginScreen';

export default function LoginRoute() {
  const { login } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <LoginScreen
      busy={busy}
      error={error}
      onForgotPassword={() => router.push('/forgot-password')}
      onSubmit={async (email, password) => {
        setBusy(true);
        setError(null);
        try {
          await login(email, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
