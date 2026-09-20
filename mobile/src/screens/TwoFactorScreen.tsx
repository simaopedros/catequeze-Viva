import React, { useState } from 'react';
import { copy } from '../copy/ptBR';
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
      <ScreenTitle title={copy.auth.twoFactorTitle} subtitle={copy.auth.twoFactorSubtitle} />
      <ErrorText message={error} />
      <Field
        label={copy.auth.code}
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        testID="totp-input"
      />
      <BrandButton
        testID="totp-submit"
        label={busy ? copy.auth.verifying : copy.auth.continue}
        disabled={busy || token.length < 6}
        onPress={() => onSubmit(token)}
      />
      <BrandButton variant="ghost" label={copy.auth.leave} onPress={onCancel} />
    </Screen>
  );
}
