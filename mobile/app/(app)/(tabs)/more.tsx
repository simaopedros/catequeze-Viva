import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { MoreScreen, type MoreSection } from '../../../src/screens/MoreScreen';

export default function MoreRoute() {
  const { api, user, bootstrap, workspaceId, setWorkspaceId, logout } = useAuth();
  const router = useRouter();
  const profile = useAsync(() => api.mySocialProfile(), []);

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
        { id: 'bible', label: 'Bíblia', hint: 'Leitura e partilha', icon: 'book-cross', onPress: () => router.push('/(app)/bible'), testID: 'open-bible' },
        { id: 'community', label: 'Áreas da Comunidade', hint: 'Shorts, tópicos, membros', icon: 'account-group-outline', onPress: () => router.push('/(app)/(tabs)/community'), testID: 'open-community' },
      ],
    },
    {
      title: 'Conta',
      icon: 'account-cog-outline',
      links: [
        { id: 'notifications', label: 'Notificações', icon: 'bell-outline', onPress: () => router.push('/(app)/notifications') },
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
    />
  );
}
