import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ListRow, PrimaryButton, Screen, ScreenTitle } from '../components/ui';
import type { SocialProfile, Workspace } from '../api/types';
import { colors, spacing } from '../theme';

type MenuItem = {
  key: string;
  title: string;
  help: string;
  onPress: () => void;
  testID?: string;
};

export function MoreScreen({
  name,
  workspaces,
  workspaceId,
  profile,
  onSelectWorkspace,
  onOpenMenu,
  onOpenEditProfile,
  onOpenProfile,
  onLogout,
}: {
  name: string;
  workspaces: Workspace[];
  workspaceId: string | null;
  profile?: SocialProfile | null;
  onSelectWorkspace: (id: string) => void;
  onOpenMenu: (key: string) => void;
  onOpenEditProfile?: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const resources: MenuItem[] = [
    { key: 'calendar', title: 'Agenda', help: 'Mês e encontros', onPress: () => onOpenMenu('calendar') },
    { key: 'announcements', title: 'Comunicados', help: 'Avisos da paróquia', onPress: () => onOpenMenu('announcements') },
    { key: 'journeys', title: 'Jornadas', help: 'Marcos sacramentais', onPress: () => onOpenMenu('journeys') },
    { key: 'bible', title: 'Bíblia', help: 'Ler e partilhar', onPress: () => onOpenMenu('bible'), testID: 'open-bible' },
    { key: 'catechism', title: 'Catecismo', help: 'Seis partes', onPress: () => onOpenMenu('catechism') },
    { key: 'documents', title: 'Documentos', help: 'Arquivos da turma', onPress: () => onOpenMenu('documents') },
    { key: 'catechumens', title: 'Catequizandos', help: 'Consulta rápida', onPress: () => onOpenMenu('catechumens') },
    { key: 'families', title: 'Famílias', help: 'Agregados', onPress: () => onOpenMenu('families') },
    { key: 'notifications', title: 'Notificações', help: 'O que mudou', onPress: () => onOpenMenu('notifications') },
  ];

  return (
    <Screen testID="more-screen">
      <ScreenTitle title="Mais" subtitle={name} />

      {profile?.handle ? (
        <ListRow title={`Ver perfil @${profile.handle}`} onPress={onOpenProfile} />
      ) : null}
      {onOpenEditProfile ? (
        <ListRow title="Editar perfil público" onPress={onOpenEditProfile} testID="open-edit-profile" />
      ) : null}

      <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text.primary, marginTop: spacing[4], marginBottom: spacing[2] }}>
        Recursos
      </Text>
      {resources.map((item) => (
        <ListRow key={item.key} title={item.title} subtitle={item.help} onPress={item.onPress} testID={item.testID} />
      ))}

      <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text.primary, marginTop: spacing[6], marginBottom: spacing[2] }}>
        Espaço de trabalho
      </Text>
      {workspaces.map((workspace) => {
        const active = workspace.id === workspaceId;
        return (
          <Pressable key={workspace.id} onPress={() => onSelectWorkspace(workspace.id)} style={{ minHeight: 48, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: colors.text.primary, fontWeight: active ? '700' : '400' }}>{workspace.name}</Text>
              {active ? <Text style={{ color: colors.primary[800], fontWeight: '700' }}>✓</Text> : null}
            </View>
          </Pressable>
        );
      })}

      <View style={{ marginTop: spacing[8] }}>
        <PrimaryButton testID="logout-button" label="Sair" onPress={onLogout} variant="danger" />
      </View>
    </Screen>
  );
}
