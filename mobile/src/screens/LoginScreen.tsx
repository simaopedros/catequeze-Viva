import React, { useState } from 'react';
import { View } from 'react-native';
import { BrandButton, ErrorText, Field, HeroHeader, Screen } from '../components/ui';

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
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen testID="login-screen">
      <HeroHeader
        kicker="Catequese Viva"
        title="Bem-vindo de volta"
        subtitle="A mesma conta da web. Um passo de cada vez."
      />
      <ErrorText message={error} />
      {step === 'email' ? (
        <View>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            testID="login-email"
          />
          <BrandButton
            testID="login-next"
            label="Continuar"
            disabled={!email.trim()}
            onPress={() => setStep('password')}
          />
        </View>
      ) : (
        <View>
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
          <BrandButton variant="ghost" label="Usar outro e-mail" onPress={() => setStep('email')} />
        </View>
      )}
      <BrandButton variant="ghost" label="Esqueceu a senha?" onPress={onForgotPassword} />
    </Screen>
  );
}
