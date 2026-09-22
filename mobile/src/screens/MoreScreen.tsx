import {
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  FileText,
  Flag,
  RefreshCw,
  User,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { MenuIconRow } from '../components/pastoralUi';
import { Avatar, PrimaryButton, Screen } from '../components/ui';
import type { SocialProfile } from '../api/types';
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
};

export function MoreScreen({
  name,
  profile,
  onOpenMenu,
  onOpenEditProfile,
  onOpenProfile,
  onOpenWorkspaceSwitch,
  onLogout,
}: {
  name: string;
  profile?: SocialProfile | null;
  onOpenMenu: (key: string) => void;
  onOpenEditProfile?: () => void;
  onOpenProfile: () => void;
  onOpenWorkspaceSwitch: () => void;
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

      <Text style={styles.sectionLabel}>Conta</Text>
      <MenuIconRow title="Meu perfil" icon={User} onPress={onOpenProfile} testID="open-my-profile" />
      {onOpenEditProfile ? (
        <MenuIconRow title="Editar perfil público" icon={User} onPress={onOpenEditProfile} testID="open-edit-profile" />
      ) : null}
      <MenuIconRow
        title="Notificações"
        help="O que mudou na paróquia"
        icon={Bell}
        onPress={() => onOpenMenu('notifications')}
        testID="open-notifications"
      />
      <MenuIconRow
        title="Trocar de espaço"
        help="Paróquia ou comunidade ativa"
        icon={RefreshCw}
        onPress={onOpenWorkspaceSwitch}
        testID="open-workspace-switch"
      />

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
