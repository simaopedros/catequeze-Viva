import React from 'react';
import { copy } from '../copy/ptBR';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';

export function EditProfileScreen({
  handle,
  bio,
  websiteUrl,
  onHandleChange,
  onBioChange,
  onWebsiteChange,
  onSave,
  onOpenProfile,
  onOpenBlocked,
  busy,
  error,
}: {
  handle: string;
  bio: string;
  websiteUrl: string;
  onHandleChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onSave: () => void;
  onOpenProfile?: () => void;
  onOpenBlocked?: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <Screen testID="edit-profile-screen">
      <ScreenTitle title={copy.editProfile.title} subtitle={copy.editProfile.subtitle} />
      <ErrorText message={error} />
      <Field
        label={copy.editProfile.handle}
        placeholder={copy.editProfile.handlePlaceholder}
        value={handle}
        onChangeText={onHandleChange}
        testID="profile-handle"
      />
      <Field
        label={copy.editProfile.bio}
        placeholder={copy.editProfile.bioPlaceholder}
        value={bio}
        onChangeText={onBioChange}
        multiline
        testID="profile-bio"
      />
      <Field
        label={copy.editProfile.website}
        value={websiteUrl}
        onChangeText={onWebsiteChange}
        testID="profile-website"
      />
      <BrandButton
        testID="save-profile"
        label={busy ? copy.common.saving : copy.editProfile.save}
        disabled={busy}
        onPress={onSave}
      />
      {onOpenProfile ? (
        <BrandButton variant="ghost" label={copy.editProfile.viewProfile} onPress={onOpenProfile} testID="open-my-profile" />
      ) : null}
      {onOpenBlocked ? (
        <BrandButton variant="ghost" label={copy.editProfile.blocked} onPress={onOpenBlocked} testID="open-blocked" />
      ) : null}
    </Screen>
  );
}
