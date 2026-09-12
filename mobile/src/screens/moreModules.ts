import { appRoutes } from '../navigation/routes';

export type MoreModule = {
  id: string;
  label: string;
  hint: string;
  href: string;
  live: boolean;
};

export type MoreSection = {
  id: string;
  title: string;
  items: MoreModule[];
};

export const MORE_SECTIONS: MoreSection[] = [
  {
    id: 'people',
    title: 'Pessoas',
    items: [
      {
        id: 'catechumens',
        label: 'Catequizandos',
        hint: 'Perfis, inscrições e jornadas',
        href: appRoutes.catechumens,
        live: true,
      },
      {
        id: 'families',
        label: 'Famílias',
        hint: 'Agregados e encarregados',
        href: appRoutes.families,
        live: true,
      },
      {
        id: 'team',
        label: 'Pessoas e acessos',
        hint: 'Equipa da paróquia ou espaço',
        href: appRoutes.team,
        live: true,
      },
      {
        id: 'communities',
        label: 'Comunidades',
        hint: 'Comunidades da paróquia',
        href: appRoutes.parishCommunities,
        live: true,
      },
    ],
  },
  {
    id: 'content',
    title: 'Conteúdo',
    items: [
      {
        id: 'library',
        label: 'Biblioteca',
        hint: 'Encontros e materiais da catequese',
        href: appRoutes.content,
        live: true,
      },
      {
        id: 'official',
        label: 'Pasta oficial',
        hint: 'Recursos da diocese e da paróquia',
        href: appRoutes.officialLibrary,
        live: true,
      },
      {
        id: 'bible',
        label: 'Bíblia',
        hint: 'Livros e capítulos',
        href: appRoutes.bible,
        live: true,
      },
      {
        id: 'catechism',
        label: 'Catecismo',
        hint: 'Pesquisa nos números do CIC',
        href: appRoutes.catechism,
        live: true,
      },
      {
        id: 'directory',
        label: 'Diretório',
        hint: 'Diretório para a Catequese',
        href: appRoutes.directory,
        live: true,
      },
      {
        id: 'ai',
        label: 'Assistência editorial',
        hint: 'Disponível na web quando a IA estiver activa',
        href: appRoutes.aiHub,
        live: false,
      },
    ],
  },
  {
    id: 'pastoral',
    title: 'Pedagogia e encontros',
    items: [
      {
        id: 'calendar',
        label: 'Calendário',
        hint: 'Eventos litúrgicos do espaço',
        href: appRoutes.calendar,
        live: true,
      },
      {
        id: 'announcements',
        label: 'Comunicados',
        hint: 'Avisos pastorais',
        href: appRoutes.announcements,
        live: true,
      },
      {
        id: 'formation',
        label: 'Formação',
        hint: 'Percursos da equipa',
        href: appRoutes.formation,
        live: true,
      },
      {
        id: 'sacraments',
        label: 'Sacramentos',
        hint: 'Jornadas sacramentais',
        href: appRoutes.sacraments,
        live: true,
      },
      {
        id: 'years',
        label: 'Anos catequéticos',
        hint: 'Anos lectivos da paróquia',
        href: appRoutes.catecheticalYears,
        live: true,
      },
      {
        id: 'groups',
        label: 'Grupos',
        hint: 'Grupos pastorais',
        href: appRoutes.groups,
        live: true,
      },
    ],
  },
  {
    id: 'ops',
    title: 'Comunicação e gestão',
    items: [
      {
        id: 'documents',
        label: 'Documentos',
        hint: 'Ficheiros da família e da turma',
        href: appRoutes.documents,
        live: true,
      },
      {
        id: 'reports',
        label: 'Relatórios',
        hint: 'Presença e visão da paróquia',
        href: appRoutes.reports,
        live: true,
      },
      {
        id: 'birthdays',
        label: 'Aniversariantes',
        hint: 'Próximos aniversários',
        href: appRoutes.birthdays,
        live: true,
      },
      {
        id: 'billing',
        label: 'Assinatura',
        hint: 'Plano actual (gestão na web)',
        href: appRoutes.billing,
        live: true,
      },
      {
        id: 'settings',
        label: 'Definições',
        hint: 'Conta, espaço e sessão',
        href: appRoutes.settings,
        live: true,
      },
    ],
  },
];
