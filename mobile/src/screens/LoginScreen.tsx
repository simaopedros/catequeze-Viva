import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { BrandButton, ErrorText, Field, Screen } from '../components/ui';
import { colors, fontFamilies, spacing } from '../theme';

export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 24,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}
      >
        <Image source={require('../../assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 24 }} />
      </View>
      <Text style={{ color: colors.goldDark, fontFamily: fontFamilies.semibold, letterSpacing: 2, fontSize: 12 }}>CATEQUESE VIVA</Text>
      <Text variant="displaySmall" style={{ color: colors.ink, marginTop: 6, textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.muted, marginTop: 6, textAlign: 'center', maxWidth: 320 }}>
        {subtitle}
      </Text>
    </View>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Screen testID="login-screen" safeTop>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AuthHero title="Entrar" subtitle="Use a mesma conta da plataforma web. A sessão fica guardada neste telemóvel." />
        <ErrorText message={error} />
        <Field
          label="E-mail"
          icon="email-outline"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          testID="login-email"
        />
        <Field
          label="Palavra-passe"
          icon="lock-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password"
          textContentType="password"
          testID="login-password"
          right={
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
          }
          onSubmitEditing={() => email && password && onSubmit(email.trim(), password)}
        />
        <BrandButton
          testID="login-submit"
          icon="login"
          label={busy ? 'A entrar…' : 'Entrar'}
          loading={busy}
          disabled={busy || !email || !password}
          onPress={() => onSubmit(email.trim(), password)}
        />
        <BrandButton variant="text" label="Esqueci a palavra-passe" onPress={onForgotPassword} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return <TextInput.Icon icon={visible ? 'eye-off-outline' : 'eye-outline'} onPress={onToggle} color={colors.muted} forceTextInputFocus={false} />;
}
