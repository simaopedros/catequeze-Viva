import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandMark, ErrorText, Field, PasswordInput, PrimaryButton, Screen } from '../components/ui';
import { colors, typography } from '../theme';

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
    <Screen testID="login-screen" variant="form">
      <BrandMark />
      <Text style={{ ...typography.headingXl, color: colors.text.primary, textAlign: 'center' }}>Entrar</Text>
      <Text style={{ ...typography.bodyMd, color: colors.text.muted, textAlign: 'center', marginBottom: 24 }}>
        Use a mesma conta da plataforma web.
      </Text>
      <ErrorText message={error} />
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        testID="login-email"
      />
      <PasswordInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        autoComplete="password"
        testID="login-password"
      />
      <Pressable onPress={onForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 8, minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.primary[700], fontWeight: '600' }}>Esqueci a senha</Text>
      </Pressable>
      <PrimaryButton
        testID="login-submit"
        label={busy ? 'Entrando…' : 'Entrar'}
        loading={busy}
        disabled={busy || !email || !password}
        onPress={() => onSubmit(email.trim(), password)}
      />
    </Screen>
  );
}
