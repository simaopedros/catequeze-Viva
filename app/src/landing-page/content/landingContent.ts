import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Building2,
  Calendar,
  Church,
  ClipboardCheck,
  Globe,
  GraduationCap,
  Heart,
  ScrollText,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';

export type ShowcaseId =
  | 'dashboard'
  | 'attendance'
  | 'sacraments'
  | 'library'
  | 'ai-planner'
  | 'family-portal';

export interface Persona {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface FeatureShowcaseItem {
  id: ShowcaseId;
  title: string;
  desc: string;
  bullets: string[];
  direction: 'row' | 'row-reverse';
}

export interface SecondaryFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface Step {
  number: string;
  title: string;
  desc: string;
}

export interface Testimonial {
  name: string;
  role: string;
  text: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface PricingPlan {
  planId: string;
  level: 'personal' | 'institutional';
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}

export const PERSONAS: Persona[] = [
  {
    icon: GraduationCap,
    title: 'Catequista',
    desc: 'Faça a chamada pelo celular, prepare encontros com a biblioteca pastoral integrada, comunique-se com as famílias.',
  },
  {
    icon: Church,
    title: 'Coordenador Paroquial',
    desc: 'Organize sua equipa de catequistas, crie turmas por etapa e sacramento, acompanhe relatórios de presença e progresso sacramental.',
  },
  {
    icon: Heart,
    title: 'Pais e Responsáveis',
    desc: 'Acompanhe a jornada de fé dos seus filhos, veja presenças, justifique faltas, receba avisos e faça upload de documentos.',
  },
  {
    icon: UserCheck,
    title: 'Pároco e Liderança',
    desc: 'Acesso de leitura a dashboards pastorais, relatórios de frequência e progresso sacramental de toda a paróquia.',
  },
  {
    icon: Building2,
    title: 'Administrador Diocesano',
    desc: 'Visão consolidada de múltiplas paróquias, analytics agregado, biblioteca oficial diocesana e gestão centralizada.',
  },
];

export const SHOWCASES: FeatureShowcaseItem[] = [
  {
    id: 'attendance',
    title: 'Chamada digital no celular',
    desc: 'Registe presenças com um toque. Monte sua turma, importe catequizandos por CSV e gere relatórios de frequência.',
    bullets: [
      'Chamada rápida com PRESENT, ABSENT, LATE e JUSTIFIED',
      'Importação em lote por planilha CSV',
      'Relatórios de frequência exportáveis',
    ],
    direction: 'row',
  },
  {
    id: 'ai-planner',
    title: 'Encontros preparados por IA',
    desc: 'IA teologicamente orientada para criar roteiros, atividades, quizzes e mensagens para as famílias em segundos.',
    bullets: [
      'Planejamento anual automático de encontros',
      'Base teológica: Bíblia CNBB, Catecismo e Diretório',
      'Assistente teológico flutuante em toda a plataforma',
    ],
    direction: 'row-reverse',
  },
  {
    id: 'library',
    title: 'Biblioteca pastoral integrada',
    desc: 'Bíblia completa, Catecismo e Diretório para a Catequese com busca full-text. Monte planos de encontro com referências cruzadas.',
    bullets: [
      '66 livros bíblicos com busca semântica',
      'Planos de encontro com workflow de revisão',
      'Referências cruzadas entre Bíblia, Catecismo e Diretório',
    ],
    direction: 'row',
  },
  {
    id: 'family-portal',
    title: 'Portal da família',
    desc: 'Pais e responsáveis acompanham presenças, justificam faltas, recebem avisos e enviam documentos sem precisar ligar para a paróquia.',
    bullets: [
      'Dashboard personalizado por filho',
      'Justificativa de faltas pelo portal',
      'Upload de certidões via link seguro',
    ],
    direction: 'row-reverse',
  },
  {
    id: 'dashboard',
    title: 'Painel do coordenador',
    desc: 'Visão completa da saúde da catequese: KPIs, encontros do dia, alertas pastorais e comparação entre turmas.',
    bullets: [
      'KPIs de catequizandos, turmas e presença média',
      'Alertas de evasão e documentos pendentes',
      'Comparação de desempenho entre turmas',
    ],
    direction: 'row',
  },
  {
    id: 'sacraments',
    title: 'Jornada sacramental',
    desc: 'Acompanhe os 5 sacramentos com milestones visuais: Batismo, Primeira Eucaristia, Crisma, Reconciliação e Matrimônio.',
    bullets: [
      'Etapas com fluxo de aprovação por catequizando',
      'Templates reutilizáveis por paróquia',
      'Progresso sacramental visível para coordenadores',
    ],
    direction: 'row-reverse',
  },
];

export const SECONDARY_FEATURES: SecondaryFeature[] = [
  {
    icon: Calendar,
    title: 'Calendário litúrgico',
    desc: 'Eventos litúrgicos, paroquiais e sacramentais com recorrência configurável.',
  },
  {
    icon: Search,
    title: 'Busca global (Ctrl+K)',
    desc: 'Pesquise Bíblia, Catecismo, catequizandos, turmas e documentos em qualquer página.',
  },
  {
    icon: Globe,
    title: 'Multi-idioma e multi-paróquia',
    desc: 'Interface em português, inglês e espanhol. Múltiplas paróquias por diocese.',
  },
];

export const STEPS: Step[] = [
  {
    number: '1',
    title: 'Monte sua turma',
    desc: 'Cadastre seus catequizandos, importe por CSV ou adicione um a um. Em poucos minutos a turma está pronta.',
  },
  {
    number: '2',
    title: 'Acompanhe os encontros',
    desc: 'Faça a chamada pelo celular, prepare roteiros com a biblioteca pastoral e a IA integrada. Tudo ao alcance de um toque.',
  },
  {
    number: '3',
    title: 'Comunique-se com as famílias',
    desc: 'Pais e responsáveis veem presenças, justificam faltas, recebem avisos e enviam documentos pelo portal. Sem precisar ligar.',
  },
];

export const PRICING_PREVIEW: PricingPlan[] = [
  {
    planId: 'catechist_free',
    level: 'personal',
    name: 'Catequista Grátis',
    price: 'Grátis',
    period: '',
    desc: 'Pessoal — para um catequista individual',
    features: ['1 turma', '15 catequizandos', 'Presenças digitais', 'Bíblia e Catecismo', '3 créditos de IA iniciais'],
  },
  {
    planId: 'catechist_ai',
    level: 'personal',
    name: 'Catequista IA',
    price: 'R$ 39',
    period: '/mês',
    desc: 'Pessoal — IA para criar encontros, atividades e mensagens em segundos',
    features: [
      'Turmas e catequizandos ilimitados',
      'Gerador de encontros por IA',
      'Planejamento anual automático',
      'Assistente teológico',
      '20 créditos de IA/mês',
    ],
    highlight: true,
  },
  {
    planId: 'parish_complete',
    level: 'institutional',
    name: 'Paróquia Completa',
    price: 'R$ 129',
    period: '/mês',
    desc: 'Institucional — ferramentas para a paróquia inteira',
    features: [
      'Catequistas ilimitados',
      'Painel do coordenador',
      'Documentos e consentimentos LGPD',
      'Comunicação integrada',
      '50 créditos de IA/mês',
    ],
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Ana Costa',
    role: 'Catequista',
    text: 'A chamada pelo celular é prática demais! A biblioteca com Bíblia, Catecismo e Diretório integrados facilita muito a preparação dos encontros. E os pais adoram o portal da família.',
  },
  {
    name: 'Maria Silva',
    role: 'Coordenadora de Catequese',
    text: 'A Catequese Viva transformou a forma como gerenciamos nossas turmas. Antes tudo era em papel, agora temos controle total de presenças, sacramentos e comunicação com as famílias.',
  },
  {
    name: 'Pe. João Santos',
    role: 'Pároco',
    text: 'Finalmente uma ferramenta pensada para a realidade pastoral. Consigo ver o panorama da catequese da paróquia inteira sem precisar pedir relatórios para ninguém.',
  },
];

export const FAQ: FaqItem[] = [
  {
    q: 'Preciso de cartão de crédito para começar?',
    a: 'Não. O plano Catequista Grátis é gratuito para sempre — basta criar sua conta e começar a usar. Os planos pagos aceitam pagamento via PIX.',
  },
  {
    q: 'Meus dados estão seguros? A plataforma segue a LGPD?',
    a: 'Sim. A Catequese Viva foi projetada com proteção de dados desde o início. Consentimentos são registrados digitalmente, dados de crianças e adolescentes têm proteção especial, e você pode solicitar a exportação ou exclusão dos dados a qualquer momento.',
  },
  {
    q: 'Posso importar os catequizandos que já tenho cadastrados em planilha?',
    a: 'Sim. A plataforma aceita importação em lote por arquivo CSV. Basta fazer upload da sua planilha com nome, sobrenome e data de nascimento.',
  },
  {
    q: 'Funciona em celular? Precisa instalar aplicativo?',
    a: 'Funciona perfeitamente no navegador do celular, sem precisar instalar nada. A interface é adaptada para dispositivos móveis, incluindo menu inferior para acesso rápido.',
  },
  {
    q: 'Posso ter várias paróquias na mesma conta?',
    a: 'Sim. O plano Diocese permite gerir múltiplas paróquias com analytics consolidado. No plano Paróquia, você pode ter múltiplas comunidades dentro da mesma paróquia.',
  },
  {
    q: 'Que tipo de suporte vocês oferecem?',
    a: 'Todos os planos têm suporte comunitário. Planos pagos têm suporte prioritário. O plano Diocese inclui onboarding dedicado para sua equipe.',
  },
];

export const HERO_BADGE = {
  icon: GraduationCap,
  text: 'Ferramentas para o dia-a-dia do catequista',
  accentIcon: Sparkles,
};

export const SHOWCASE_ICONS: Record<ShowcaseId, LucideIcon> = {
  dashboard: Users,
  attendance: ClipboardCheck,
  sacraments: ScrollText,
  library: BookOpen,
  'ai-planner': Sparkles,
  'family-portal': Heart,
};
