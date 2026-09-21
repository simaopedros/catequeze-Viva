import React, { useState } from 'react';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';

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
      <ScreenTitle
        title="Recuperar acesso"
        subtitle="Enviamos um link se o e-mail existir na Catequese Viva."
      />
      <ErrorText message={error} />
      {sent ? (
        <ScreenTitle title="" subtitle="Se a conta existir, o e-mail já foi enviado." />
      ) : (
        <Field label="E-mail" value={email} onChangeText={setEmail} testID="reset-email" />
      )}
      {!sent ? (
        <BrandButton
          label={busy ? 'Enviando…' : 'Enviar link'}
          disabled={busy || !email}
          onPress={() => onSubmit(email.trim())}
        />
      ) : null}
      <BrandButton variant="ghost" label="Voltar ao login" onPress={onBack} />
    </Screen>
  );
}
