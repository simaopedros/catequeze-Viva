import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { generateWhatsAppMessage } from 'wasp/client/operations';
import { AiHubLayout } from './AiHubLayout';
import { ContentSourcePicker } from './ContentSourcePicker';
import { WhatsappResultPanel } from './WhatsappResultPanel';
import { Button } from '../../../client/components/ui/button';
import { Card } from '../../../client/components/ui/card';
import { Label } from '../../../client/components/ui/label';
import { Loader2, Smartphone, FileText } from 'lucide-react';
import { toast } from '../../../client/hooks/use-toast';

const TONES = [
  { value: 'acolhedor', labelKey: 'whatsapp.tone_warm' },
  { value: 'direto', labelKey: 'whatsapp.tone_direct' },
  { value: 'pastoral', labelKey: 'whatsapp.tone_pastoral' },
  { value: 'breve', labelKey: 'whatsapp.tone_brief' },
];

const LENGTHS = [
  { value: 'curto', labelKey: 'whatsapp.length_short' },
  { value: 'medio', labelKey: 'whatsapp.length_medium' },
  { value: 'detalhado', labelKey: 'whatsapp.length_detailed' },
];

export function GenerateWhatsappFlow() {
  const { t } = useTranslation('ai');
  const [searchParams, setSearchParams] = useSearchParams();
  const contentId = searchParams.get('contentId');
  const contentTitle = searchParams.get('contentTitle');
  const meetingTitle = searchParams.get('meetingTitle');
  const meetingId = searchParams.get('meetingId');

  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tone, setTone] = useState('acolhedor');
  const [length, setLength] = useState('medio');
  const [step, setStep] = useState<'pick_content' | 'configure' | 'result'>(
    contentId ? 'configure' : 'pick_content'
  );

  const displayTitle = contentTitle
    ? decodeURIComponent(contentTitle)
    : meetingTitle
    ? decodeURIComponent(meetingTitle)
    : '';

  const handleContentSelected = (cid: string, ctitle: string, ctheme?: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('contentId', cid);
      next.set('contentTitle', ctitle);
      if (ctheme) next.set('contentTheme', ctheme);
      return next;
    });
    setStep('configure');
  };

  const handleGenerate = async () => {
    if (!contentId) {
      setError(t('whatsapp.no_content'));
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const result: any = await generateWhatsAppMessage({
        contentId,
        tone,
        length,
        meetingId: meetingId || undefined,
      });
      setMessage(result.message || '');
      setStep('result');
    } catch (e: any) {
      const msg = e?.message || t('whatsapp.error');
      setError(msg);
      toast({ title: t('whatsapp.error_title'), description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (step === 'pick_content') {
    return (
      <AiHubLayout title={t('hub.existing_whatsapp')}>
        <ContentSourcePicker mode="generate-whatsapp" onSelect={handleContentSelected} />
      </AiHubLayout>
    );
  }

  if (step === 'result' && message) {
    return (
      <AiHubLayout title={t('hub.existing_whatsapp')}>
        <WhatsappResultPanel
          message={message}
          contentId={contentId || ''}
          onRegenerate={handleGenerate}
          onBack={() => setStep('configure')}
        />
      </AiHubLayout>
    );
  }

  return (
    <AiHubLayout
      title={t('hub.existing_whatsapp')}
      subtitle={t('whatsapp.config_subtitle')}
    >
      <div className="flex items-center justify-center px-3 py-6">
        <div className="w-full max-w-2xl space-y-6">
          {displayTitle && (
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{displayTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('whatsapp.source_content')}</p>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div className="space-y-3">
            <Label className="text-base font-semibold">{t('whatsapp.tone_label')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TONES.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTone(opt.value)}
                  className={`rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors ${
                    tone === opt.value
                      ? 'border-[#071A2D] bg-muted/30 text-foreground'
                      : 'border-border/70 hover:border-primary/30'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">{t('whatsapp.length_label')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {LENGTHS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLength(opt.value)}
                  className={`rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors ${
                    length === opt.value
                      ? 'border-[#071A2D] bg-muted/30 text-foreground'
                      : 'border-border/70 hover:border-primary/30'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !contentId}
            className="w-full gap-2"
            size="lg"
          >
            {generating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> {t('whatsapp.generating')}</>
            ) : (
              <><Smartphone className="h-5 w-5" /> {t('whatsapp.generate')}</>
            )}
          </Button>
        </div>
      </div>
    </AiHubLayout>
  );
}
