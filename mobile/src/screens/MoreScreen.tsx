import React from 'react';
import { Text, View } from 'react-native';
import { BrandButton, IconTile, MenuRow, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import type { Workspace } from '../api/types';
import { workspaceTypeLabel } from '../lib/payload';
import { colors, spacing } from '../theme';
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
      <SectionHeader title="Espaço de trabalho" />
      {workspaces.length === 0 ? (
        <Text style={{ color: colors.muted, marginBottom: spacing.md }}>Nenhum espaço ligado a esta conta.</Text>
      ) : (
        workspaces.map((workspace, index) => (
          <MenuRow
            key={workspace.id}
            testID={`workspace-${workspace.id}`}
            label={workspace.name}
            hint={workspace.type ? workspaceTypeLabel(workspace.type) : undefined}
            onPress={() => onSelectWorkspace(workspace.id)}
            badge={workspace.id === workspaceId ? 'Actual' : undefined}
            last={index === workspaces.length - 1}
          />
        ))
      )}
      <BrandButton variant="danger" label="Sair" onPress={onLogout} testID="logout-button" />
    </Screen>
  );
}
