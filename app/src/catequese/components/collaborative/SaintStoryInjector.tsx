import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCollaborative } from './CollaborativeContext'
import { Button } from '../../../client/components/ui/button'
import { Card } from '../../../client/components/ui/card'
import { Badge } from '../../../client/components/ui/badge'
import { Church, Loader2, Sparkles } from 'lucide-react'
import { getSaintStory } from 'wasp/client/operations'

export function SaintStoryInjector() {
  const { t } = useTranslation('collaborative')
  const { contentItem, sendMessage } = useCollaborative()
  const [story, setStory] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const theme = contentItem?.theme || ''
  let ageGroup = 'Crisma: 12-15 anos'
  try {
    if (contentItem?.aiPrompt) {
      const parsed = JSON.parse(contentItem.aiPrompt)
      if (parsed.ageGroup) ageGroup = parsed.ageGroup
    }
  } catch {}

  const handleFetch = async () => {
    setLoading(true)
    setError('')
    setStory(null)
    try {
      const result = await getSaintStory({ theme, ageGroup })
      setStory(result)
    } catch (e: any) {
      setError(e?.message || t('tools.saint.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = () => {
    if (!story) return
    sendMessage(
      `Adicione ao Conteúdo Central uma história sobre ${story.saintName} (${story.feastDay}). ` +
      `A história: ${story.story}. Virtude: ${story.virtue}. Lição prática: ${story.practicalLesson}`
    )
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Church className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('tools.saint.title')}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t('tools.saint.description')}</p>
      </div>

      {!story && !loading && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleFetch}>
          <Sparkles className="h-3.5 w-3.5 mr-1" /> {t('tools.saint.search')}
        </Button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('tools.saint.searching')}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {story && (
        <div className="space-y-2">
          <div className="bg-muted/50 rounded-sm p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{story.saintName}</Badge>
              <span className="text-xs text-muted-foreground">{story.feastDay}</span>
            </div>
            <p className="text-xs whitespace-pre-wrap leading-relaxed">{story.story}</p>
            <div className="text-xs">
              <span className="font-semibold">{t('tools.saint.virtue')}:</span> {story.virtue}
            </div>
            <div className="text-xs">
              <span className="font-semibold">{t('tools.saint.lesson')}:</span> {story.practicalLesson}
            </div>
          </div>
          <Button variant="default" size="sm" className="w-full text-xs" onClick={handleInsert}>
            <Sparkles className="h-3.5 w-3.5 mr-1" /> {t('tools.saint.insert')}
          </Button>
        </div>
      )}
    </Card>
  )
}
