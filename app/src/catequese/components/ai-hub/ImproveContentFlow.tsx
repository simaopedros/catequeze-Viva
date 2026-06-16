import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { CollaborativeProvider, useCollaborative } from '../collaborative/CollaborativeContext';
import { CoPilotPanel } from '../collaborative/CoPilotPanel';
import { MeetingEditor } from '../collaborative/MeetingEditor';
import { QuickSetupPanel } from '../collaborative/QuickSetupPanel';
import { AiHubLayout } from './AiHubLayout';
import { ContentSourcePicker } from './ContentSourcePicker';
import { Button } from '../../../client/components/ui/button';
import { Card } from '../../../client/components/ui/card';
import { Circle, RotateCcw, Pencil, FileText, Copy, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';

function ImproveWorkspace() {
  const { t } = useTranslation('ai');
  const { t: tc } = useTranslation('collaborative');
  const { setupComplete, creditsLeft, contentItemId } = useCollaborative();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const contentId = searchParams.get('contentId');
  const subIntent = searchParams.get('intent');
  const choice = searchParams.get('apply') as 'copy' | 'original' | null;
  const mode = 'improve-content';

  // Load existing content summary — use the contentId from URL to display info
  const existingContentTitle = searchParams.get('contentTitle');

  // If no setup yet and no choice made → show decision screen
  if (!setupComplete && choice === null) {
    return (
      <AiHubLayout
        title={subIntent === 'adapt' ? t('hub.existing_adapt') : t('hub.existing_improve')}
        subtitle={t('improve.decision_subtitle')}
        creditsLeft={creditsLeft}
      >
        <div className="flex items-center justify-center px-3 py-6">
          <div className="w-full max-w-2xl space-y-6">
            {contentId && (
              <Card className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {existingContentTitle ? decodeURIComponent(existingContentTitle) : t('planner.untitled')}
                    </h3>
                  </div>
                </div>
              </Card>
            )}

            <p className="text-sm text-muted-foreground text-center">{t('improve.choice_prompt')}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.set('apply', 'copy');
                  return next;
                })}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left transition-all hover:border-primary hover:bg-primary/10 hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Copy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t('improve.create_copy')}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t('improve.create_copy_desc')}</p>
                </div>
                <div className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Check className="h-3 w-3" />
                  {t('improve.recommended')}
                </div>
              </button>

              <button
                onClick={() => setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.set('apply', 'original');
                  return next;
                })}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t('improve.apply_original')}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t('improve.apply_original_desc')}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </AiHubLayout>
    );
  }

  // Setup not complete but choice made → show setup form
  if (!setupComplete) {
    return <QuickSetupPanel mode={mode} applyToOriginal={choice === 'original'} />;
  }

  // Setup complete → collaborative workspace (result may be copy or original)
  const handleStartOver = () => {
    navigate('/app/ai-hub');
  };

  return (
    <AiHubLayout
      title={subIntent === 'adapt' ? t('hub.existing_adapt') : t('hub.existing_improve')}
      subtitle={
        choice === 'copy'
          ? t('improve.copy_mode_badge')
          : t('improve.original_mode_badge')
      }
      creditsLeft={creditsLeft}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 border-b bg-card px-3 py-2 shrink-0 lg:px-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <Circle className="h-2 w-2 fill-current" />
            {tc('workspace.live_status')}
          </div>
          {choice === 'copy' && (
            <div className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary">
              <Copy className="h-3 w-3" />
              {t('improve.copy_badge')}
            </div>
          )}
          {choice === 'original' && (
            <div className="inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              {t('improve.original_badge')}
            </div>
          )}
        </div>
        <div className="flex-1 flex min-h-0 flex-col overflow-hidden lg:flex-row">
          <div className="min-h-[42vh] shrink-0 overflow-hidden border-b lg:min-h-0 lg:w-[360px] xl:w-[400px] lg:border-b-0 lg:border-r">
            <CoPilotPanel />
          </div>
          <div className="min-h-[58vh] flex-1 overflow-hidden flex flex-col min-w-0 lg:min-h-0">
            <MeetingEditor />
          </div>
        </div>
        <div className="flex items-center gap-3 border-t bg-card px-3 py-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleStartOver}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {t('planner.back_to_hub')}
          </Button>
          {contentItemId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/content-library/${contentItemId}/edit`}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                {t('planner.edit_publish')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </AiHubLayout>
  );
}

export function ImproveContentFlow() {
  const { t } = useTranslation('ai');
  const [searchParams, setSearchParams] = useSearchParams();
  const contentId = searchParams.get('contentId');
  const subIntent = searchParams.get('intent');
  const modeLabel = subIntent === 'adapt' ? 'hub.existing_adapt' : 'hub.existing_improve';

  if (!contentId) {
    const handleContentSelected = (cid: string, ctitle: string, ctheme?: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('contentId', cid);
        next.set('contentTitle', ctitle);
        if (ctheme) next.set('contentTheme', ctheme);
        return next;
      });
    };

    return (
      <AiHubLayout title={t(modeLabel)}>
        <ContentSourcePicker mode="improve-content" onSelect={handleContentSelected} />
      </AiHubLayout>
    );
  }

  return (
    <CollaborativeProvider>
      <ImproveWorkspace />
    </CollaborativeProvider>
  );
}
