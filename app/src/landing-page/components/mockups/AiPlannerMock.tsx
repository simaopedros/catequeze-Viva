import { useTranslation } from 'react-i18next';
import { Sparkles, Wand2 } from 'lucide-react';

export function AiPlannerMock() {
  const { t } = useTranslation('landing');
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-[10px] sm:text-xs">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-1.5"><Sparkles className="h-4 w-4 text-primary" /></div>
        <div>
          <p className="font-bold text-sm">{t('mock.ai_title') || 'Gerador de Encontros IA'}</p>
          <p className="text-muted-foreground">{t('mock.ai_subtitle') || 'Base teológica CNBB · Catecismo · Diretório'}</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <p className="font-medium text-muted-foreground">{t('mock.prompt') || 'Prompt'}</p>
        <p className="rounded-md bg-muted/50 p-2">{t('mock.ai_example') || 'Encontro sobre Eucaristia para crianças de 9 anos, 60 minutos, abordagem lúdica'}</p>
        <button type="button" className="flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 font-medium"><Wand2 className="h-3 w-3" />{t('mock.generate') || 'Gerar encontro'}</button>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-primary">{t('mock.generated') || 'Roteiro gerado'}</p>
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[9px]">{t('mock.credits') || '3 créditos'}</span>
        </div>
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-2">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">{i}</span>
              <span>{t(`mock.ai_step${i}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
