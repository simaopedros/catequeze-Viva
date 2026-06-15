import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCollaborative } from './CollaborativeContext'
import { Button } from '../../../client/components/ui/button'
import { Card } from '../../../client/components/ui/card'
import { Badge } from '../../../client/components/ui/badge'
import { SlidersHorizontal, Loader2 } from 'lucide-react'

const DEPTH_COLORS = ['bg-green-100 text-green-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700']

export function TheologicalDepthSlider() {
  const { t } = useTranslation('collaborative')
  const { depth, adjustDepth, generating } = useCollaborative()
  const depthLabels = [
    t('tools.depth.levels.1'),
    t('tools.depth.levels.2'),
    t('tools.depth.levels.3'),
    t('tools.depth.levels.4'),
    t('tools.depth.levels.5'),
  ]

  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('tools.depth.title')}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t('tools.depth.description')}</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          {depthLabels.map((label, i) => (
            <button
              key={label}
              onClick={() => adjustDepth(i + 1)}
              disabled={generating}
              className={`text-overline px-2 py-1 rounded-full transition-colors ${
                depth === i + 1
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-valuenow={depth}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={t('tools.depth.title')}
          className="relative h-2 bg-muted rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
          onClick={(e) => {
            if (generating) return
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const pct = x / rect.width
            const idx = Math.round(pct * 4)
            adjustDepth(Math.max(1, Math.min(5, idx + 1)))
          }}
          onKeyDown={(e) => {
            if (generating) return
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault(); adjustDepth(Math.min(5, depth + 1))
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault(); adjustDepth(Math.max(1, depth - 1))
            }
          }}
        >
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-200"
            style={{ width: `${((depth - 1) / 4) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow border-2 border-background transition-all duration-200"
            style={{ left: `calc(${((depth - 1) / 4) * 100}% - 0.5rem)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <Badge className={`text-overline ${DEPTH_COLORS[depth - 1]}`}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {depthLabels[depth - 1]}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
