import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useCollaborative } from './CollaborativeContext';
import { QuickSetupPanel } from './QuickSetupPanel';
import { getContentItem } from 'wasp/client/operations';
import { modeToIntent, type SessionContext } from '../../../shared/intent';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';

export function AutoStartPanel({ mode }: { mode: string }) {
  const { t } = useTranslation('ai');
  const { startSession, generating, setupComplete } = useCollaborative();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'starting' | 'fallback' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const contentId = searchParams.get('contentId');

  useEffect(() => {
    if (!contentId || setupComplete) return;

    (async () => {
      try {
        setStatus('loading');
        const content = await getContentItem({ id: contentId });
        if (!content) {
          setStatus('fallback');
          return;
        }

        // Extract context from content
        const theme = content.title || content.theme || 'Encontro de catequese';
        let ageGroup = 'Crisma: 12-15 anos';
        try {
          if (content.aiPrompt) {
            const parsed = JSON.parse(content.aiPrompt);
            if (parsed.ageGroup) ageGroup = parsed.ageGroup;
          }
        } catch {}

        setStatus('starting');
        const ctx: SessionContext = {
          intent: modeToIntent(mode),
          theme,
          ageGroup,
          duration: content.estimatedTime || 60,
          approach: 'mixed',
          contentId: contentId,
          meetingId: null,
          source: 'content_edit',
          manualCreation: false,
        };
        await startSession(ctx);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Erro ao iniciar sessão');
        setStatus('error');
      }
    })();
  }, [contentId, setupComplete, startSession]);

  // If session already started, nothing to show (parent renders workspace)
  if (setupComplete) return null;

  // On error, show fallback with option to retry or use manual setup
  if (status === 'error') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-3 py-6">
        <div className="w-full max-w-md text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <p className="font-semibold text-destructive">Erro ao carregar conteúdo</p>
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setStatus('fallback')}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Configurar manualmente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to manual setup
  if (status === 'fallback') {
    return <QuickSetupPanel mode={mode} />;
  }

  // Loading / starting state
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-3 py-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm border border-border/70 bg-muted/30">
          {status === 'starting' ? (
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          ) : (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold">
            {status === 'starting' ? t('planner.generating_title') : 'A carregar conteúdo...'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {status === 'starting' ? 'A preparar o seu conteúdo no Copiloto...' : 'A obter os dados do conteúdo existente...'}
          </p>
        </div>
      </div>
    </div>
  );
}
