import { useTranslation } from 'react-i18next';
import { Sparkles, Wand2 } from 'lucide-react';

export function AiPlannerMock() {
  const { t } = useTranslation('landing');
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-overline sm:text-xs">
      <div className="flex items-center gap-2">
        <div className="rounded-sm border border-border/70 bg-muted/30 p-1.5"><Sparkles className="h-4 w-4 text-[#071A2D]" /></div>
        <div>
          <p className="font-semibold text-sm">{t('mock.ai_title') || 'Gerador de Encontros IA'}</p>
          <p className="text-muted-foreground">{t('mock.ai_subtitle') || 'Base teológica CNBB · Catecismo · Diretório'}</p>
        </div>
      </div>
      <div className="rounded-sm border border-border/70 bg-white p-3 space-y-2">
        <p className="font-medium text-muted-foreground">{t('mock.prompt') || 'Prompt'}</p>
        <p className="rounded-sm bg-muted/50 p-2">{t('mock.ai_example') || 'Encontro sobre Eucaristia para crianças de 9 anos, 60 minutos, abordagem lúdica'}</p>
        <button type="button" className="flex items-center gap-1 rounded-sm bg-[#071A2D] text-white px-3 py-1.5 font-medium"><Wand2 className="h-3 w-3" />{t('mock.generate') || 'Gerar encontro'}</button>
      </div>
      <div className="rounded-sm border border-[#071A2D]/20 bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[#071A2D]">{t('mock.generated') || 'Roteiro gerado'}</p>
          <span className="rounded-sm bg-[#071A2D]/08 text-[#071A2D] px-2 py-0.5 text-overline">{t('mock.credits') || '3 créditos'}</span>
        </div>
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-2">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm bg-[#071A2D]/08 text-[#071A2D] text-overline font-semibold">{i}</span>
              <span>{t(`mock.ai_step${i}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
