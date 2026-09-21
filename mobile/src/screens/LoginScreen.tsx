import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BrandButton, ErrorText, Field, Screen } from '../components/ui';
import { colors, type } from '../theme';

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
    <Screen testID="login-screen" contentStyle={{ paddingTop: 48 }}>
      <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 13, letterSpacing: 3 }}>CATEQUESE</Text>
      <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 64, lineHeight: 64, letterSpacing: -2, marginTop: 4 }}>
        Viva
      </Text>
      <View style={{ height: 8, width: 72, backgroundColor: colors.gold, marginTop: 16, marginBottom: 28 }} />
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
      <BrandButton variant="ghost" label="Esqueci a senha" onPress={onForgotPassword} />
    </Screen>
  );
}
