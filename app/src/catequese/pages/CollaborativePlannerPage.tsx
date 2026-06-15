import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CollaborativeProvider, useCollaborative } from '../components/collaborative/CollaborativeContext';
import { AppShell } from '../AppShell';
import { CoPilotPanel } from '../components/collaborative/CoPilotPanel';
import { MeetingEditor } from '../components/collaborative/MeetingEditor';
import { QuickSetupPanel } from '../components/collaborative/QuickSetupPanel';
import { Button } from '../../client/components/ui/button';
import { Sparkles, ArrowLeft, Circle, UsersRound } from 'lucide-react';

function PlannerContent() {
  const { t } = useTranslation('ai');
  const { t: tc } = useTranslation('collaborative');
  const { setupComplete, creditsLeft } = useCollaborative();

  if (!setupComplete) {
    return <QuickSetupPanel />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-col gap-3 border-b bg-card px-3 py-3 shrink-0 lg:flex-row lg:items-center lg:justify-between lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/content-library" aria-label={tc('actions.back_to_library')}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-lg font-bold">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              {t('planner.title')}
            </h1>
            <p className="truncate text-xs text-muted-foreground">{tc('workspace.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-12 lg:pl-0">
          <div className="inline-flex items-center gap-2 rounded-md border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <Circle className="h-2 w-2 fill-current" />
            {tc('workspace.live_status')}
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" />
            {tc('workspace.presence')}
          </div>
          {creditsLeft !== null && (
            <div className="rounded-md border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              {t('planner.credits_left', { count: creditsLeft })}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex min-h-0 flex-col overflow-hidden lg:flex-row">
        <div className="min-h-[42vh] shrink-0 overflow-hidden border-b lg:min-h-0 lg:w-[360px] xl:w-[400px] lg:border-b-0 lg:border-r">
          <CoPilotPanel />
        </div>
        <div className="min-h-[58vh] flex-1 overflow-hidden flex flex-col min-w-0 lg:min-h-0">
          <MeetingEditor />
        </div>
      </div>
    </div>
  );
}

export default function CollaborativePlannerPage() {
  return (
    <AppShell>
      <CollaborativeProvider>
        <PlannerContent />
      </CollaborativeProvider>
    </AppShell>
  );
}
