import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';

interface CompletionSummary {
  role: string;
  title: string;
  description: string;
  items: { label: string; value: string }[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

interface CompletionStepProps {
  summary: CompletionSummary;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

export function CompletionStep({
  summary,
  onPrimaryAction,
  onSecondaryAction,
}: CompletionStepProps) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="rounded-full bg-success/10 p-4 animate-in zoom-in duration-300 ring-8 ring-success/5">
        <Check className="h-10 w-10 text-success" />
      </div>

      <div className="space-y-2 max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full border border-success/15 bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-success">
          <Sparkles className="h-3.5 w-3.5" />
          {t('completion.progress_badge')}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{summary.title}</h2>
        <p className="text-muted-foreground">{summary.description}</p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-4 text-left space-y-2">
        {summary.items.map((item, i) => (
          <div key={i} className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-right font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button onClick={onPrimaryAction} size="lg" className="w-full gap-2">
          {summary.primaryActionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button onClick={onSecondaryAction} variant="outline" size="lg" className="w-full gap-2">
          {summary.secondaryActionLabel}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{t('completion.next_step_hint')}</p>
    </div>
  );
}
