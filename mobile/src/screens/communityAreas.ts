export const COMMUNITY_AREAS = [
  { id: 'feed', label: 'Início da Comunidade', hint: 'Para você, recentes e em alta' },
  { id: 'following', label: 'Quem você segue', hint: 'Só publicações de quem você segue' },
  { id: 'shorts', label: 'Vídeos curtos', hint: 'Clipes da Comunidade' },
  { id: 'search', label: 'Pesquisar', hint: 'Pessoas e publicações' },
  { id: 'compose', label: 'Publicar', hint: 'Compartilhar com a rede' },
  { id: 'topics', label: 'Tópicos', hint: 'Catequese, oração, liturgia' },
  { id: 'members', label: 'Membros', hint: 'Quem escreve na Comunidade' },
  { id: 'me', label: 'Meu perfil', hint: 'O seu nome público' },
  { id: 'edit', label: 'Editar perfil', hint: 'Nome público, bio e site' },
  { id: 'blocked', label: 'Bloqueados', hint: 'Contas que você escondeu' },
  { id: 'notifications', label: 'Notificações', hint: 'Atividade da rede' },
] as const;

export type CommunityAreaId = (typeof COMMUNITY_AREAS)[number]['id'];
