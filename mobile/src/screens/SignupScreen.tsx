import React, { useState } from 'react';
import { View } from 'react-native';
import { copy } from '../copy/ptBR';
import { AppText, BrandButton, ErrorText, Field, Screen } from '../components/ui';
import { radius, spacing } from '../theme';

export function SignupScreen({
  onSubmit,
  onLogin,
  busy = false,
  error,
}: {
  onSubmit: (payload: { email: string; password: string; firstName: string; lastName: string }) => Promise<void> | void;
  onLogin: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  return (
    <Screen testID="signup-screen" tone="ink">
      <AppText variant="overline" color="gold" style={{ marginBottom: spacing.sm }}>
        {copy.brand.toUpperCase()}
      </AppText>
      <AppText variant="display" display color="inverse">
        {copy.signup.title}
      </AppText>
      <AppText variant="bodySm" color="inkMuted" style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        {copy.signup.subtitle}
      </AppText>
      <View style={{ backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md }}>
        <ErrorText message={error} />
        <Field label={copy.signup.firstName} value={firstName} onChangeText={setFirstName} autoCapitalize="words" testID="signup-first" />
        <Field label={copy.signup.lastName} value={lastName} onChangeText={setLastName} autoCapitalize="words" testID="signup-last" />
        <Field
          label={copy.auth.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="signup-email"
        />
        <Field
          label={copy.auth.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="signup-password"
        />
        <BrandButton
          testID="signup-submit"
          label={busy ? copy.signup.submitting : copy.signup.submit}
          disabled={busy || !email || !password}
          onPress={() => onSubmit({ email: email.trim().toLowerCase(), password, firstName, lastName })}
        />
        <BrandButton variant="ghost" label={copy.signup.haveAccount} onPress={onLogin} />
      </View>
    </Screen>
  );
}
