import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router';
import { Sparkles, FilePenLine, ArrowLeft, MessageSquareText, Pencil, Puzzle, Smartphone, Wand2, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { InteractiveCard } from '../../../client/components/InteractiveCard';

const RECENT_FLOWS_KEY = 'cv-aihub-recent';

function loadRecentFlows(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FLOWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentFlow(flowKey: string) {
  const flows = loadRecentFlows().filter(f => f !== flowKey);
  flows.unshift(flowKey);
  localStorage.setItem(RECENT_FLOWS_KEY, JSON.stringify(flows.slice(0, 5)));
}

type HubStep = 'menu' | 'existing';

interface SubOption {
  key: string;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  mode: string;
  intent?: string;
}

const EXISTING_OPTIONS: SubOption[] = [
  {
    key: 'improve',
    titleKey: 'hub.existing_improve',
    descKey: 'hub.existing_improve_desc',
    icon: Pencil,
    mode: 'improve-content',
    intent: 'improve',
  },
  {
    key: 'activity',
    titleKey: 'hub.existing_activity',
    descKey: 'hub.existing_activity_desc',
    icon: Puzzle,
    mode: 'generate-activity',
  },
  {
    key: 'whatsapp',
    titleKey: 'hub.existing_whatsapp',
    descKey: 'hub.existing_whatsapp_desc',
    icon: Smartphone,
    mode: 'generate-whatsapp',
  },
  {
    key: 'adapt',
    titleKey: 'hub.existing_adapt',
    descKey: 'hub.existing_adapt_desc',
    icon: Wand2,
    mode: 'improve-content',
    intent: 'adapt',
  },
];

export function AIHubHome() {
  const { t } = useTranslation('ai');
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<HubStep>('menu');

  const handleCreateNew = () => {
    setSearchParams({ mode: 'create-meeting' });
  };

  const handleCreateManual = () => {
    navigate('/app/content-library/new');
  };

  const handleExisting = () => {
    setStep('existing');
  };

  const handleSubOption = (option: SubOption) => {
    setSearchParams(option.intent ? { mode: option.mode, intent: option.intent } : { mode: option.mode });
  };

  const handleAskAssistant = () => {
    setSearchParams({ assistant: 'open' });
    window.dispatchEvent(new CustomEvent('open-ai-widget'));
  };

  const handleBack = () => {
    setStep('menu');
  };

  // ── Step 2: "Usar um conteúdo já criado" sub-options ──────────────────
  if (step === 'existing') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              Copiloto de Conteudo
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t('hub.existing_title')}
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t('hub.existing_subtitle')}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {EXISTING_OPTIONS.map((option) => (
              <InteractiveCard
                key={option.key}
                icon={option.icon}
                title={t(option.titleKey)}
                description={t(option.descKey)}
                onClick={() => handleSubOption(option)}
                showArrow
                flat
                className="h-full rounded-3xl border-border/70 bg-gradient-to-b from-background to-muted/30 p-6 shadow-sm shadow-black/5 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
              />
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common:back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: main menu ──────────────────────────────────────────
  const recentFlows = loadRecentFlows();

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            Copiloto de Conteudo
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t('hub.title')}
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t('hub.subtitle')}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <InteractiveCard
            icon={FilePenLine}
            title="Criar manualmente"
            description="Monte o encontro no editor visual, adicione referências e recursos, e use IA apenas se quiser."
            onClick={handleCreateManual}
            showArrow
            flat
            className="h-full rounded-3xl border-border/70 bg-gradient-to-b from-background to-muted/30 p-6 shadow-sm shadow-black/5 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
          >
            <p className="mt-3 max-w-[28ch] text-sm italic leading-relaxed text-muted-foreground">
              "Começar do zero e editar os blocos manualmente"
            </p>
          </InteractiveCard>
          <InteractiveCard
            icon={Sparkles}
            title={t('hub.create_new')}
            description={t('hub.create_new_desc')}
            onClick={() => { saveRecentFlow('create-meeting'); handleCreateNew(); }}
            showArrow
            flat
            className="h-full rounded-3xl border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-amber-50/80 p-6 shadow-sm shadow-primary/10 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15"
          >
            <p className="mt-3 max-w-[28ch] text-sm italic leading-relaxed text-muted-foreground">
              "{t('hub.example_create')}"
            </p>
          </InteractiveCard>
          <InteractiveCard
            icon={FilePenLine}
            title={t('hub.use_existing')}
            description={t('hub.use_existing_desc')}
            onClick={handleExisting}
            showArrow
            flat
            className="h-full rounded-3xl border-border/70 bg-gradient-to-b from-background to-muted/30 p-6 shadow-sm shadow-black/5 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
          >
            <p className="mt-3 max-w-[28ch] text-sm italic leading-relaxed text-muted-foreground">
              "{t('hub.example_existing')}"
            </p>
          </InteractiveCard>
        </div>

        {/* Recent flows */}
        {recentFlows.length > 0 && (
          <div className="pt-2">
            <p className="text-overline text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {t('hub.recent_flows')}
            </p>
            <div className="flex flex-wrap gap-2">
              {recentFlows.map(flow => {
                const label = t(`hub.recent_${flow}`, flow);
                const mode = flow === 'create-meeting' ? 'create-meeting' : 'improve-content';
                return (
                  <button
                    key={flow}
                    onClick={() => setSearchParams({ mode })}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Assistente Teológico */}
        <div className="pt-2 text-center border-t border-border/50">
          <p className="text-overline text-muted-foreground mb-2">
            {t('hub.assistant_context')}
          </p>
          <button
            onClick={handleAskAssistant}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <MessageSquareText className="h-4 w-4" />
            <span>{t('hub.ask_cta')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

