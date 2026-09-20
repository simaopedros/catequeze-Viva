import React, { useState } from 'react';
import type { SocialProfile, Workspace } from '../api/types';
import { BrandButton, ConfirmSheet, ListRow, Screen, ScreenTitle, SectionHeader } from '../components/ui';
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
  onLogout,
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
  onLogout: () => void;
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Screen testID="more-screen">
      <ScreenTitle title={copy.more.title} subtitle={name} />
      <ListRow title={copy.more.bible} onPress={onOpenBible} testID="open-bible" />
      <ListRow title={copy.more.documents} onPress={onOpenDocuments} />
      {onOpenCommunity ? (
        <ListRow title={copy.more.communityAreas} onPress={onOpenCommunity} testID="open-community" />
      ) : null}
      {profile?.handle ? (
        <ListRow title={copy.more.viewProfile(profile.handle)} onPress={onOpenProfile} />
      ) : null}
      {onOpenEditProfile ? (
        <ListRow title={copy.more.editProfile} onPress={onOpenEditProfile} testID="open-edit-profile" />
      ) : null}
      <SectionHeader title={copy.more.workspace} />
      {workspaces.map((workspace) => (
        <ListRow
          key={workspace.id}
          title={workspace.name}
          selected={workspace.id === workspaceId}
          onPress={() => onSelectWorkspace(workspace.id)}
        />
      ))}
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
