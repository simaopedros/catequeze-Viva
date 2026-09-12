import React, { useState } from 'react';
import { Text } from 'react-native';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

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
      <Text style={{ color: colors.goldDark, fontWeight: '700', marginBottom: 8 }}>CATEQUESE VIVA</Text>
      <ScreenTitle title="Entrar" subtitle="Use a mesma conta da plataforma web. A sessão fica salva neste dispositivo." />
      <ErrorText message={error} />
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        testID="login-email"
      />
      <Field
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        testID="login-password"
      />
      <BrandButton
        testID="login-submit"
        label={busy ? 'Entrando…' : 'Entrar'}
        disabled={busy || !email || !password}
        onPress={() => onSubmit(email.trim(), password)}
      />
      <BrandButton variant="ghost" label="Esqueceu a senha?" onPress={onForgotPassword} />
    </Screen>
  );
}
