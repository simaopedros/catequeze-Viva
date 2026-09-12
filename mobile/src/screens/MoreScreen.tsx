import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, IconTile, Screen, ScreenTitle } from '../components/ui';
import type { SocialProfile, Workspace } from '../api/types';
import { workspaceTypeLabel } from '../lib/payload';
import { colors, fonts, spacing } from '../theme';
import { getMoreSections, type MoreNavContext } from './moreModules';

export function MoreScreen({
  name,
  workspaces,
  workspaceId,
  profile,
  navContext,
  onSelectWorkspace,
  onOpenHref,
  onOpenProfile,
  onLogout,
}: {
  name: string;
  workspaces: Workspace[];
  workspaceId: string | null;
  profile?: SocialProfile | null;
  navContext?: MoreNavContext;
  onSelectWorkspace: (id: string) => void;
  onOpenHref: (href: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const sections = getMoreSections(navContext);

  return (
    <Screen testID="more-screen">
      <ScreenTitle title="Mais" subtitle={name} />
      {sections.map((section) => (
        <View key={section.id} style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: colors.ink,
              fontFamily: fonts.sansBold,
              fontSize: 13,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {section.title}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {section.items.map((item) => (
              <IconTile
                key={item.id}
                testID={`more-${item.id}`}
                label={item.label}
                hint={item.live ? undefined : 'Só na web'}
                icon={item.icon}
                onPress={() => onOpenHref(item.href)}
              />
            ))}
          </View>
        </View>
      ))}
      {profile?.handle ? (
        <BrandButton variant="ghost" label={`Ver perfil @${profile.handle}`} onPress={onOpenProfile} />
      ) : null}
      <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: 8 }}>Espaço de trabalho</Text>
      {workspaces.length === 0 ? (
        <Text style={{ color: colors.muted }}>Nenhum espaço ligado a esta conta.</Text>
      ) : (
        workspaces.map((workspace) => (
          <Pressable
            key={workspace.id}
            testID={`workspace-${workspace.id}`}
            onPress={() => onSelectWorkspace(workspace.id)}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text
              style={{
                color: workspace.id === workspaceId ? colors.goldDark : colors.inkSoft,
                fontFamily: workspace.id === workspaceId ? fonts.sansBold : fonts.sans,
                paddingVertical: 6,
              }}
            >
              {workspace.name}
              {workspace.type ? ` · ${workspaceTypeLabel(workspace.type)}` : ''}
            </Text>
          </Pressable>
        ))
      )}
      <BrandButton variant="danger" label="Sair" onPress={onLogout} testID="logout-button" />
    </Screen>
  );
}
