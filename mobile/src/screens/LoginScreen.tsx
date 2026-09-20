import React, { useState } from 'react';
import { View } from 'react-native';
import { DEV_TEST_LOGIN, normalizeLogin } from '../auth/testLogin';
import { copy } from '../copy/ptBR';
import { AppText, BrandButton, ErrorText, Field, Screen, TextButton } from '../components/ui';
import { spacing } from '../theme';

export function LoginScreen({
  onSubmit,
  onForgotPassword,
  onSignup,
  busy = false,
  error,
}: {
  onSubmit: (email: string, password: string) => Promise<void> | void;
  onForgotPassword: () => void;
  onSignup?: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [email, setEmail] = useState(__DEV__ ? DEV_TEST_LOGIN.email : '');
  const [password, setPassword] = useState(__DEV__ ? DEV_TEST_LOGIN.password : '');

  return (
    <Screen testID="login-screen" tone="ink">
      <AppText variant="overline" color="gold" style={{ marginBottom: spacing.sm }}>
        {copy.brand.toUpperCase()}
      </AppText>
      <AppText variant="display" display color="inverse">
        {copy.auth.loginTitle}
      </AppText>
      <AppText variant="bodySm" color="inkMuted" style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        {__DEV__ ? copy.auth.loginTestHint : copy.auth.loginSubtitle}
      </AppText>
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 16,
        }}
      >
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
        {onSignup ? <TextButton testID="open-signup" label={copy.auth.createAccount} onPress={onSignup} /> : null}
      </View>
    </Screen>
  );
}
