import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, Card, HubTile, Screen, ScreenTitle } from '../components/ui';
import type { SocialProfile, Workspace } from '../api/types';
import { colors, type } from '../theme';

export function MoreScreen({
  name,
  workspaces,
  workspaceId,
  profile,
  onSelectWorkspace,
  onOpenBible,
  onOpenDocuments,
  onOpenCatechumens,
  onOpenFamilies,
  onOpenCalendar,
  onOpenAnnouncements,
  onOpenJourneys,
  onOpenCatechism,
  onOpenNotifications,
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
  onOpenCatechumens: () => void;
  onOpenFamilies: () => void;
  onOpenCalendar: () => void;
  onOpenAnnouncements: () => void;
  onOpenJourneys: () => void;
  onOpenCatechism: () => void;
  onOpenNotifications: () => void;
  onOpenEditProfile?: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const tiles = [
    { label: 'Agenda', hint: 'Mês e encontros', onPress: onOpenCalendar, testID: 'open-calendar' },
    { label: 'Comunicados', hint: 'Avisos da paróquia', onPress: onOpenAnnouncements, testID: 'open-announcements' },
    { label: 'Jornadas', hint: 'Marcos sacramentais', onPress: onOpenJourneys, testID: 'open-journeys' },
    { label: 'Bíblia', hint: 'Ler e partilhar', onPress: onOpenBible, testID: 'open-bible' },
    { label: 'Catecismo', hint: 'Seis partes', onPress: onOpenCatechism, testID: 'open-catechism' },
    { label: 'Documentos', hint: 'Arquivos da turma', onPress: onOpenDocuments, testID: 'open-documents' },
    { label: 'Catequizandos', hint: 'Consulta rápida', onPress: onOpenCatechumens, testID: 'open-catechumens' },
    { label: 'Famílias', hint: 'Agregados', onPress: onOpenFamilies, testID: 'open-families' },
    { label: 'Notificações', hint: 'O que mudou', onPress: onOpenNotifications, testID: 'open-notifications' },
  ];

  return (
    <Screen testID="more-screen">
      <ScreenTitle title="Mais" subtitle={name} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {tiles.map((tile) => (
          <HubTile key={tile.label} label={tile.label} hint={tile.hint} onPress={tile.onPress} testID={tile.testID} />
        ))}
      </View>
      {profile?.handle ? (
        <BrandButton variant="ghost" label={`Ver perfil @${profile.handle}`} onPress={onOpenProfile} />
      ) : null}
      {onOpenEditProfile ? (
        <BrandButton variant="ghost" label="Editar perfil público" onPress={onOpenEditProfile} testID="open-edit-profile" />
      ) : null}
      <Card>
        <Text style={{ color: colors.ink, fontFamily: type.bodyBold, marginBottom: 8 }}>Espaço de trabalho</Text>
        {workspaces.map((workspace) => (
          <Pressable key={workspace.id} onPress={() => onSelectWorkspace(workspace.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text
              style={{
                color: colors.ink,
                fontFamily: workspace.id === workspaceId ? type.bodyBold : type.body,
              }}
            >
              {workspace.name}
            </Text>
          </Pressable>
        ))}
      </Card>
      <BrandButton variant="danger" label="Sair" onPress={onLogout} testID="logout-button" />
    </Screen>
  );
}
