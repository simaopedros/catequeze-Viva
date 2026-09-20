import React, { useState } from 'react';
import { DEV_TEST_LOGIN, normalizeLogin } from '../auth/testLogin';
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
  const [email, setEmail] = useState(__DEV__ ? DEV_TEST_LOGIN.email : '');
  const [password, setPassword] = useState(__DEV__ ? DEV_TEST_LOGIN.password : '');

  return (
    <Screen testID="login-screen">
      <AppText variant="overline" color="goldMuted" style={{ marginBottom: 8 }}>
        {copy.brand.toUpperCase()}
      </AppText>
      <ScreenTitle
        title={copy.auth.loginTitle}
        subtitle={__DEV__ ? copy.auth.loginTestHint : copy.auth.loginSubtitle}
      />
      <ErrorText message={error} />
      <Field
        label={copy.auth.email}
        placeholder={copy.auth.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        autoCorrect={false}
        autoCapitalize="none"
        testID="login-email"
      />
      <Field
        label={copy.auth.password}
        placeholder={copy.auth.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        autoCorrect={false}
        autoCapitalize="none"
        testID="login-password"
      />
      <BrandButton
        testID="login-submit"
        label={busy ? copy.auth.submitting : copy.auth.submit}
        disabled={busy || !email || !password}
        onPress={() => {
          const next = normalizeLogin(email, password);
          onSubmit(next.email, next.password);
        }}
      />
      <BrandButton variant="ghost" label={copy.auth.forgot} onPress={onForgotPassword} />
    </Screen>
  );
}
