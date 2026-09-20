import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { MobileApiError } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { copy } from '../src/copy/ptBR';
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
      onSignup={() => router.push('/signup')}
      onSubmit={async (email, password) => {
        setBusy(true);
        setError(null);
        try {
          await login(email, password);
        } catch (err) {
          if (err instanceof MobileApiError && err.status === 401) {
            setError(__DEV__ ? copy.auth.loginInvalidDev : copy.auth.loginInvalid);
          } else {
            setError(err instanceof Error ? err.message : copy.auth.loginError);
          }
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
