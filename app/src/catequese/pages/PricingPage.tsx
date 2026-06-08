import { useNavigate } from 'react-router';
import { Star, Check, User, Building2, Zap, CreditCard, PiggyBank } from 'lucide-react';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { useAuth } from 'wasp/client/auth';
import { setIntendedPlan } from '../lib/intendedPlan';
import { PLANS, PLAN_IDS, type PlanId } from '../../shared/pricing';

type PlanLevel = 'personal' | 'institutional';

interface PricingPlan {
  planId: PlanId;
  level: PlanLevel;
  name: string;
  price: string;
  annualPrice?: string;
  period?: string;
  desc: string;
  features: string[];
  highlight?: boolean;
  cta: string;
}

const PRICING_PLANS: PricingPlan[] = PLAN_IDS.map((id) => {
  const def = PLANS[id];
  const monthly = def.prices.monthlyCents;
  const annual = def.prices.annualCents;

  let price: string;
  let annualPrice: string | undefined;
  let period: string | undefined;

  if (monthly === 0) {
    price = 'Grátis';
    period = 'para sempre';
  } else {
    price = `R$ ${(monthly / 100).toFixed(0).replace('.', ',')}`;
    period = '/mês';
    if (annual != null) {
      const annualBRL = (annual / 100).toFixed(0).replace('.', ',');
      const monthlyEquivalent = (annual / 1200).toFixed(0).replace('.', ',');
      annualPrice = `R$ ${annualBRL}/ano (R$${monthlyEquivalent}/mês)`;
    }
  }

  return {
    planId: id,
    level: def.level,
    name: def.name,
    price,
    annualPrice,
    period,
    desc: getPlanDesc(id),
    features: def.features,
    highlight: def.highlight,
    cta: monthly === 0 ? 'Começar grátis' : 'Começar agora',
  };
});

function getPlanDesc(planId: PlanId): string {
  switch (planId) {
    case 'catechist_free':
      return 'Para um catequista que quer começar a organizar sua turma.';
    case 'catechist_pro':
      return 'Para catequistas dedicados com múltiplas turmas.';
    case 'catechist_ai':
      return 'Inteligência Artificial para criar encontros, atividades e mensagens em segundos.';
    case 'parish_essential':
      return 'Para paróquias que buscam gestão completa da catequese com time enxuto.';
    case 'parish_complete':
      return 'Gestão completa e ilimitada para paróquias com grandes equipes.';
    case 'diocese':
      return 'Para gestão diocesana multi-paróquia com IA por paróquia.';
  }
}

const PERSONAL_PLANS = PRICING_PLANS.filter((p) => p.level === 'personal');
const INSTITUTIONAL_PLANS = PRICING_PLANS.filter((p) => p.level === 'institutional');

const FAQ = [
  {
    q: 'Posso experimentar antes de pagar?',
    a: 'Sim! O plano Catequista Grátis é gratuito para sempre, com 2 turmas, até 30 catequizandos e 10 créditos de IA iniciais para testar o gerador de encontros.',
  },
  {
    q: 'Como funcionam os créditos de IA?',
    a: 'Cada geração de encontro consome 1 crédito, planejamento anual 3 créditos, e atividade 1 crédito. O plano IA inclui 20 créditos/mês, Paróquia Completa 50 créditos/mês e Diocese 50 créditos/mês por paróquia. Créditos não usados não acumulam — renovam a cada mês.',
  },
  {
    q: 'Qual a diferença entre Paróquia Essencial e Completa?',
    a: 'A Essencial é ideal para paróquias com até 5 catequistas e 200 catequizandos. A Completa remove todos os limites e inclui 50 créditos de IA/mês.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'Aceitamos PIX (à vista ou mensal) e cartão de crédito. No plano anual via PIX, o pagamento é único pelos 12 meses. Sem fidelidade — cancele quando quiser.',
  },
  {
    q: 'E o reembolso do plano anual?',
    a: 'Planos anuais pagos via PIX não têm reembolso automático. O cancelamento encerra a renovação, mas o acesso continua até o fim do período pago. Reembolso proporcional é avaliado caso a caso via contato@catequeseviva.com.br. Planos via cartão seguem a política do Stripe.',
  },
  {
    q: 'Posso migrar entre planos?',
    a: 'Sim, a qualquer momento. Ao fazer upgrade, seus dados são preservados automaticamente.',
  },
  {
    q: 'Os dados ficam seguros?',
    a: 'Sim. Seguimos a LGPD, com criptografia em trânsito e em repouso. Dados de crianças recebem proteção especial.',
  },
  {
    q: 'A IA é teologicamente confiável?',
    a: 'Sim. A IA é instruída a se basear estritamente na Bíblia (CNBB), Catecismo da Igreja Católica, Compêndio e Diretório Geral para a Catequese. Todo conteúdo gerado inclui referências para você auditar.',
  },
];

export default function PricingPage() {
  const { data: user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  const handleSelect = (plan: PricingPlan) => {
    if (plan.planId === 'catechist_free') {
      navigate(isLoggedIn ? '/app' : '/signup');
      return;
    }
    setIntendedPlan(plan.planId);
    navigate(isLoggedIn ? `/app/billing?plan=${plan.planId}` : '/signup');
  };

  const renderCard = (plan: PricingPlan) => (
    <div
      key={plan.planId}
      className={`rounded-2xl border-2 p-6 bg-card transition-all hover:-translate-y-1 hover:shadow-lg relative flex flex-col ${
        plan.highlight
          ? 'border-primary ring-2 ring-primary/20 sm:scale-105 shadow-lg shadow-primary/10'
          : 'border-border'
      }`}
    >
      {plan.highlight && (
        <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 mb-3 self-start">
          <Star className="h-3 w-3" /> Mais Popular
        </div>
      )}
      <h3 className="text-lg font-bold">{plan.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
      <div className="mt-4 mb-1">
        <span className="text-4xl font-bold">{plan.price}</span>
        {plan.period && (
          <span className="text-base font-normal text-muted-foreground"> {plan.period}</span>
        )}
      </div>
      {plan.annualPrice && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <PiggyBank className="h-3 w-3" />
          <span>{plan.annualPrice}</span>
        </div>
      )}
      <ul className="mt-5 space-y-2.5 text-sm flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => handleSelect(plan)}
        className={`mt-6 block w-full text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
          plan.highlight
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25'
            : 'bg-muted hover:bg-muted/80'
        }`}
      >
        {plan.cta}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        {/* Header */}
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Planos e Preços</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Escolha o nível certo: planos pessoais para catequistas individuais ou planos institucionais para paróquias e dioceses.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><CreditCard className="h-4 w-4" /> Cartão</span>
            <span className="flex items-center gap-1"><Zap className="h-4 w-4" /> PIX</span>
            <span className="flex items-center gap-1"><PiggyBank className="h-4 w-4" /> Economize 17% no anual</span>
          </div>
        </section>

        {/* Personal plans */}
        <section className="max-w-6xl mx-auto px-4 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Para você (catequista)</h2>
            <span className="text-sm text-muted-foreground">— seu espaço pessoal</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PERSONAL_PLANS.map(renderCard)}
          </div>
        </section>

        {/* Institutional plans */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="flex items-center gap-2 mb-4 mt-6">
            <Building2 className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-bold">Para sua instituição</h2>
            <span className="text-sm text-muted-foreground">— paróquias e dioceses (cobre vários catequistas)</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {INSTITUTIONAL_PLANS.map(renderCard)}
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
