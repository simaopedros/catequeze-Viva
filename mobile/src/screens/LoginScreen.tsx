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
    <Screen testID="login-screen">
      <View
        style={{
          backgroundColor: colors.ink,
          borderRadius: 22,
          padding: 24,
          marginBottom: 24,
          marginTop: 24,
        }}
      >
        <Text style={{ color: colors.goldLight, fontFamily: type.bodyBold, letterSpacing: 1.2, fontSize: 12 }}>
          CATEQUESE VIVA
        </Text>
        <Text style={{ color: colors.cream, fontFamily: type.display, fontSize: 40, lineHeight: 44, marginTop: 8 }}>
          Você semeia a fé.
        </Text>
        <Text style={{ color: colors.inkMuted, fontFamily: type.body, marginTop: 8, lineHeight: 22 }}>
          A mesma conta da plataforma, agora no bolso.
        </Text>
      </View>
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
