import {
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  FileText,
  Flag,
  Map,
  User,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MenuIconRow } from '../components/pastoralUi';
import { Avatar, PrimaryButton, Screen } from '../components/ui';
import type { SocialProfile, Workspace } from '../api/types';
import { colors, spacing } from '../theme';

const RESOURCE_ICONS: Record<string, typeof Calendar> = {
  calendar: Calendar,
  announcements: Bell,
  journeys: Flag,
  bible: BookOpen,
  catechism: BookMarked,
  documents: FileText,
  catechumens: Users,
  families: Users,
  notifications: Map,
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
  const resources = [
    { key: 'calendar', title: 'Agenda', help: 'Calendário litúrgico e encontros' },
    { key: 'announcements', title: 'Comunicados', help: 'Avisos da paróquia' },
    { key: 'journeys', title: 'Jornadas', help: 'Marcos sacramentais' },
    { key: 'bible', title: 'Bíblia', help: 'Ler e partilhar', testID: 'open-bible' },
    { key: 'catechism', title: 'Catecismo', help: 'Seis partes' },
    { key: 'documents', title: 'Documentos', help: 'Arquivos da turma' },
    { key: 'catechumens', title: 'Catequizandos', help: 'Consulta rápida' },
    { key: 'families', title: 'Famílias', help: 'Agregados' },
    { key: 'notifications', title: 'Notificações', help: 'O que mudou' },
  ];

  return (
    <Screen testID="more-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginBottom: spacing[4] }}>
        <Avatar name={name} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>Mais</Text>
          <Text style={{ fontSize: 15, color: colors.text.muted, marginTop: 4 }}>{name}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 13, color: colors.text.muted, marginBottom: spacing[4] }}>
        Para criar encontros e marcar presenças: Turmas → turma → Encontros ou Presença.
      </Text>

      {profile?.handle ? (
        <MenuIconRow title={`Ver perfil @${profile.handle}`} icon={User} onPress={onOpenProfile} />
      ) : null}
      {onOpenEditProfile ? (
        <MenuIconRow title="Editar perfil público" icon={User} onPress={onOpenEditProfile} testID="open-edit-profile" />
      ) : null}

      <Text style={styles.sectionLabel}>Recursos</Text>
      {resources.map((item) => (
        <MenuIconRow
          key={item.key}
          title={item.title}
          help={item.help}
          icon={RESOURCE_ICONS[item.key] || FileText}
          onPress={() => onOpenMenu(item.key)}
          testID={item.testID}
        />
      ))}

      <Text style={styles.sectionLabel}>Espaço de trabalho</Text>
      {workspaces.map((workspace) => {
        const active = workspace.id === workspaceId;
        return (
          <Pressable
            key={workspace.id}
            onPress={() => onSelectWorkspace(workspace.id)}
            style={{ minHeight: 48, justifyContent: 'center', paddingVertical: spacing[2] }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: colors.text.primary, fontWeight: active ? '700' : '400' }}>
                {workspace.name}
              </Text>
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

const styles = {
  sectionLabel: {
    fontWeight: '700' as const,
    fontSize: 16,
    color: colors.text.primary,
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
};
