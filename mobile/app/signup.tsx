import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../src/auth/AuthContext';
import { copy } from '../src/copy/ptBR';
import { SignupScreen } from '../src/screens/SignupScreen';

export default function SignupRoute() {
  const { api, login } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SignupScreen
      busy={busy}
      error={error}
      onLogin={() => router.replace('/login')}
      onSubmit={async (payload) => {
        setBusy(true);
        setError(null);
        try {
          await api.signup(payload);
          await login(payload.email, payload.password);
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.signup.error);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
