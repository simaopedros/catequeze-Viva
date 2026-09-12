export const COMMUNITY_AREAS = [
  { id: 'feed', label: 'Feed', hint: 'Para si, recentes e em alta' },
  { id: 'following', label: 'A seguir', hint: 'Só quem você segue' },
  { id: 'shorts', label: 'Shorts', hint: 'Vídeos curtos da Comunidade' },
  { id: 'search', label: 'Pesquisar', hint: 'Pessoas e publicações' },
  { id: 'compose', label: 'Publicar', hint: 'Compartilhar com a rede' },
  { id: 'topics', label: 'Tópicos', hint: 'Catequese, oração, liturgia' },
  { id: 'members', label: 'Membros', hint: 'Quem escreve na Comunidade' },
  { id: 'me', label: 'Meu perfil', hint: 'O seu @ público' },
  { id: 'edit', label: 'Editar perfil', hint: 'Handle, bio e site' },
  { id: 'blocked', label: 'Bloqueados', hint: 'Contas que você escondeu' },
  { id: 'notifications', label: 'Notificações', hint: 'Atividade da rede' },
] as const;

export type CommunityAreaId = (typeof COMMUNITY_AREAS)[number]['id'];
