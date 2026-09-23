import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LoginBrandHeader,
  LoginFooterArt,
  LoginIconField,
  LoginPasswordField,
} from '../components/loginUi';
import { ErrorText, PrimaryButton } from '../components/ui';
import { colors, contentHorizontalPadding, spacing } from '../theme';
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
  const { width } = useWindowDimensions();
  const horizontal = contentHorizontalPadding(width);

  return (
    <SafeAreaView testID="login-screen" style={styles.root} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <LoginBrandHeader />

          <View style={[styles.form, { paddingHorizontal: horizontal }]}>
            <ErrorText message={error} />
            <LoginIconField
              icon="mail"
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              testID="login-email"
            />
            <LoginPasswordField
              value={password}
              onChangeText={setPassword}
              testID="login-password"
            />
            <PrimaryButton
              testID="login-submit"
              label={busy ? 'Entrando…' : 'Entrar'}
              loading={busy}
              disabled={busy || !email || !password}
              onPress={() => onSubmit(email.trim(), password)}
            />
            <Pressable
              onPress={onForgotPassword}
              style={styles.forgot}
              accessibilityRole="link"
              testID="login-forgot"
            >
              <Text style={styles.forgotText}>Esqueci a senha</Text>
            </Pressable>
          </View>

          <LoginFooterArt />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  form: {
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  forgot: {
    alignSelf: 'center',
    marginTop: spacing[4],
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  forgotText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[700],
  },
});
