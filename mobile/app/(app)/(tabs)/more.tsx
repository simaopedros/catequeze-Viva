import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, listWorkspaces, useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { useMutation } from '../../../src/hooks/useMutation';
import { useAsync } from '../../../src/hooks/useAsync';
import { MoreScreen, type MoreSection } from '../../../src/screens/MoreScreen';

export default function MoreRoute() {
  const { api, user, bootstrap, workspaceId, setWorkspaceId, logout, refresh } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const profile = useAsync(() => api.mySocialProfile(), []);
  const pendingInvitations = ((bootstrap?.currentUserContext as any)?.pendingInvitations ?? []) as { id: string; parishName?: string; role?: string }[];
  const accept = useMutation((membershipId: string) => api.acceptInvitation(membershipId), {
    successMessage: 'Convite aceite. Bem-vindo(a)!',
    onSuccess: () => refresh().catch(() => undefined),
  });

  const sections: MoreSection[] = [
    {
      title: 'Catequese',
      icon: 'book-open-page-variant-outline',
      links: [
        { id: 'catechumens', label: 'Catequizandos', hint: 'Fichas e presenças', icon: 'account-child-outline', onPress: () => router.push('/(app)/catechumens') },
        { id: 'families', label: 'Famílias', hint: 'Agregados e encarregados', icon: 'home-heart', onPress: () => router.push('/(app)/families') },
        { id: 'documents', label: 'Documentos', hint: 'Certidões e autorizações', icon: 'file-document-outline', onPress: () => router.push('/(app)/documents'), testID: 'open-documents' },
        { id: 'birthdays', label: 'Aniversários', hint: 'Catequizandos que fazem anos', icon: 'cake-variant-outline', onPress: () => router.push('/(app)/birthdays') },
        { id: 'announcements', label: 'Avisos pastorais', hint: 'Comunicações da coordenação', icon: 'bullhorn-outline', onPress: () => router.push('/(app)/announcements') },
      ],
    },
    {
      title: 'Conteúdo',
      icon: 'bookshelf',
      links: [
        { id: 'bible', label: 'Bíblia', hint: 'Leitura, pesquisa e favoritos', icon: 'book-cross', onPress: () => router.push('/(app)/bible'), testID: 'open-bible' },
        { id: 'catechism', label: 'Catecismo', hint: 'Perguntas e respostas', icon: 'book-outline', onPress: () => router.push('/(app)/catechism') },
        { id: 'directory', label: 'Diretório para a Catequese', hint: 'Orientações da Igreja', icon: 'book-information-variant', onPress: () => router.push('/(app)/directory') },
        { id: 'content', label: 'Biblioteca de conteúdos', hint: 'Planos de encontro e materiais', icon: 'book-open-page-variant-outline', onPress: () => router.push('/(app)/content') },
        { id: 'calendar', label: 'Calendário', hint: 'Eventos e encontros', icon: 'calendar-month-outline', onPress: () => router.push('/(app)/calendar') },
        { id: 'community', label: 'Áreas da Comunidade', hint: 'Shorts, tópicos, membros', icon: 'account-group-outline', onPress: () => router.push('/(app)/(tabs)/community'), testID: 'open-community' },
      ],
    },
    ...(permissions.canManageTeam || permissions.canOperate
      ? [
          {
            title: 'Gestão',
            icon: 'chart-box-outline' as const,
            links: [
              ...(permissions.canManageTeam ? [{ id: 'team', label: 'Equipa e convites', hint: 'Membros, papéis e convites', icon: 'account-group-outline' as const, onPress: () => router.push('/(app)/team') }] : []),
              { id: 'reports', label: 'Relatórios', hint: 'Presença por turma e exportação', icon: 'chart-arc' as const, onPress: () => router.push('/(app)/reports') },
              { id: 'sacraments', label: 'Percursos sacramentais', hint: 'Marcos por catequizando', icon: 'cross-outline' as const, onPress: () => router.push('/(app)/sacraments') },
              { id: 'formation', label: 'Formação de catequistas', hint: 'Percursos formativos', icon: 'school-outline' as const, onPress: () => router.push('/(app)/formation') },
            ],
          },
        ]
      : []),
    {
      title: 'Conta',
      icon: 'account-cog-outline',
      links: [
        { id: 'settings', label: 'Definições', hint: 'Perfil, palavra-passe e 2FA', icon: 'cog-outline', onPress: () => router.push('/(app)/settings'), testID: 'open-settings' },
        { id: 'notifications', label: 'Notificações', icon: 'bell-outline', onPress: () => router.push('/(app)/notifications') },
        { id: 'groups', label: 'Grupos pastorais', icon: 'account-multiple-outline', onPress: () => router.push('/(app)/groups') },
        { id: 'support', label: 'Suporte', hint: 'Os seus pedidos de ajuda', icon: 'lifebuoy', onPress: () => router.push('/(app)/support') },
      ],
    },
  ];

  return (
    <MoreScreen
      name={displayName(user)}
      email={user?.email}
      avatarUrl={user?.avatarUrl}
      workspaces={listWorkspaces(bootstrap)}
      workspaceId={workspaceId}
      profile={profile.data}
      sections={sections}
      version={Constants.expoConfig?.version}
      onSelectWorkspace={(id) => setWorkspaceId(id)}
      onOpenEditProfile={() => router.push('/(app)/community/edit')}
      onOpenProfile={() => {
        if (profile.data?.handle) router.push(`/(app)/community/${profile.data.handle}`);
      }}
      onLogout={() => logout()}
      pendingInvitations={pendingInvitations}
      onAcceptInvitation={(id) => void accept.run(id)}
      acceptingId={accept.busy ? pendingInvitations[0]?.id ?? null : null}
    />
  );
}
