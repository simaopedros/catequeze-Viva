export const COMMUNITY_AREAS = [
  { id: 'feed', label: 'Feed', hint: 'Para você, recentes e em alta' },
  { id: 'following', label: 'A seguir', hint: 'Só quem você segue' },
  { id: 'shorts', label: 'Shorts', hint: 'Vídeos curtos da Comunidade' },
  { id: 'search', label: 'Pesquisar', hint: 'Pessoas e posts' },
  { id: 'compose', label: 'Publicar', hint: 'Partilhar na rede' },
  { id: 'topics', label: 'Tópicos', hint: 'Catequese, oração, liturgia' },
  { id: 'members', label: 'Membros', hint: 'Quem escreve na Comunidade' },
  { id: 'me', label: 'Meu perfil', hint: 'O seu @ público' },
  { id: 'edit', label: 'Editar perfil', hint: 'Handle, bio e sítio' },
  { id: 'blocked', label: 'Bloqueados', hint: 'Contas que escondeu' },
  { id: 'notifications', label: 'Notificações', hint: 'Atividade da rede' },
] as const;

export type CommunityAreaId = (typeof COMMUNITY_AREAS)[number]['id'];
