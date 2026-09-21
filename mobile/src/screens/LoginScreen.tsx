import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginHero } from '../components/LoginHero';
import { ErrorText, Field, PasswordInput, PrimaryButton } from '../components/ui';
import { colors, elevation, radius, spacing, typography } from '../theme';

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
    <SafeAreaView testID="login-screen" style={styles.root} edges={['left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <LoginHero />
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Entrar</Text>
            <Text style={styles.formSubtitle}>Use a mesma conta da plataforma web.</Text>
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
            <Pressable
              onPress={onForgotPassword}
              style={{ alignSelf: 'flex-end', marginBottom: spacing[2], minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.primary[700], fontWeight: '600' }}>Esqueci a senha</Text>
            </Pressable>
            <PrimaryButton
              testID="login-submit"
              label={busy ? 'Entrando…' : 'Entrar'}
              loading={busy}
              disabled={busy || !email || !password}
              onPress={() => onSubmit(email.trim(), password)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, paddingBottom: spacing[8] },
  formCard: {
    marginTop: -32,
    marginHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.card,
  },
  formTitle: { ...typography.headingLg, color: colors.text.primary, textAlign: 'center' },
  formSubtitle: {
    ...typography.bodyMd,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing[4],
    marginTop: spacing[1],
  },
});
