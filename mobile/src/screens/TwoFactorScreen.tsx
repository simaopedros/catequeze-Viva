import React, { useState } from 'react';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';

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
      <ScreenTitle
        title="Verificação em dois passos"
        subtitle="Introduza o código de 6 dígitos da aplicação autenticadora."
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
        label={busy ? 'A verificar…' : 'Continuar'}
        disabled={busy || token.length < 6}
        onPress={() => onSubmit(token)}
      />
      <BrandButton variant="ghost" label="Sair" onPress={onCancel} />
    </Screen>
  );
}
