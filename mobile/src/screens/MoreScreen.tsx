import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { BrandButton, Card, Icon, ListCard, ListRow, Row, Screen, ScreenTitle, SectionHeader, Tag, type IconName } from '../components/ui';
import type { SocialProfile, Workspace } from '../api/types';
import { colors, spacing } from '../theme';

export type MoreLink = {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  onPress: () => void;
  testID?: string;
};

export type MoreSection = { title: string; icon?: IconName; links: MoreLink[] };

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administração da plataforma',
  DIOCESE_ADMIN: 'Administração diocesana',
  PARISH_COORDINATOR: 'Coordenação paroquial',
  COMMUNITY_COORDINATOR: 'Coordenação de comunidade',
  LEAD_CATECHIST: 'Catequista principal',
  ASSISTANT_CATECHIST: 'Catequista auxiliar',
  GUARDIAN: 'Encarregado(a) de educação',
  CATECHUMEN: 'Catequizando',
  CONTENT_REVIEWER: 'Revisão de conteúdos',
  PASTORAL_VIEWER: 'Equipa pastoral',
  PERSONAL_OWNER: 'Espaço pessoal',
  PLATFORM_MEMBER: 'Membro',
};

export function roleLabel(role?: string | null): string | undefined {
  if (!role) return undefined;
  return ROLE_LABELS[role] ?? role;
}

export function MoreScreen({
  name,
  email,
  avatarUrl,
  workspaces,
  workspaceId,
  profile,
  sections,
  onSelectWorkspace,
  onOpenProfile,
  onOpenEditProfile,
  onLogout,
  version,
}: {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  workspaces: Workspace[];
  workspaceId: string | null;
  profile?: SocialProfile | null;
  sections: MoreSection[];
  onSelectWorkspace: (id: string) => void;
  onOpenProfile: () => void;
  onOpenEditProfile?: () => void;
  onLogout: () => void;
  version?: string;
}) {
  const current = workspaces.find((workspace) => workspace.id === workspaceId);
  return (
    <Screen testID="more-screen" safeTop>
      <ScreenTitle title="Mais" subtitle="Conta, paróquia e ferramentas." />

      <Card tone="ink">
        <Row gap={spacing.md}>
          <Avatar name={name} url={avatarUrl ?? profile?.avatarUrl} size={56} />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: colors.white }}>
              {name}
            </Text>
            {email ? (
              <Text variant="bodySmall" style={{ color: colors.tabInactive }}>
                {email}
              </Text>
            ) : null}
            {profile?.handle ? (
              <Text variant="labelMedium" style={{ color: colors.goldLight, marginTop: 2 }}>
                @{profile.handle}
              </Text>
            ) : null}
          </View>
        </Row>
        <Row style={{ marginTop: spacing.sm }}>
          {profile?.handle ? <BrandButton variant="gold" icon="account-circle-outline" label="Perfil" onPress={onOpenProfile} style={{ flex: 1 }} /> : null}
          {onOpenEditProfile ? (
            <BrandButton variant="tonal" icon="account-edit-outline" label="Editar perfil" onPress={onOpenEditProfile} testID="open-edit-profile" style={{ flex: 1 }} />
          ) : null}
        </Row>
      </Card>

      {workspaces.length > 0 ? (
        <>
          <SectionHeader title="Espaço de trabalho" icon="church" />
          <ListCard>
            {workspaces.map((workspace, index) => {
              const active = workspace.id === workspaceId;
              return (
                <ListRow
                  key={workspace.id}
                  testID={`workspace-${workspace.id}`}
                  icon={active ? 'check-circle' : 'circle-outline'}
                  title={workspace.name}
                  subtitle={roleLabel((workspace as any).role) || (workspace as any).kind}
                  right={active ? <Tag label="Atual" tone="gold" /> : undefined}
                  chevron={false}
                  onPress={() => onSelectWorkspace(workspace.id)}
                  last={index === workspaces.length - 1}
                />
              );
            })}
          </ListCard>
        </>
      ) : null}

      {sections.map((section) => (
        <View key={section.title}>
          <SectionHeader title={section.title} icon={section.icon} />
          <ListCard>
            {section.links.map((link, index) => (
              <ListRow
                key={link.id}
                testID={link.testID}
                icon={link.icon}
                title={link.label}
                subtitle={link.hint}
                onPress={link.onPress}
                last={index === section.links.length - 1}
              />
            ))}
          </ListCard>
        </View>
      ))}

      <BrandButton variant="danger" icon="logout" label="Terminar sessão" onPress={onLogout} testID="logout-button" />
      <Row style={{ justifyContent: 'center', marginTop: spacing.md }}>
        <Icon name="cross" size={14} color={colors.muted} />
        <Text variant="labelSmall" style={{ color: colors.muted }}>
          Catequese Viva{current ? ` · ${current.name}` : ''}{version ? ` · v${version}` : ''}
        </Text>
      </Row>
    </Screen>
  );
}
