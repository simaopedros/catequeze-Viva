import { Link } from 'react-router';
import { Star, Check } from 'lucide-react';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { useAuth } from 'wasp/client/auth';

const PLANS = [
  {
    name: 'Catequista Grátis',
    price: 'Grátis',
    period: 'para sempre',
    desc: 'Para um catequista que quer começar a organizar sua turma.',
    features: ['1 turma', '20 catequizandos', 'Presença básica', 'Calendário litúrgico', '3 créditos de IA (teste)'],
    cta: 'Começar grátis',
  },
  {
    name: 'Catequista Pro',
    price: 'R$ 9',
    period: '/mês',
    desc: 'Para catequistas dedicados com múltiplas turmas.',
    features: ['Turmas ilimitadas', 'Catequizandos ilimitados', 'Relatórios avançados', 'Suporte prioritário'],
    cta: 'Começar agora',
  },
  {
    name: 'Catequista IA',
    price: 'R$ 29',
    period: '/mês',
    desc: 'Inteligência Artificial para criar encontros, atividades e mensagens em segundos.',
    features: ['Tudo do plano Pro', 'Gerador de encontros por IA', 'Planejamento anual automático', 'Gerador de atividades e quizzes', 'Assistente teológico', 'Mensagens WhatsApp para pais', '15 créditos de IA/mês'],
    highlight: true,
    cta: 'Começar agora',
  },
  {
    name: 'Paróquia',
    price: 'R$ 49',
    period: '/mês',
    desc: 'Para paróquias que buscam gestão completa da catequese.',
    features: ['Tudo do plano IA', 'Multi-catequista', 'Comunicação integrada', 'Documentos e certidões', 'Painel do coordenador', '50 créditos de IA/mês'],
    cta: 'Começar agora',
  },
  {
    name: 'Diocese',
    price: 'R$ 149',
    period: '/mês',
    desc: 'Para gestão diocesana multi-paróquia.',
    features: ['Tudo do plano Paróquia', 'Multi-paróquia', 'Biblioteca oficial diocesana', 'Analytics consolidado', 'Onboarding dedicado'],
    cta: 'Fale conosco',
  },
];

const FAQ = [
  { q: 'Posso experimentar antes de pagar?', a: 'Sim! O plano Catequista Grátis é gratuito para sempre, com 1 turma, até 20 catequizandos e 3 créditos de IA para testar o gerador de encontros.' },
  { q: 'Como funcionam os créditos de IA?', a: 'Cada geração de encontro consome 1 crédito. O plano IA inclui 15 créditos/mês e o plano Paróquia 50 créditos/mês. Créditos não usados não acumulam — renovam a cada mês.' },
  { q: 'Como funciona o pagamento?', a: 'Pagamento via PIX com QR code. Sem fidelidade — cancele quando quiser.' },
  { q: 'Posso migrar entre planos?', a: 'Sim, a qualquer momento. Ao fazer upgrade, seus dados são preservados automaticamente.' },
  { q: 'Os dados ficam seguros?', a: 'Sim. Seguimos a LGPD, com criptografia em trânsito e em repouso. Dados de crianças recebem proteção especial.' },
  { q: 'A IA é teologicamente confiável?', a: 'Sim. A IA é instruída a se basear estritamente na Bíblia (CNBB), Catecismo da Igreja Católica, Compêndio e Diretório Geral para a Catequese. Todo conteúdo gerado inclui referências para você auditar.' },
];

export default function PricingPage() {
  const { data: user } = useAuth();
  const isLoggedIn = !!user;
  const upgradeUrl = isLoggedIn ? '/app/billing' : '/signup';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        {/* Header */}
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Planos e Preços</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para sua paróquia ou diocese. Comece gratuitamente e descubra o poder da IA na catequese.
          </p>
        </section>

        {/* Plans */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PLANS.map(plan => (
              <div key={plan.name} className={`rounded-2xl border-2 p-6 bg-card transition-all hover:-translate-y-1 hover:shadow-lg relative flex flex-col ${plan.highlight ? 'border-primary ring-2 ring-primary/20 sm:scale-105 shadow-lg shadow-primary/10' : 'border-border'}`}>
                {plan.highlight && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 mb-3 self-start">
                    <Star className="h-3 w-3" /> Mais popular
                  </div>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                <div className="mt-4 mb-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-base font-normal text-muted-foreground"> {plan.period}</span>}
                </div>
                <ul className="mt-5 space-y-2.5 text-sm flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={upgradeUrl}
                  className={`mt-6 block text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${plan.highlight ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25' : 'bg-muted hover:bg-muted/80'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/30 border-t">
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-center mb-10">Perguntas frequentes</h2>
            <div className="space-y-4">
              {FAQ.map((f, i) => (
                <div key={i} className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
