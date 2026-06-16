import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Sparkles, FilePenLine, ArrowLeft, MessageSquareText, Pencil, Puzzle, Smartphone, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  const [step, setStep] = useState<HubStep>('menu');

  const handleCreateNew = () => {
    setSearchParams({ mode: 'create-meeting' });
  };

  const handleExisting = () => {
    setStep('existing');
  };

  const handleSubOption = (option: SubOption) => {
    setSearchParams(option.intent ? { mode: option.mode, intent: option.intent } : { mode: option.mode });
  };

  const handleAskAssistant = () => {
    window.dispatchEvent(new CustomEvent('open-ai-widget'));
  };

  const handleBack = () => {
    setStep('menu');
  };

  // ── Step 2: "Usar um conteúdo já criado" sub-options ──────────────────
  if (step === 'existing') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-3 py-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('hub.existing_title')}</h1>
            <p className="text-muted-foreground">{t('hub.existing_subtitle')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {EXISTING_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handleSubOption(option)}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <option.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t(option.titleKey)}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t(option.descKey)}</p>
                </div>
              </button>
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

  // ── Step 1: main menu (2 cards) ──────────────────────────────────────────
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-3 py-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('hub.title')}</h1>
          <p className="text-muted-foreground">{t('hub.subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={handleCreateNew}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t('hub.create_new')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t('hub.create_new_desc')}</p>
            </div>
          </button>

          <button
            onClick={handleExisting}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <FilePenLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t('hub.use_existing')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t('hub.use_existing_desc')}</p>
            </div>
          </button>
        </div>

        {/* Secondary CTA: Assistente Teológico */}
        <div className="pt-2 text-center">
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
