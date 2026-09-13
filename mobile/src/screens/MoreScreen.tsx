import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, IconTile, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import type { Workspace } from '../api/types';
import { workspaceTypeLabel } from '../lib/payload';
import { colors, fonts, spacing } from '../theme';
import { getMoreSections, ioniconForKey, type MoreNavContext } from './moreModules';

export function MoreScreen({
  name,
  workspaces,
  workspaceId,
  navContext,
  onSelectWorkspace,
  onOpenHref,
  onLogout,
}: {
  name: string;
  workspaces: Workspace[];
  workspaceId: string | null;
  navContext?: MoreNavContext;
  onSelectWorkspace: (id: string) => void;
  onOpenHref: (href: string) => void;
  onLogout: () => void;
}) {
  const sections = getMoreSections(navContext);

  return (
    <Screen testID="more-screen">
      <ScreenTitle title="Mais" subtitle={name} />
      {sections.map((section) => (
        <View key={section.id} style={{ marginBottom: spacing.md }}>
          <SectionHeader title={section.title} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {section.items.map((item) => (
              <IconTile
                key={item.id}
                testID={`more-${item.id}`}
                label={item.label}
                icon={ioniconForKey(item.iconKey)}
                onPress={() => onOpenHref(item.href)}
              />
            ))}
          </View>
        </View>
      ))}
      <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: 8 }}>
        Espaço de trabalho
      </Text>
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
