import React, { useState } from 'react';
import type { SocialProfile, Workspace } from '../api/types';
import { BrandButton, ConfirmSheet, ErrorText, Field, ListRow, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import { copy } from '../copy/ptBR';

export function MoreScreen({
  name,
  workspaces,
  workspaceId,
  profile,
  onSelectWorkspace,
  onOpenBible,
  onOpenDocuments,
  onOpenCommunity,
  onOpenEditProfile,
  onOpenProfile,
  onOpenNotifications,
  onSaveProfile,
  onLogout,
  handle,
  bio,
  onHandleChange,
  onBioChange,
  saving,
  error,
}: {
  name: string;
  workspaces: Workspace[];
  workspaceId: string | null;
  profile?: SocialProfile | null;
  onSelectWorkspace: (id: string) => void;
  onOpenBible: () => void;
  onOpenDocuments: () => void;
  onOpenCommunity?: () => void;
  onOpenEditProfile?: () => void;
  onOpenProfile: () => void;
  onOpenNotifications?: () => void;
  onSaveProfile?: () => void;
  onLogout: () => void;
  handle?: string;
  bio?: string;
  onHandleChange?: (value: string) => void;
  onBioChange?: (value: string) => void;
  saving?: boolean;
  error?: string | null;
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Screen testID="more-screen">
      <ScreenTitle title={copy.more.title} subtitle={name} />
      <ListRow icon="book-outline" title={copy.more.bible} onPress={onOpenBible} testID="open-bible" />
      <ListRow icon="document-text-outline" title={copy.more.documents} onPress={onOpenDocuments} />
      {onOpenCommunity ? (
        <ListRow icon="people-outline" title={copy.more.communityAreas} onPress={onOpenCommunity} testID="open-community" />
      ) : null}
      {onOpenNotifications ? (
        <ListRow icon="notifications-outline" title={copy.home.notifications} onPress={onOpenNotifications} />
      ) : null}
      {profile?.handle ? (
        <ListRow icon="person-outline" title={copy.more.viewProfile(profile.handle)} onPress={onOpenProfile} />
      ) : null}
      {onOpenEditProfile ? (
        <ListRow icon="create-outline" title={copy.more.editProfile} onPress={onOpenEditProfile} testID="open-edit-profile" />
      ) : null}
      <SectionHeader title={copy.more.workspace} />
      {workspaces.map((workspace) => (
        <ListRow
          key={workspace.id}
          icon="business-outline"
          title={workspace.name}
          selected={workspace.id === workspaceId}
          onPress={() => onSelectWorkspace(workspace.id)}
        />
      ))}
      {onHandleChange && onBioChange && onSaveProfile ? (
        <>
          <SectionHeader title={copy.editProfile.title} />
          <ErrorText message={error} />
          <Field
            label={copy.editProfile.handle}
            placeholder={copy.editProfile.handlePlaceholder}
            value={handle ?? ''}
            onChangeText={onHandleChange}
            testID="profile-handle"
          />
          <Field
            label={copy.editProfile.bio}
            placeholder={copy.editProfile.bioPlaceholder}
            value={bio ?? ''}
            onChangeText={onBioChange}
            multiline
            testID="profile-bio"
          />
          <BrandButton
            testID="save-profile-more"
            label={saving ? copy.common.saving : copy.more.saveProfile}
            disabled={saving}
            onPress={onSaveProfile}
          />
        </>
      ) : null}
      <BrandButton
        variant="danger"
        label={copy.more.logout}
        onPress={() => setConfirmLogout(true)}
        testID="logout-button"
      />
      <ConfirmSheet
        visible={confirmLogout}
        title={copy.more.logoutTitle}
        body={copy.more.logoutBody}
        confirmLabel={copy.more.logout}
        danger
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          onLogout();
        }}
      />
    </Screen>
  );
}
