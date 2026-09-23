import React, { useState } from 'react';
import { OtpCodeInput } from '../components/OtpCodeInput';
import { ErrorText, PrimaryButton, Screen, ScreenTitle } from '../components/ui';

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
      <OtpCodeInput testID="totp-input" value={token} onChange={setToken} />
      <PrimaryButton
        testID="totp-submit"
        label={busy ? 'A verificar…' : 'Continuar'}
        disabled={busy || token.length < 6}
        onPress={() => onSubmit(token)}
      />
      <PrimaryButton variant="ghost" label="Sair" onPress={onCancel} />
    </Screen>
  );
}
