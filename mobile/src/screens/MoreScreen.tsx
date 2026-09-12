import React from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, MenuRow, Screen, ScreenTitle } from '../components/ui';
import type { SocialProfile, Workspace } from '../api/types';
import { colors } from '../theme';
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
        <React.Fragment key={section.id}>
          <Text
            style={{
              color: colors.ink,
              fontWeight: '700',
              fontSize: 13,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              marginBottom: 8,
              marginTop: 8,
            }}
          >
            {section.title}
          </Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {section.items.map((item, index) => (
              <MenuRow
                key={item.id}
                compact
                last={index === section.items.length - 1}
                testID={`more-${item.id}`}
                label={item.label}
                hint={item.hint}
                badge={item.live ? undefined : 'Só na web'}
                onPress={() => onOpenHref(item.href)}
              />
            ))}
          </Card>
        </React.Fragment>
      ))}
      {profile?.handle ? (
        <BrandButton
          variant="ghost"
          label={`Ver perfil @${profile.handle}`}
          onPress={onOpenProfile}
        />
      ) : null}
      <Card>
        <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 8 }}>Espaço de trabalho</Text>
        {workspaces.length === 0 ? (
          <Text style={{ color: colors.muted }}>Nenhum espaço ligado a esta conta.</Text>
        ) : (
          workspaces.map((workspace) => (
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
              {workspace.type ? ` · ${workspace.type}` : ''}
            </Text>
          ))
        )}
      </Card>
      <BrandButton variant="danger" label="Sair" onPress={onLogout} testID="logout-button" />
    </Screen>
  );
}
