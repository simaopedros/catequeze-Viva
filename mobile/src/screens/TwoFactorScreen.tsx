import React, { useState } from 'react';
import { BrandButton, ErrorText, Field, HeroHeader, Screen } from '../components/ui';

export function TwoFactorScreen({
  onSubmit,
  onCancel,
  busy = false,
  error,
}: {
  onSubmit: (token: string) => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [token, setToken] = useState('');

  return (
    <Screen testID="two-factor-screen">
      <HeroHeader
        kicker="Conta"
        title="Um código, e entra"
        subtitle="Os 6 dígitos do autenticador. Letras grandes, um campo só."
      />
      <ErrorText message={error} />
      <Field
        label="Código"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        maxLength={6}
        testID="totp-input"
      />
      <BrandButton
        testID="totp-submit"
        label={busy ? 'Verificando…' : 'Continuar'}
        disabled={busy || token.length < 6}
        onPress={() => onSubmit(token)}
      />
      <BrandButton variant="ghost" label="Sair" onPress={onCancel} />
    </Screen>
  );
}
