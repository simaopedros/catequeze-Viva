import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollaborative } from './CollaborativeContext';
import { CollaborativeChat } from './CollaborativeChat';
import { ContextShelf } from './ContextShelf';
import { SuggestionCards } from './SuggestionCards';
import { TheologicalDepthSlider } from './TheologicalDepthSlider';
import { SaintStoryInjector } from './SaintStoryInjector';
import { PedagogicalHooksPanel } from './PedagogicalHooksPanel';
import { Button } from '../../../client/components/ui/button';
import { MessageSquare, Paperclip, Lightbulb, Settings2, Circle } from 'lucide-react';
import { cn } from '../../../client/utils';

type LeftTab = 'chat' | 'context' | 'suggestions' | 'tools';

export function CoPilotPanel() {
  const { t } = useTranslation('collaborative');
  const [activeTab, setActiveTab] = useState<LeftTab>('chat');
  const { contentItem, messages, attachments, suggestions } = useCollaborative();

  const tabs: { id: LeftTab; label: string; icon: React.ElementType }[] = [
    { id: 'chat', label: t('chat.tab'), icon: MessageSquare },
    { id: 'context', label: t('context.title'), icon: Paperclip },
    { id: 'suggestions', label: t('suggestions.title'), icon: Lightbulb },
    { id: 'tools', label: t('tools.title'), icon: Settings2 },
  ];

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b bg-card-subtle/60 px-3 py-2 shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{t('workspace.copilot')}</p>
            <p className="truncate text-caption text-muted-foreground">
              {contentItem?.theme || t('workspace.awaiting_theme')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-1 text-overline font-medium text-muted-foreground">
            <Circle className="h-2 w-2 fill-success text-success" />
            {t('workspace.ai_ready')}
          </span>
        </div>
        <div className="grid grid-cols-4 overflow-hidden rounded-md border bg-background">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex min-w-0 items-center justify-center gap-1 px-1.5 py-2 text-caption font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden truncate min-[375px]:inline">{tab.label}</span>
          </button>
        ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-overline text-muted-foreground">
          <span className="truncate rounded bg-background px-2 py-1">{messages.length} {t('workspace.messages')}</span>
          <span className="truncate rounded bg-background px-2 py-1">{attachments.length} {t('workspace.sources')}</span>
          <span className="truncate rounded bg-background px-2 py-1">{suggestions.length} {t('workspace.ideas')}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <CollaborativeChat />}
        {activeTab === 'context' && <ContextShelf />}
        {activeTab === 'suggestions' && <SuggestionCards />}
        {activeTab === 'tools' && (
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            <TheologicalDepthSlider />
            <SaintStoryInjector />
            <PedagogicalHooksPanel />
          </div>
        )}
      </div>
    </div>
  );
}
