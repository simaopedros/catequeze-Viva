import React, { useState } from 'react';
import { BrandButton, ErrorText, Field, Screen } from '../components/ui';
import { AuthHero } from './LoginScreen';

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
      <AuthHero title="Verificação em dois passos" subtitle="Introduza o código de 6 dígitos da aplicação autenticadora." />
      <ErrorText message={error} />
      <Field
        label="Código"
        icon="shield-key-outline"
        value={token}
        onChangeText={(value) => setToken(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        testID="totp-input"
        style={{ letterSpacing: 6, fontSize: 22, textAlign: 'center' }}
      />
      <BrandButton
        testID="totp-submit"
        icon="check"
        label={busy ? 'A verificar…' : 'Continuar'}
        loading={busy}
        disabled={busy || token.length < 6}
        onPress={() => onSubmit(token)}
      />
      <BrandButton variant="text" label="Sair" onPress={onCancel} />
    </Screen>
  );
}
