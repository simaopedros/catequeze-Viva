import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollaborative } from './CollaborativeContext';
import { Button } from '../../../client/components/ui/button';
import { Card } from '../../../client/components/ui/card';
import { Input } from '../../../client/components/ui/input';
import { Label } from '../../../client/components/ui/label';
import { Sparkles, Loader2, Sprout, Wheat, Flame, BookOpen, Clock, HeartHandshake } from 'lucide-react';
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

export function QuickSetupPanel() {
  const { t } = useTranslation('ai');
  const { t: tc } = useTranslation('content');
  const { t: tcol } = useTranslation('collaborative');
  const { startSession, generating } = useCollaborative();

  const [ageGroup, setAgeGroup] = useState('');
  const [theme, setTheme] = useState('');
  const [duration, setDuration] = useState(60);
  const [approach, setApproach] = useState('mixed');
  const [error, setError] = useState('');

  const ageGroupsLabels = useMemo(() => AGE_GROUPS.map(g => ({
    ...g,
    label: t(g.labelKey),
    age: t(g.ageKey),
  })), [t]);

  const handleStart = async () => {
    setError('');
    if (!ageGroup) { setError(tcol('setup.select_age')); return; }
    if (!theme.trim()) { setError(tcol('setup.theme_required')); return; }

    try {
      await startSession(theme.trim(), ageGroup, duration, approach);
    } catch (e: any) {
      setError(e?.message || tcol('setup.error'));
      toast({ title: tcol('setup.error'), description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-3 py-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 text-2xl font-bold sm:text-3xl">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            {t('planner.title')}
          </div>
          <p className="text-muted-foreground">{t('planner.subtitle')}</p>
          <p className="text-sm text-muted-foreground">
            {tcol('subtitle')}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <Card className="p-4 space-y-6 sm:p-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t('planner.step_age')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ageGroupsLabels.map(g => (
                <button
                  key={g.value}
                  onClick={() => setAgeGroup(g.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all hover:-translate-y-1 ${
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

          <div className="space-y-2">
            <Label htmlFor="theme" className="text-base font-semibold">{tc('theme')}</Label>
            <Input
              id="theme"
              placeholder={t('planner.theme_placeholder')}
              value={theme}
              onChange={e => setTheme(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              className="text-lg"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{t('planner.theme_hint')}</p>
          </div>

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

          <Button
            onClick={handleStart}
            disabled={generating || !ageGroup || !theme.trim()}
            className="w-full gap-2"
            size="lg"
          >
            {generating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> {tcol('setup.title')}...</>
            ) : (
              <><Sparkles className="h-5 w-5" /> {tcol('setup.title')}</>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
