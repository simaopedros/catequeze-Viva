import React from 'react';
import { View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';

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
      <ScreenTitle
        title="Editar perfil"
        subtitle="O @ e a bio aparecem no seu cartão público da Comunidade."
      />
      <ErrorText message={error} />
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Avatar name={displayName || handle} url={avatarUrl} size={88} testID="profile-avatar" />
      </View>
      {onPickAvatar ? (
        <BrandButton
          variant="ghost"
          label={avatarBusy ? 'A enviar foto…' : 'Mudar foto de perfil'}
          disabled={avatarBusy}
          onPress={onPickAvatar}
          testID="pick-avatar"
        />
      ) : null}
      <Field label="O seu @" value={handle} onChangeText={onHandleChange} testID="profile-handle" />
      <Field label="Bio" value={bio} onChangeText={onBioChange} multiline testID="profile-bio" />
      <Field
        label="Sítio (opcional)"
        value={websiteUrl}
        onChangeText={onWebsiteChange}
        testID="profile-website"
      />
      <BrandButton
        testID="save-profile"
        label={busy ? 'A guardar…' : 'Guardar perfil público'}
        disabled={busy}
        onPress={onSave}
      />
      {onOpenProfile ? (
        <BrandButton variant="ghost" label="Ver o meu perfil" onPress={onOpenProfile} testID="open-my-profile" />
      ) : null}
      {onOpenBlocked ? (
        <BrandButton variant="ghost" label="Contas bloqueadas" onPress={onOpenBlocked} testID="open-blocked" />
      ) : null}
    </Screen>
  );
}
