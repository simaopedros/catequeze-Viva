import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { SwitchField } from '../components/forms';
import { BrandButton, Card, ErrorText, Field, Icon, Row, Screen, ScreenTitle, SectionHeader, SkeletonList, Tag } from '../components/ui';
import { colors, fontFamilies, spacing } from '../theme';

const EMAIL_TOPICS: Record<string, { label: string; hint: string }> = {
  LIFECYCLE: { label: 'Conta e segurança', hint: 'Alertas de início de sessão e alterações importantes.' },
  PRODUCT_UPDATES: { label: 'Novidades da plataforma', hint: 'Funcionalidades e dicas de uso.' },
  PASTORAL_ANNOUNCEMENTS: { label: 'Avisos pastorais', hint: 'Comunicações da coordenação por e-mail.' },
};

export function SettingsScreen({
  user,
  onSaveProfile,
  savingProfile,
  profileError,
  onChangePassword,
  changingPassword,
  passwordError,
  emailPreferences,
  onTogglePreference,
  twoFactor,
  twoFactorSetup,
  onStartTwoFactor,
  onVerifyTwoFactor,
  onDisableTwoFactor,
  twoFactorBusy,
  twoFactorError,
  onRequestDataExport,
  exporting,
  loading,
}: {
  user: { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null } | null;
  onSaveProfile: (values: { firstName: string; lastName: string; phone?: string }) => Promise<void> | void;
  savingProfile?: boolean;
  profileError?: string | null;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  changingPassword?: boolean;
  passwordError?: string | null;
  emailPreferences?: Record<string, boolean> | null;
  onTogglePreference?: (topic: string, optedIn: boolean) => void;
  twoFactor?: { enabled: boolean; required?: boolean } | null;
  twoFactorSetup?: { secret?: string; otpauthUrl?: string } | null;
  onStartTwoFactor?: () => void;
  onVerifyTwoFactor?: (token: string) => Promise<void> | void;
  onDisableTwoFactor?: (token: string) => Promise<void> | void;
  twoFactorBusy?: boolean;
  twoFactorError?: string | null;
  onRequestDataExport?: () => void;
  exporting?: boolean;
  loading?: boolean;
}) {
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.firstName, user?.lastName, user?.phone]);

  const mismatch = passwordTouched && newPassword !== confirmPassword ? 'As palavras-passe não coincidem.' : null;
  const tooShort = passwordTouched && newPassword.length < 8 ? 'Mínimo de 8 caracteres.' : null;

  if (loading && !user) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  return (
    <Screen testID="settings-screen">
      <ScreenTitle title="Definições" subtitle={user?.email ?? undefined} />

      <SectionHeader title="Perfil" icon="account-outline" />
      <Card>
        <ErrorText message={profileError} />
        <Field label="Nome" icon="account-outline" value={firstName} onChangeText={setFirstName} autoCapitalize="words" testID="settings-first-name" />
        <Field label="Apelido" value={lastName} onChangeText={setLastName} autoCapitalize="words" testID="settings-last-name" />
        <Field label="Telefone" icon="phone-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="settings-phone" />
        <BrandButton icon="content-save-outline" label={savingProfile ? 'A guardar…' : 'Guardar perfil'} loading={savingProfile} disabled={savingProfile || !firstName.trim()} onPress={() => void onSaveProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || undefined })} testID="settings-save-profile" />
      </Card>

      <SectionHeader title="Segurança" icon="shield-lock-outline" />
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: colors.ink }}>
              Verificação em dois passos
            </Text>
            <Text variant="bodySmall" style={{ color: colors.muted }}>
              {twoFactor?.enabled ? 'Ativa — pedimos um código da app autenticadora ao entrar.' : 'Proteja a conta com uma app autenticadora (Google Authenticator, Authy…).'}
            </Text>
          </View>
          <Tag label={twoFactor?.enabled ? 'Ativa' : 'Inativa'} tone={twoFactor?.enabled ? 'success' : twoFactor?.required ? 'warning' : 'neutral'} />
        </Row>
        <ErrorText message={twoFactorError} />
        {twoFactorSetup?.secret ? (
          <Card tone="paper">
            <Text variant="labelMedium" style={{ color: colors.goldDark }}>
              1. Introduza esta chave na app autenticadora
            </Text>
            <Text selectable style={{ fontFamily: fontFamilies.semibold, fontSize: 18, letterSpacing: 2, color: colors.ink, marginVertical: spacing.xs }} testID="totp-secret">
              {twoFactorSetup.secret.replace(/(.{4})/g, '$1 ').trim()}
            </Text>
            <Text variant="labelMedium" style={{ color: colors.goldDark, marginTop: spacing.xs }}>
              2. Confirme com o código de 6 dígitos
            </Text>
            <Field label="Código" icon="shield-key-outline" value={token} onChangeText={(value) => setToken(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} testID="settings-totp" />
            <BrandButton icon="check" label={twoFactorBusy ? 'A verificar…' : 'Ativar verificação'} loading={twoFactorBusy} disabled={twoFactorBusy || token.length < 6} onPress={async () => { await onVerifyTwoFactor?.(token); setToken(''); }} testID="settings-verify-totp" />
          </Card>
        ) : twoFactor?.enabled ? (
          <>
            <Field label="Código atual para desativar" icon="shield-key-outline" value={token} onChangeText={(value) => setToken(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} testID="settings-totp" />
            <BrandButton variant="ghost" icon="shield-off-outline" label={twoFactorBusy ? 'A desativar…' : 'Desativar verificação'} loading={twoFactorBusy} disabled={twoFactorBusy || token.length < 6 || Boolean(twoFactor?.required)} onPress={async () => { await onDisableTwoFactor?.(token); setToken(''); }} />
            {twoFactor?.required ? (
              <Text variant="bodySmall" style={{ color: colors.muted, marginTop: spacing.xs }}>
                A verificação é obrigatória para o seu papel nesta paróquia.
              </Text>
            ) : null}
          </>
        ) : onStartTwoFactor ? (
          <BrandButton variant="gold" icon="shield-plus-outline" label={twoFactorBusy ? 'A preparar…' : 'Ativar verificação em dois passos'} loading={twoFactorBusy} disabled={twoFactorBusy} onPress={onStartTwoFactor} testID="settings-start-totp" />
        ) : null}
      </Card>

      <Card>
        <Text variant="titleSmall" style={{ color: colors.ink, marginBottom: spacing.sm }}>
          Alterar palavra-passe
        </Text>
        <ErrorText message={passwordError} />
        <Field label="Palavra-passe atual" icon="lock-outline" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry testID="settings-current-password" />
        <Field label="Nova palavra-passe" icon="lock-plus-outline" value={newPassword} onChangeText={setNewPassword} secureTextEntry error={tooShort} testID="settings-new-password" />
        <Field label="Confirmar nova palavra-passe" icon="lock-check-outline" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry error={mismatch} testID="settings-confirm-password" />
        <BrandButton
          variant="tonal"
          icon="key-change"
          label={changingPassword ? 'A alterar…' : 'Alterar palavra-passe'}
          loading={changingPassword}
          disabled={changingPassword || !currentPassword || !newPassword}
          onPress={async () => {
            setPasswordTouched(true);
            if (newPassword.length < 8 || newPassword !== confirmPassword) return;
            const ok = await onChangePassword(currentPassword, newPassword);
            if (ok) {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setPasswordTouched(false);
            }
          }}
          testID="settings-change-password"
        />
      </Card>

      {emailPreferences && onTogglePreference ? (
        <>
          <SectionHeader title="E-mails" icon="email-outline" />
          {Object.entries(EMAIL_TOPICS).map(([topic, meta]) => (
            <SwitchField key={topic} label={meta.label} hint={meta.hint} value={Boolean(emailPreferences[topic])} onChange={(value) => onTogglePreference(topic, value)} testID={`pref-${topic}`} />
          ))}
        </>
      ) : null}

      {onRequestDataExport ? (
        <>
          <SectionHeader title="Privacidade" icon="shield-account-outline" />
          <Card>
            <Row>
              <Icon name="database-export-outline" color={colors.goldDark} />
              <Text variant="bodyMedium" style={{ color: colors.inkSoft, flex: 1 }}>
                Peça uma cópia dos seus dados. Enviamos um e-mail quando estiver pronta.
              </Text>
            </Row>
            <BrandButton variant="ghost" label={exporting ? 'A pedir…' : 'Pedir exportação de dados'} loading={exporting} disabled={exporting} onPress={onRequestDataExport} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
