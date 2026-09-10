import React from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, Field, Screen, ScreenTitle } from '../components/ui';
import type { SocialProfile, Workspace } from '../api/types';
import { colors } from '../theme';

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
  onSaveProfile,
  onLogout,
  handle,
  bio,
  onHandleChange,
  onBioChange,
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
  onSaveProfile: () => void;
  onLogout: () => void;
  handle: string;
  bio: string;
  onHandleChange: (value: string) => void;
  onBioChange: (value: string) => void;
}) {
  return (
    <Screen testID="more-screen">
      <ScreenTitle title="Mais" subtitle={name} />
      <BrandButton label="Bíblia" onPress={onOpenBible} testID="open-bible" />
      <BrandButton variant="ghost" label="Documentos" onPress={onOpenDocuments} />
      {onOpenCommunity ? (
        <BrandButton variant="ghost" label="Áreas da Comunidade" onPress={onOpenCommunity} testID="open-community" />
      ) : null}
      {profile?.handle ? (
        <BrandButton variant="ghost" label={`Ver perfil @${profile.handle}`} onPress={onOpenProfile} />
      ) : null}
      {onOpenEditProfile ? (
        <BrandButton variant="ghost" label="Editar perfil público" onPress={onOpenEditProfile} testID="open-edit-profile" />
      ) : null}
      <Card>
        <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 8 }}>Espaço de trabalho</Text>
        {workspaces.map((workspace) => (
          <Text
            key={workspace.id}
            onPress={() => onSelectWorkspace(workspace.id)}
            style={{
              color: workspace.id === workspaceId ? colors.goldDark : colors.inkSoft,
              marginBottom: 6,
              fontWeight: workspace.id === workspaceId ? '700' : '400',
            }}
          >
            {workspace.name}
          </Text>
        ))}
      </Card>
      <Field label="O seu @" value={handle} onChangeText={onHandleChange} testID="profile-handle" />
      <Field label="Bio" value={bio} onChangeText={onBioChange} multiline />
      <BrandButton label="Guardar perfil público" onPress={onSaveProfile} />
      <BrandButton variant="danger" label="Terminar sessão" onPress={onLogout} testID="logout-button" />
    </Screen>
  );
}
