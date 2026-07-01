import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCollaborative } from './CollaborativeContext'
import { Button } from '../../../client/components/ui/button'
import { Card } from '../../../client/components/ui/card'
import { Input } from '../../../client/components/ui/input'
import { Textarea } from '../../../client/components/ui/textarea'
import { Badge } from '../../../client/components/ui/badge'
import {
  Target,
  Heart,
  Users,
  Home,
  Clock,
  ScrollText,
  Sparkles,
  Loader2,
  History,
  ArrowLeftRight,
  X,
  Check,
  Package,
  Type,
  Plus,
  PencilLine,
  Copy,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { updateContentItem } from 'wasp/client/operations'
import { toast } from '../../../client/hooks/use-toast'

const BLOCKS: Array<{
  field: string
  label: string
  helper: string
  icon: LucideIcon
  type: 'input' | 'textarea'
  minHeight?: string
}> = [
  { field: 'title', label: 'Título do encontro', helper: 'Clique para adicionar um título atrativo para o seu encontro...', icon: Type, type: 'input' },
  { field: 'theme', label: 'Tema', helper: 'Qual é o tema central deste encontro?', icon: Sparkles, type: 'input' },
  { field: 'pastoralObjective', label: 'Objetivo pastoral', helper: 'Qual é o objetivo que desejamos alcançar com este encontro?', icon: Target, type: 'textarea', minHeight: 'min-h-[110px]' },
  { field: 'openingPrayer', label: 'Oração inicial', helper: 'Invoquemos a presença de Deus para este momento...', icon: Heart, type: 'textarea', minHeight: 'min-h-[110px]' },
  { field: 'mainContent', label: 'Conteúdo principal', helper: 'Desenvolva aqui o conteúdo central do encontro...', icon: ScrollText, type: 'textarea', minHeight: 'min-h-[160px]' },
  { field: 'dynamic', label: 'Dinâmica', helper: 'Atividades para envolver e fixar o conteúdo...', icon: Users, type: 'textarea', minHeight: 'min-h-[110px]' },
  { field: 'materials', label: 'Recursos e materiais', helper: 'Materiais necessários para este encontro...', icon: Package, type: 'textarea', minHeight: 'min-h-[110px]' },
  { field: 'familyTask', label: 'Compromisso para a família', helper: 'Como a família pode viver o que foi aprendido?', icon: Home, type: 'textarea', minHeight: 'min-h-[110px]' },
  { field: 'closingPrayer', label: 'Oração final', helper: 'Agradeçamos a Deus e confiemos nossa missão...', icon: Heart, type: 'textarea', minHeight: 'min-h-[110px]' },
]

function BlockActions({ onRefine, disabled }: { onRefine: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled} onClick={onRefine}>
        <PencilLine className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function MeetingBlockComponent({
  index,
  field,
  label,
  helper,
  icon: Icon,
  content,
  type,
  minHeight,
  isStreaming,
  onRefine,
  onSave,
}: {
  index: number
  field: string
  label: string
  helper: string
  icon: LucideIcon
  content: string
  type: 'input' | 'textarea'
  minHeight?: string
  isStreaming: boolean
  onRefine: (instruction?: string) => void
  onSave: (field: string, value: string) => Promise<void>
}) {
  const { t } = useTranslation('collaborative')
  const [showRefine, setShowRefine] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [draft, setDraft] = useState(content || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(content || '')
  }, [content])

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

  const handleSave = async () => {
    if (draft === (content || '')) return
    setSaving(true)
    try {
      await onSave(field, draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
      <div className="flex gap-4 p-4">
        <div className="flex shrink-0 items-start gap-3">
          <div className="pt-1 text-sm font-semibold text-muted-foreground">{index}.</div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/30 text-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[28px] leading-none font-semibold tracking-tight text-foreground sm:text-[30px]">{label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
            </div>
            <div className="flex items-center gap-2">
              {isStreaming && (
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {t('editor.generating')}
                </Badge>
              )}
              {saving && !isStreaming && (
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> salvando
                </Badge>
              )}
              <BlockActions onRefine={handleRefine} disabled={isStreaming} />
            </div>
          </div>

          {showRefine && (
            <div className="flex gap-2 rounded-xl border border-border bg-muted/20 p-2">
              <Input
                ref={inputRef}
                placeholder={t('editor.instruction_placeholder')}
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRefine()}
                className="h-9"
              />
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowRefine(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-9" onClick={handleRefine}>
                <Check className="mr-1 h-3.5 w-3.5" /> Aplicar
              </Button>
            </div>
          )}

          {type === 'input' ? (
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={handleSave}
              placeholder={helper}
              className="h-12 rounded-xl border-border/70"
            />
          ) : (
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={handleSave}
              placeholder={helper}
              className={`resize-none rounded-xl border-border/70 text-sm leading-relaxed ${minHeight || 'min-h-[110px]'}`}
            />
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

  const saveField = async (field: string, value: string | number | undefined) => {
    if (!contentItemId) return
    try {
      await updateContentItem({ id: contentItemId, [field]: value } as any)
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error?.message || 'Tente novamente.', variant: 'destructive' })
      throw error
    }
  }

  const handleRefine = (field: string, instruction?: string) => {
    generateBlock(field, instruction)
  }

  if (!contentItem) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('editor.waiting')}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border/70 px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">{tc('status_draft')}</Badge>
            {contentItem.estimatedTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {contentItem.estimatedTime}min
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowVersions(!showVersions)}>
              <History className="mr-1 h-3.5 w-3.5" /> Versões
            </Button>
            {contentItemId && (
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <Link to={`/app/content-library/${contentItemId}`}>Ver detalhe</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {showVersions && <VersionHistoryPanel onClose={() => setShowVersions(false)} />}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-[980px] space-y-3">
          {BLOCKS.map((block, index) => (
            <MeetingBlockComponent
              key={block.field}
              index={index + 1}
              field={block.field}
              label={block.label}
              helper={block.helper}
              icon={block.icon}
              type={block.type}
              minHeight={block.minHeight}
              content={String((contentItem as any)[block.field] || '')}
              isStreaming={streamingBlock === block.field}
              onRefine={(instruction) => handleRefine(block.field, instruction)}
              onSave={saveField}
            />
          ))}

          <Button variant="outline" className="h-12 w-full rounded-2xl border-dashed text-sm">
            <Plus className="mr-2 h-4 w-4" /> Adicionar bloco
          </Button>
        </div>
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
  }, [contentItemId, getContentVersions])

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
    <div className="border-b bg-muted/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="h-4 w-4" /> {t('editor.history')}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {t('editor.save_version')}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Carregando...</div>}
      {!loading && versions.length === 0 && <p className="text-xs text-muted-foreground">{t('editor.no_versions')}</p>}

      <div className="space-y-2">
        {versions.map(v => (
          <Card key={v.id} className="rounded-2xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold">{t('editor.version')} {v.version}</div>
                <div className="text-caption text-muted-foreground">{new Date(v.createdAt).toLocaleString()} — {v.changeNotes || t('editor.no_description')}</div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleRestore(v.id)} disabled={restoringId === v.id}>
                {restoringId === v.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowLeftRight className="mr-1 h-3 w-3" />}
                {t('editor.restore')}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
