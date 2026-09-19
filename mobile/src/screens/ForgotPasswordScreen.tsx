import React, { useState } from 'react';
import { BrandButton, Card, ErrorText, Field, Icon, Row, Screen } from '../components/ui';
import { Text } from 'react-native-paper';
import { colors } from '../theme';
import { AuthHero } from './LoginScreen';

export function ForgotPasswordScreen({
  onSubmit,
  onBack,
  busy = false,
  error,
  sent = false,
}: {
  onSubmit: (email: string) => Promise<void> | void;
  onBack: () => void;
  busy?: boolean;
  error?: string | null;
  sent?: boolean;
}) {
  const [email, setEmail] = useState('');

  return (
    <Screen testID="forgot-password-screen">
      <AuthHero title="Recuperar acesso" subtitle="Enviamos um link se o e-mail existir na Catequese Viva." />
      <ErrorText message={error} />
      {sent ? (
        <Card tone="gold">
          <Row>
            <Icon name="email-check-outline" color={colors.goldDark} />
            <Text variant="bodyMedium" style={{ color: colors.goldDark, flex: 1 }}>
              Se a conta existir, o e-mail já foi enviado. Verifique também a pasta de spam.
            </Text>
          </Row>
        </Card>
      ) : (
        <Field label="E-mail" icon="email-outline" value={email} onChangeText={setEmail} keyboardType="email-address" testID="reset-email" />
      )}
      {!sent ? (
        <BrandButton icon="send-outline" label={busy ? 'A enviar…' : 'Enviar link'} loading={busy} disabled={busy || !email} onPress={() => onSubmit(email.trim())} />
      ) : null}
      <BrandButton variant="text" label="Voltar ao início de sessão" onPress={onBack} />
    </Screen>
  );
}
