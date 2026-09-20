import React, { useState } from 'react';
import { copy } from '../copy/ptBR';
import { Banner, BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';

export function ForgotPasswordScreen({
  onSubmit,
  onBack,
  busy = false,
  error,
  sent = false,
}: {
  onSubmit: (email: string) => Promise<void> | void;
  onBack: () => void;
  busy?: boolean;
  error?: string | null;
  sent?: boolean;
}) {
  const [email, setEmail] = useState('');

  return (
    <Screen testID="forgot-password-screen">
      <ScreenTitle title={copy.auth.recoverTitle} subtitle={copy.auth.recoverSubtitle} />
      <ErrorText message={error} />
      {sent ? (
        <Banner>{copy.auth.recoverSent}</Banner>
      ) : (
        <Field
          label={copy.auth.email}
          placeholder={copy.auth.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          testID="reset-email"
        />
      )}
      {!sent ? (
        <BrandButton
          label={busy ? copy.common.sending : copy.auth.sendLink}
          disabled={busy || !email}
          onPress={() => onSubmit(email.trim())}
        />
      ) : null}
      <BrandButton variant="ghost" label={copy.auth.backToLogin} onPress={onBack} />
    </Screen>
  );
}
