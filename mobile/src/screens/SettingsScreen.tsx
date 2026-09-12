import React from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, Screen, ScreenTitle } from '../components/ui';
import type { MobileUser, Workspace } from '../api/types';
import { colors } from '../theme';

export function SettingsScreen({
  user,
  workspaces,
  workspaceId,
  onSelectWorkspace,
  onOpenBilling,
  onLogout,
}: {
  user: MobileUser | null;
  workspaces: Workspace[];
  workspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onOpenBilling: () => void;
  onLogout: () => void;
}) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return (
    <Screen testID="settings-screen">
      <ScreenTitle title="Configurações" subtitle="Conta, espaço de trabalho e sessão." />
      <Card>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>{name || 'Catequista'}</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>{user?.email || ''}</Text>
        {user?.locale ? (
          <Text style={{ color: colors.muted, marginTop: 6 }}>Idioma da conta: {user.locale}</Text>
        ) : null}
        <Text style={{ color: colors.muted, marginTop: 12 }}>
          Nome, senha e 2FA configuram-se na plataforma web.
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 8 }}>Espaço ativo</Text>
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
      <BrandButton variant="ghost" label="Ver assinatura" onPress={onOpenBilling} />
      <BrandButton variant="danger" label="Sair" onPress={onLogout} />
    </Screen>
  );
}
