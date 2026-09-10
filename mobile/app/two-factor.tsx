import React, { useState } from 'react';
import { useAuth } from '../src/auth/AuthContext';
import { TwoFactorScreen } from '../src/screens/TwoFactorScreen';

export default function TwoFactorRoute() {
  const { verifyTwoFactor, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <TwoFactorScreen
      busy={busy}
      error={error}
      onCancel={() => logout()}
      onSubmit={async (token) => {
        setBusy(true);
        setError(null);
        try {
          await verifyTwoFactor(token);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Código inválido.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
