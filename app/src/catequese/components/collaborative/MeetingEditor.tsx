import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCollaborative } from './CollaborativeContext'
import { Button } from '../../../client/components/ui/button'
import { Card } from '../../../client/components/ui/card'
import { Input } from '../../../client/components/ui/input'
import { Badge } from '../../../client/components/ui/badge'
import {
  BookOpen, Target, Heart, Users, Home, Clock, ScrollText,
  Sparkles, Loader2, Pencil, History, ArrowLeftRight, X, Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

const BLOCKS: Array<{ field: string; labelKey: string; icon: LucideIcon }> = [
  { field: 'pastoralObjective', labelKey: 'blocks.pastoralObjective', icon: Target },
  { field: 'openingPrayer', labelKey: 'blocks.openingPrayer', icon: Heart },
  { field: 'biblicalRef', labelKey: 'blocks.biblicalRef', icon: BookOpen },
  { field: 'mainContent', labelKey: 'blocks.mainContent', icon: ScrollText },
  { field: 'dynamic', labelKey: 'blocks.dynamic', icon: Users },
  { field: 'familyTask', labelKey: 'blocks.familyTask', icon: Home },
  { field: 'closingPrayer', labelKey: 'blocks.closingPrayer', icon: Heart },
]

function MeetingBlockComponent({
  field, labelKey, icon: Icon, content, isStreaming, onRefine,
}: {
  field: string; labelKey: string; icon: LucideIcon; content: string;
  isStreaming: boolean; onRefine: (instruction?: string) => void;
}) {
  const { t } = useTranslation('collaborative')
  const [showRefine, setShowRefine] = useState(false)
  const [instruction, setInstruction] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showRefine && inputRef.current) inputRef.current.focus()
  }, [showRefine])

  const handleRefine = () => {
    if (showRefine) {
      onRefine(instruction || undefined)
      setShowRefine(false)
      setInstruction('')
    } else {
      setShowRefine(true)
    }
  }

  return (
    <Card className={`border-l-4 transition-all ${isStreaming ? 'border-l-primary animate-pulse' : 'border-l-primary/30'}`}>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <h3 className="truncate text-sm font-semibold">{t(labelKey)}</h3>
            {isStreaming && (
              <Badge variant="secondary" className="shrink-0 text-overline">
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> {t('editor.generating')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleRefine}
              disabled={isStreaming}
            >
              {showRefine ? (
                <><Check className="h-3 w-3" /> {t('editor.apply_refine')}</>
              ) : (
                <><Sparkles className="h-3 w-3" /> {t('editor.refine')}</>
              )}
            </Button>
          </div>
        </div>

        {showRefine && (
          <div className="flex gap-1.5">
            <Input
              ref={inputRef}
              placeholder={t('editor.instruction_placeholder')}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRefine()}
              className="h-8 text-xs"
            />
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowRefine(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {content ? content : (
            <span className="text-muted-foreground italic">{t('editor.awaiting_content')}</span>
          )}
        </div>
      </div>
    </Card>
  )
}

export function MeetingEditor() {
  const { t: tc } = useTranslation('content')
  const { t } = useTranslation('collaborative')
  const [showVersions, setShowVersions] = useState(false)
  const {
    contentItem, contentItemId, generateBlock, streamingBlock,
    saveContentVersion, getContentVersions, restoreContentVersion,
  } = useCollaborative()

  const handleRefine = (field: string, instruction?: string) => {
    generateBlock(field, instruction)
  }

  if (!contentItem) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {t('editor.waiting')}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex flex-col gap-3 border-b bg-card px-4 py-3 shrink-0 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold truncate">{contentItem.title || t('editor.no_title')}</h2>
            <Badge variant="secondary">{tc('status_draft')}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contentItem.estimatedTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {contentItem.estimatedTime}min
            </div>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowVersions(!showVersions)}>
            <History className="h-3.5 w-3.5 mr-1" /> {t('editor.versions')}
          </Button>
          {contentItemId && (
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link to={`/app/content-library/${contentItemId}/edit`}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> {t('editor.edit_publish')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {showVersions && <VersionHistoryPanel onClose={() => setShowVersions(false)} />}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 md:p-4">
        {BLOCKS.map(block => (
          <MeetingBlockComponent
            key={block.field}
            field={block.field}
            labelKey={block.labelKey}
            icon={block.icon}
            content={(contentItem as any)[block.field] || ''}
            isStreaming={streamingBlock === block.field}
            onRefine={(instruction) => handleRefine(block.field, instruction)}
          />
        ))}
      </div>
    </div>
  )
}

function VersionHistoryPanel({ onClose }: { onClose: () => void }) {
  const { contentItemId, saveContentVersion, getContentVersions, restoreContentVersion, refreshContentItem } = useCollaborative()
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { t } = useTranslation('collaborative')

  useEffect(() => {
    if (contentItemId) {
      getContentVersions({ contentItemId })
        .then(v => setVersions(v as any[]))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [contentItemId])

  const handleSave = async () => {
    if (!contentItemId) return
    setSaving(true)
    try {
      await saveContentVersion({ contentItemId, changeNotes: 'Snapshot manual' })
      const v = await getContentVersions({ contentItemId })
      setVersions(v as any[])
    } catch {} finally {
      setSaving(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId)
    try {
      await restoreContentVersion({ versionId })
      await refreshContentItem()
      onClose()
    } catch {} finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="border-b bg-muted/20 p-4 space-y-3 max-h-[300px] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <History className="h-4 w-4" /> {t('editor.history')}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {t('editor.save_version')}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
        </div>
      )}

      {!loading && versions.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('editor.no_versions')}</p>
      )}

      {versions.map(v => (
        <Card key={v.id} className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">{t('editor.version')} {v.version}</div>
              <div className="text-caption text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()} — {v.changeNotes || t('editor.no_description')}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleRestore(v.id)}
              disabled={restoringId === v.id}
            >
              {restoringId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowLeftRight className="h-3 w-3 mr-1" />}
              {t('editor.restore')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
