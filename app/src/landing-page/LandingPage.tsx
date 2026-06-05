import { Link } from 'react-router';
import {
  Cross, Users, BookOpen, Calendar, Shield, BarChart3, Heart,
  ChevronRight, Star, Sparkles, GraduationCap, MessageSquare,
  Search, Globe, FileText, ScrollText, Bell, Church, Building2,
  UserCheck, ClipboardCheck, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { PublicNavbar } from '../catequese/PublicNavbar';
import { PublicFooter } from '../catequese/PublicFooter';

// ─── Personas ──────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    icon: Church,
    title: 'Coordenador Paroquial',
    desc: 'Organize sua equipa de catequistas, crie turmas por etapa e sacramento, acompanhe relatórios de presença e progresso sacramental.',
  },
  {
    icon: GraduationCap,
    title: 'Catequista',
    desc: 'Faça a chamada pelo celular, prepare encontros com a biblioteca pastoral integrada, comunique-se com as famílias.',
  },
  {
    icon: Heart,
    title: 'Pais e Responsáveis',
    desc: 'Acompanhe a jornada de fé dos seus filhos, veja presenças, justifique faltas, receba avisos e faça upload de documentos.',
  },
  {
    icon: Building2,
    title: 'Administrador Diocesano',
    desc: 'Visão consolidada de múltiplas paróquias, analytics agregado, biblioteca oficial diocesana e gestão centralizada.',
  },
  {
    icon: UserCheck,
    title: 'Pároco e Liderança',
    desc: 'Acesso de leitura a dashboards pastorais, relatórios de frequência e progresso sacramental de toda a paróquia.',
  },
];

// ─── Features ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Users,
    title: 'Gestão de Turmas e Catequizandos',
    desc: 'Crie turmas por etapa (Crisma, Primeira Eucaristia), ano catequético e sacramento. Cadastre catequizandos com dados completos e vínculo familiar. Importação em lote por CSV.',
  },
  {
    icon: ClipboardCheck,
    title: 'Presenças e Chamada Digital',
    desc: 'Registe presenças com um toque. Pais justificam faltas pelo portal da família. Estatísticas automáticas de frequência, alertas de risco de evasão e relatórios exportáveis.',
  },
  {
    icon: ScrollText,
    title: 'Jornada Sacramental',
    desc: 'Acompanhe os 5 sacramentos com milestones: Batismo, Primeira Eucaristia, Crisma, Reconciliação e Matrimônio. Fluxo de aprovação com etapas visuais por catequizando.',
  },
  {
    icon: BookOpen,
    title: 'Biblioteca Pastoral Integrada',
    desc: 'Bíblia completa (66 livros), Catecismo da Igreja Católica e Diretório para a Catequese com busca full-text. Crie planos de encontro com referências cruzadas entre os três.',
  },
  {
    icon: MessageSquare,
    title: 'Comunicação e Avisos',
    desc: 'Mensagens diretas, grupos por turma, canais de aviso. Campanhas segmentadas por etapa, classe ou paróquia inteira. Notificações em tempo real com contador de não lidas.',
  },
  {
    icon: FileText,
    title: 'Documentos e Consentimentos LGPD',
    desc: 'Upload de certidões de batismo, nascimento e matrimônio. Consentimentos digitais (imagem, comunicação, dados sensíveis). Verificação por coordenador com trilha de auditoria.',
  },
  {
    icon: Calendar,
    title: 'Calendário Litúrgico e Eventos',
    desc: 'Eventos litúrgicos, paroquiais e sacramentais com recorrência configurável. Próximos encontros visíveis no dashboard de cada perfil.',
  },
  {
    icon: Search,
    title: 'Busca Global Instantânea',
    desc: 'Pesquise simultaneamente na Bíblia, Catecismo, Diretório, catequizandos, turmas, conteúdos e documentos da sua paróquia. Atalho Ctrl+K em qualquer página.',
  },
  {
    icon: Globe,
    title: 'Multi-idioma e Multi-paróquia',
    desc: 'Interface em português, inglês e espanhol. Suporte a múltiplas paróquias por diocese, cada uma com seu calendário, turmas e equipe independentes.',
  },
];

// ─── Steps ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: '1',
    title: 'Crie sua paróquia',
    desc: 'Cadastre sua paróquia em minutos. Convide coordenadores e catequistas. Defina o ano catequético.',
  },
  {
    number: '2',
    title: 'Monte suas turmas',
    desc: 'Crie turmas por sacramento e etapa. Importe catequizandos por CSV ou cadastre um a um. Atribua catequistas.',
  },
  {
    number: '3',
    title: 'Acompanhe a jornada',
    desc: 'Registe presenças, acompanhe o progresso sacramental, comunique-se com as famílias e gere relatórios.',
  },
];

// ─── Testimonials ──────────────────────────────────────────────────────────

const TESTIMONIALS = [
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
  {
    name: 'Ana Costa',
    role: 'Catequista',
    text: 'A chamada pelo celular é prática demais! A biblioteca com Bíblia, Catecismo e Diretório integrados facilita muito a preparação dos encontros. E os pais adoram o portal da família.',
  },
];

// ─── FAQ ───────────────────────────────────────────────────────────────────

const FAQ = [
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

// ─── Component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        {/* ═══ Hero ═══ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

          <div className="relative max-w-4xl mx-auto px-4 py-24 md:py-32 text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm">
              <Cross className="h-4 w-4" />
              Plataforma pastoral católica de gestão catequética
              <Sparkles className="h-4 w-4 text-accent" />
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              Toda a catequese
              <br />
              <span className="text-gradient-primary">num só lugar</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Turmas, presenças, sacramentos, conteúdos, comunicação e documentos.{' '}
              <span className="font-semibold text-foreground">Da paróquia à diocese.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                to="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground px-8 text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
              >
                Começar gratuitamente
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-input bg-background px-8 text-sm font-semibold hover:bg-accent hover:text-accent-foreground transition-all hover:-translate-y-0.5"
              >
                Ver recursos
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              ✓ Sem cartão de crédito &nbsp; ✓ Plano gratuito para sempre &nbsp; ✓ Comece em 5 minutos
            </p>
          </div>
        </section>

        {/* ═══ Para quem é ═══ */}
        <section className="border-y bg-card/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <div className="text-center mb-10 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold">Para cada pessoa da catequese</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Cada perfil tem as ferramentas certas para o seu papel na jornada de fé.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {PERSONAS.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="inline-flex rounded-lg bg-primary/10 p-2">
                    <p.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Features ═══ */}
        <section id="features" className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold">Tudo que sua catequese precisa</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa: da chamada de presença à jornada sacramental, da Bíblia ao portal da família.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border bg-card p-7 space-y-4 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="inline-flex rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Como funciona ═══ */}
        <section className="bg-muted/30 border-y">
          <div className="max-w-4xl mx-auto px-4 py-20">
            <div className="text-center mb-12 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold">Comece em três passos</h2>
              <p className="text-lg text-muted-foreground">Simples, rápido e sem complicação.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={i} className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mx-auto">
                    {s.number}
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-10">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
              >
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ Planos ═══ */}
        <section className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold">Planos para cada etapa</h2>
            <p className="text-lg text-muted-foreground">Comece gratuitamente. Evolua quando sua catequese crescer.</p>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: 'Catequista Grátis',
                price: 'Grátis',
                period: '',
                desc: 'Para um catequista individual',
                features: ['1 turma', '20 catequizandos', 'Presenças digitais', 'Bíblia e Catecismo', 'Calendário litúrgico', 'Suporte comunitário'],
              },
              {
                name: 'Catequista Pro',
                price: 'R$ 9',
                period: '/mês',
                desc: 'Para catequistas dedicados',
                features: ['Turmas ilimitadas', 'Catequizandos ilimitados', 'Relatórios avançados', 'Comunicação com famílias', 'Suporte prioritário'],
              },
              {
                name: 'Catequista IA',
                price: 'R$ 29',
                period: '/mês',
                desc: 'IA para criar encontros, atividades e mensagens em segundos',
                features: ['Tudo do plano Pro', 'Gerador de encontros por IA', 'Planejamento anual automático', 'Gerador de atividades', 'Assistente teológico', '15 créditos de IA/mês'],
                highlight: true,
              },
              {
                name: 'Paróquia',
                price: 'R$ 49',
                period: '/mês',
                desc: 'Ferramentas para a paróquia inteira',
                features: ['Tudo ilimitado', 'Multi-catequista', 'Hub de comunicação', 'Documentos e certidões', 'Consentimentos LGPD', 'Relatórios por turma'],
              },
              {
                name: 'Diocese',
                price: 'R$ 149',
                period: '/mês',
                desc: 'Gestão centralizada para a diocese',
                features: ['Multi-paróquia', 'Analytics consolidado', 'Biblioteca diocesana', 'Gestão centralizada', 'Onboarding dedicado', 'Suporte prioritário'],
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl border-2 p-6 bg-card transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col ${
                  plan.highlight
                    ? 'border-primary ring-2 ring-primary/20 scale-[1.02] sm:scale-105 shadow-lg shadow-primary/10'
                    : 'border-border'
                }`}
              >
                {plan.highlight && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 mb-3 self-start">
                    <Star className="h-3 w-3" /> Mais popular
                  </div>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                <div className="mt-4 mb-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-base font-normal text-muted-foreground">{plan.period}</span>}
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-6 block text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {plan.price === 'Grátis' ? 'Começar grátis' : 'Começar agora'}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            <Link to="/pricing" className="underline hover:text-foreground transition-colors">
              Ver comparação completa de planos →
            </Link>
          </p>
        </section>

        {/* ═══ Testimonials ═══ */}
        <section className="bg-muted/30 border-y">
          <div className="max-w-5xl mx-auto px-4 py-20">
            <div className="text-center mb-12 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold">Quem usa recomenda</h2>
              <p className="text-lg text-muted-foreground">Depoimentos de quem já transformou a catequese com a plataforma.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 space-y-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="max-w-3xl mx-auto px-4 py-20">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold">Perguntas frequentes</h2>
            <p className="text-lg text-muted-foreground">Tudo que você precisa saber antes de começar.</p>
          </div>

          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <details key={i} className="group rounded-xl border bg-card">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-medium text-sm list-none">
                  {item.q}
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 text-muted-foreground" />
                </summary>
                <p className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ═══ CTA Final ═══ */}
        <section className="max-w-3xl mx-auto px-4 pb-20">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 p-12 space-y-5 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-medium text-primary">
                <Cross className="h-3.5 w-3.5" />
                Comece em 5 minutos
              </div>
              <h2 className="text-3xl font-bold">Sua catequese merece o melhor</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Junte-se a coordenadores, catequistas e famílias que já usam a Catequese Viva para organizar, acompanhar e celebrar a formação cristã.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  to="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground px-10 text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
                >
                  Criar conta gratuita
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-input bg-background px-8 text-sm font-semibold hover:bg-accent transition-all"
                >
                  Ver planos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
