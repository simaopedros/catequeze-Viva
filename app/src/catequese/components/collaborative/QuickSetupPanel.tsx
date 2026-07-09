import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useCollaborative } from './CollaborativeContext';
import { modeToHubLabelKey, modeToIntent, type SessionContext } from '../../../shared/intent';
import { Button } from '../../../client/components/ui/button';
import { Card } from '../../../client/components/ui/card';
import { Input } from '../../../client/components/ui/input';
import { Label } from '../../../client/components/ui/label';
import { Textarea } from '../../../client/components/ui/textarea';
import { Sparkles, Loader2, Sprout, Wheat, Flame, BookOpen, Clock, HeartHandshake, Info, FileText, CalendarDays } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from '../../../client/hooks/use-toast';

const AGE_GROUPS = [
  { value: 'Pre-catequese: 6-8 anos', labelKey: 'planner.age_groups.pre', icon: Sprout as LucideIcon, ageKey: 'planner.age_groups.pre_age' },
  { value: 'Primeira Eucaristia: 9-11 anos', labelKey: 'planner.age_groups.eucharist', icon: Wheat as LucideIcon, ageKey: 'planner.age_groups.eucharist_age' },
  { value: 'Crisma: 12-15 anos', labelKey: 'planner.age_groups.confirmation', icon: Flame as LucideIcon, ageKey: 'planner.age_groups.confirmation_age' },
  { value: 'Adultos', labelKey: 'planner.age_groups.adults', icon: BookOpen as LucideIcon, ageKey: 'planner.age_groups.adults_age' },
];

const DURATIONS = [45, 60, 75, 90];

const APPROACHES = [
  { value: 'mixed', labelKey: 'planner.approaches.mixed', descKey: 'planner.approaches.mixed_desc' },
  { value: 'dynamic', labelKey: 'planner.approaches.dynamic', descKey: 'planner.approaches.dynamic_desc' },
  { value: 'biblical', labelKey: 'planner.approaches.biblical', descKey: 'planner.approaches.biblical_desc' },
];

function resolveButtonLabelKey(mode: string, subIntent?: string | null): string {
  switch (mode) {
    case 'improve-content': return subIntent === 'adapt' ? 'planner.adapt' : 'planner.continue';
    case 'generate-activity': return 'planner.generate';
    case 'generate-whatsapp': return 'planner.generate';
    default: return 'planner.generate';
  }
}

export function QuickSetupPanel({ mode, applyToOriginal }: { mode: string; applyToOriginal?: boolean }) {
  const { t } = useTranslation('ai');
  const { t: tc } = useTranslation('content');
  const { t: tcol } = useTranslation('collaborative');
  const { startSession, generating } = useCollaborative();
  const [searchParams] = useSearchParams();

  const subIntent = searchParams.get('intent');
  const modeLabelKey = modeToHubLabelKey(mode, subIntent);
  const buttonLabelKey = resolveButtonLabelKey(mode, subIntent);

  const isAdapt = mode === 'improve-content' && subIntent === 'adapt';
  const isImprove = mode === 'improve-content' && subIntent !== 'adapt';
  const isGenerateActivity = mode === 'generate-activity';
  const isGenerateWhatsapp = mode === 'generate-whatsapp';
  const isSupport = mode === 'support';
  const isCreate = mode === 'create-meeting';

  // Only create flows show duration + approach
  const showFullForm = isCreate;
  // Activity and improve flows show age group (relevant for pedagogical context)
  const showAgeGroup = isCreate || isImprove || isAdapt || isGenerateActivity || isSupport;
  // WhatsApp skips age group entirely (it's for parents, not kids)

  const [ageGroup, setAgeGroup] = useState('');
  const [theme, setTheme] = useState('');
  const [improveGoal, setImproveGoal] = useState('');
  const [duration, setDuration] = useState(60);
  const [approach, setApproach] = useState('mixed');
  const [error, setError] = useState('');

  // Pre-fill theme from meeting/content context if available
  const meetingId = searchParams.get('meetingId');
  const contentId = searchParams.get('contentId');
  const meetingTitle = searchParams.get('meetingTitle');
  const contentTitle = searchParams.get('contentTitle');
  const contentTheme = searchParams.get('contentTheme');

  const selectedSourceTitle = contentTitle
    ? decodeURIComponent(contentTitle)
    : meetingTitle
    ? decodeURIComponent(meetingTitle)
    : '';
  const selectedSourceTheme = contentTheme ? decodeURIComponent(contentTheme) : '';
  const hasSelectedSource = Boolean(contentId || meetingId);

  useEffect(() => {
    if (isGenerateActivity || isGenerateWhatsapp || isSupport) {
      if (contentTitle) {
        setTheme(decodeURIComponent(contentTitle));
      } else if (meetingTitle) {
        setTheme(decodeURIComponent(meetingTitle));
      } else if (isGenerateWhatsapp || subIntent === 'whatsapp') {
        setTheme(t('planner.whatsapp_title'));
      }
    }
    if ((isImprove || isAdapt) && contentTitle && !contentId) {
      setTheme(decodeURIComponent(contentTitle));
    }
  }, [isGenerateActivity, isGenerateWhatsapp, isSupport, isImprove, isAdapt, contentTitle, meetingTitle, subIntent, contentId, t]);

  const ageGroupsLabels = useMemo(() => AGE_GROUPS.map(g => ({
    ...g,
    label: t(g.labelKey),
    age: t(g.ageKey),
  })), [t]);

  const handleStart = async () => {
    setError('');

    if (showAgeGroup && !ageGroup) {
      setError(tcol('setup.select_age'));
      return;
    }
    const canUseSelectedSourceWithoutExtraTheme = Boolean(contentId && (isImprove || isAdapt));

    if (!theme.trim() && !canUseSelectedSourceWithoutExtraTheme) {
      setError(tcol('setup.theme_required'));
      return;
    }

    // Combine improvement goal with theme for improve/adapt flows
    const baseTheme = theme.trim() || selectedSourceTitle || selectedSourceTheme || t('planner.class_meeting_theme');
    const effectiveTheme = improveGoal.trim()
      ? `[Objetivo: ${improveGoal.trim()}] ${baseTheme}`
      : baseTheme;

    const ctx: SessionContext = {
      intent: modeToIntent(mode, subIntent),
      theme: effectiveTheme,
      ageGroup: showAgeGroup ? ageGroup : 'Adultos',
      duration: showFullForm ? duration : undefined,
      approach: showFullForm ? approach : undefined,
      contentId: contentId || null,
      meetingId: meetingId || null,
      applyToOriginal,
      manualCreation: false,
    };

    try {
      await startSession(ctx);
    } catch (e: any) {
      setError(e?.message || tcol('setup.error'));
      toast({ title: tcol('setup.error'), description: e?.message, variant: 'destructive' });
    }
  };

  // ── Info hint per mode ──────────────────────────────────────────────────
  const hintText = isImprove
    ? t('planner.improve_hint')
    : isAdapt
    ? t('planner.adapt_hint')
    : isGenerateActivity
    ? t('planner.activity_hint')
    : isGenerateWhatsapp
    ? t('planner.whatsapp_hint')
    : null;

  const contentFieldLabel =
    isGenerateActivity || isGenerateWhatsapp || isSupport
      ? t('planner.step_theme')
      : isAdapt
      ? contentId
        ? t('planner.step_adaptation_request')
        : t('planner.step_tone')
      : isImprove
      ? contentId
        ? t('planner.step_context_additional')
        : t('planner.step_context')
      : tc('theme');

  const contentFieldPlaceholder =
    isImprove || isAdapt
      ? contentId
        ? isAdapt
          ? t('planner.adaptation_request_placeholder')
          : t('planner.context_additional_placeholder')
        : t('planner.context_placeholder')
      : t('planner.theme_placeholder');

  const contentFieldHint = isAdapt
    ? t('planner.adapt_field_hint')
    : isImprove
    ? contentId
      ? t('planner.context_additional_hint')
      : t('planner.context_hint')
    : t('planner.theme_hint');

  const canStartWithoutTheme = Boolean(contentId && (isImprove || isAdapt));

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-3 py-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            {t(modeLabelKey)}
          </div>
          <p className="text-muted-foreground">{t('planner.subtitle')}</p>
          {hintText && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300 mt-2">
              <Info className="h-3.5 w-3.5" />
              {hintText}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <Card className="p-4 space-y-6 sm:p-6">
          {hasSelectedSource && (
            <div className="rounded-sm border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {contentId ? <FileText className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {contentId ? t('planner.selected_content') : t('planner.selected_meeting')}
                  </p>
                  <p className="truncate text-sm font-semibold">{selectedSourceTitle || t('planner.untitled')}</p>
                  {selectedSourceTheme && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{selectedSourceTheme}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {showAgeGroup && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('planner.step_age')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ageGroupsLabels.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setAgeGroup(g.value)}
                    className={`p-4 rounded-sm border-2 text-center transition-all hover:-translate-y-1 ${
      ageGroup === g.value
      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
      : 'border-border hover:border-primary/50'
     }`}
                  >
                    <g.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="font-semibold text-sm">{g.label}</div>
                    <div className="text-xs text-muted-foreground">{g.age}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Improvement goal — only for improve/adapt flows */}
          {(isImprove || isAdapt) && (
            <div className="space-y-2">
              <Label htmlFor="improveGoal" className="text-base font-semibold">
                {t('planner.step_improve_goal')}
              </Label>
              <Textarea
                id="improveGoal"
                placeholder={t('planner.improve_goal_placeholder')}
                value={improveGoal}
                onChange={e => setImproveGoal(e.target.value)}
                className="min-h-[80px]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t('planner.improve_goal_hint')}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="theme" className="text-base font-semibold">
              {contentFieldLabel}
            </Label>
            <Input
              id="theme"
              placeholder={contentFieldPlaceholder}
              value={theme}
              onChange={e => setTheme(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              className="text-lg"
              autoFocus={!isImprove && !isAdapt}
            />
            <p className="text-xs text-muted-foreground">{contentFieldHint}</p>
          </div>

          {showFullForm && (
            <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  {t('planner.step_duration')}
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDuration(value)}
                      className={`rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
      duration === value
       ? 'border-primary bg-primary text-primary-foreground'
       : 'border-border hover:border-primary/50'
      }`}
                    >
                      {value}{t('planner.minutes_abbr')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <HeartHandshake className="h-4 w-4 text-primary" />
                  {t('planner.step_approach')}
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {APPROACHES.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setApproach(option.value)}
                      className={`rounded-md border p-3 text-left transition-colors ${
      approach === option.value
       ? 'border-primary bg-primary/10 ring-2 ring-primary/15'
       : 'border-border hover:border-primary/50'
      }`}
                    >
                      <p className="text-sm font-semibold">{t(option.labelKey)}</p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{t(option.descKey)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={generating || (showAgeGroup && !ageGroup) || (!theme.trim() && !canStartWithoutTheme)}
            className="w-full gap-2"
            size="lg"
          >
            {generating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> {tcol('setup.title')}...</>
            ) : (
              <><Sparkles className="h-5 w-5" /> {t(buttonLabelKey)}</>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
