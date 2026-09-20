import React, { useState } from 'react';
import { copy } from '../copy/ptBR';
import { AppText, BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';

export function LoginScreen({
  onSubmit,
  onForgotPassword,
  busy = false,
  error,
}: {
  onSubmit: (email: string, password: string) => Promise<void> | void;
  onForgotPassword: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen testID="login-screen">
      <AppText variant="overline" color="goldMuted" style={{ marginBottom: 8 }}>
        {copy.brand.toUpperCase()}
      </AppText>
      <ScreenTitle title={copy.auth.loginTitle} subtitle={copy.auth.loginSubtitle} />
      <ErrorText message={error} />
      <Field
        label={copy.auth.email}
        placeholder={copy.auth.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        testID="login-email"
      />
      <Field
        label={copy.auth.password}
        placeholder={copy.auth.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        testID="login-password"
      />
      <BrandButton
        testID="login-submit"
        label={busy ? copy.auth.submitting : copy.auth.submit}
        disabled={busy || !email || !password}
        onPress={() => onSubmit(email.trim(), password)}
      />
      <BrandButton variant="ghost" label={copy.auth.forgot} onPress={onForgotPassword} />
    </Screen>
  );
}
