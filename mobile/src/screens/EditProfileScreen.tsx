import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { BrandButton, ErrorText, Field, Icon, ListCard, ListRow, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import { colors, spacing } from '../theme';

export function EditProfileScreen({
  handle,
  bio,
  websiteUrl,
  avatarUrl,
  displayName,
  onHandleChange,
  onBioChange,
  onWebsiteChange,
  onSave,
  onPickAvatar,
  onOpenProfile,
  onOpenBlocked,
  busy,
  avatarBusy,
  error,
}: {
  handle: string;
  bio: string;
  websiteUrl: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  onHandleChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onSave: () => void;
  onPickAvatar?: () => void;
  onOpenProfile?: () => void;
  onOpenBlocked?: () => void;
  busy?: boolean;
  avatarBusy?: boolean;
  error?: string | null;
}) {
  return (
    <Screen testID="edit-profile-screen">
      <ScreenTitle title="Editar perfil" subtitle="O @ e a bio aparecem no seu cartão público da Comunidade." />
      <ErrorText message={error} />
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <Pressable onPress={onPickAvatar} disabled={!onPickAvatar || avatarBusy} testID="pick-avatar" accessibilityRole="button" accessibilityLabel="Mudar foto de perfil">
          <View style={{ borderWidth: 3, borderColor: colors.gold, borderRadius: 60, padding: 3 }}>
            <Avatar name={displayName || handle} url={avatarUrl} size={96} testID="profile-avatar" />
          </View>
          {onPickAvatar ? (
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cream }}>
              <Icon name={avatarBusy ? 'progress-upload' : 'camera-outline'} size={17} color={colors.white} />
            </View>
          ) : null}
        </Pressable>
        {onPickAvatar ? (
          <Text variant="labelMedium" style={{ color: colors.muted, marginTop: spacing.xs }}>
            {avatarBusy ? 'A enviar foto…' : 'Toque para mudar a foto'}
          </Text>
        ) : null}
      </View>
      <Field label="O seu @" icon="at" value={handle} onChangeText={onHandleChange} testID="profile-handle" helper="Letras, números e sublinhado." />
      <Field label="Bio" icon="text-short" value={bio} onChangeText={onBioChange} multiline numberOfLines={3} testID="profile-bio" />
      <Field label="Sítio (opcional)" icon="link-variant" value={websiteUrl} onChangeText={onWebsiteChange} keyboardType="url" testID="profile-website" />
      <BrandButton testID="save-profile" icon="content-save-outline" label={busy ? 'A guardar…' : 'Guardar perfil público'} loading={busy} disabled={busy} onPress={onSave} />
      {onOpenProfile || onOpenBlocked ? (
        <>
          <SectionHeader title="Mais" />
          <ListCard>
            {onOpenProfile ? <ListRow icon="account-circle-outline" title="Ver o meu perfil" onPress={onOpenProfile} testID="open-my-profile" last={!onOpenBlocked} /> : null}
            {onOpenBlocked ? <ListRow icon="account-cancel-outline" title="Contas bloqueadas" onPress={onOpenBlocked} testID="open-blocked" last /> : null}
          </ListCard>
        </>
      ) : null}
    </Screen>
  );
}
