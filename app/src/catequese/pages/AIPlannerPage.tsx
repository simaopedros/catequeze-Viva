import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { AppShell } from '../AppShell';
import { Button } from '../../client/components/ui/button';
import { Card } from '../../client/components/ui/card';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Badge } from '../../client/components/ui/badge';
import { Progress } from '../../client/components/ui/progress';
import {
  Sparkles,
  Clock,
  Users,
  Target,
  BookOpen,
  ArrowLeft,
  Copy,
  MessageCircle,
  GraduationCap,
  Church,
  Heart,
  ScrollText,
  Loader2,
  Sprout,
  Wheat,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  generateMeetingWithAi,
  generateWhatsAppMessage,
  getAiCreditsStatus,
  updateMeeting,
  getClassDetails,
} from 'wasp/client/operations';
import { toast } from '../../client/hooks/use-toast';
import { DetailTabs } from '../../client/components/DetailTabs';

const AGE_GROUP_VALUES = [
  'Pre-catequese: 6-8 anos',
  'Primeira Eucaristia: 9-11 anos',
  'Crisma: 12-15 anos',
  'Adultos',
] as const;

const APPROACH_VALUES = [
  'Mais dinâmica/lúdica',
  'Mais bíblica/contemplativa',
  'Mista: doutrinal com momentos dinâmicos',
] as const;

export default function AIPlannerPage() {
  const { t } = useTranslation('ai');
  const { t: tc } = useTranslation('content');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get('meetingId');
  const classId = searchParams.get('classId');

  const ageGroups = useMemo(() => [
    { value: AGE_GROUP_VALUES[0], label: t('planner.age_groups.pre'), icon: Sprout as LucideIcon, age: t('planner.age_groups.pre_age') },
    { value: AGE_GROUP_VALUES[1], label: t('planner.age_groups.eucharist'), icon: Wheat as LucideIcon, age: t('planner.age_groups.eucharist_age') },
    { value: AGE_GROUP_VALUES[2], label: t('planner.age_groups.confirmation'), icon: Flame as LucideIcon, age: t('planner.age_groups.confirmation_age') },
    { value: AGE_GROUP_VALUES[3], label: t('planner.age_groups.adults'), icon: BookOpen as LucideIcon, age: t('planner.age_groups.adults_age') },
  ], [t]);

  const approaches = useMemo(() => [
    { value: APPROACH_VALUES[0], label: t('planner.approaches.dynamic'), icon: Heart as LucideIcon, desc: t('planner.approaches.dynamic_desc') },
    { value: APPROACH_VALUES[1], label: t('planner.approaches.biblical'), icon: BookOpen as LucideIcon, desc: t('planner.approaches.biblical_desc') },
    { value: APPROACH_VALUES[2], label: t('planner.approaches.mixed'), icon: Church as LucideIcon, desc: t('planner.approaches.mixed_desc') },
  ], [t]);

  const loadingPhrases = useMemo(
    () => t('planner.loading_phrases', { returnObjects: true }) as string[],
    [t],
  );

  const [step, setStep] = useState(0);
  const [ageGroup, setAgeGroup] = useState('');
  const [theme, setTheme] = useState(meetingId ? t('planner.class_meeting_theme') : '');
  const [duration, setDuration] = useState(60);
  const [approach, setApproach] = useState('');
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [contentItemId, setContentItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'meeting' | 'whatsapp' | 'refs'>(
    (searchParams.get('tab') as 'meeting' | 'whatsapp' | 'refs') || 'meeting'
  );
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [generatingWhatsapp, setGeneratingWhatsapp] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);

  useEffect(() => {
    getAiCreditsStatus().then(s => setCreditsLeft(s.creditsLeft)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setLoadingPhrase(p => (p + 1) % loadingPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [generating, loadingPhrases.length]);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      try {
        const cls = await getClassDetails({ id: classId });
        if (cls?.stage?.name) {
          const stageName = cls.stage.name.toLowerCase();
          if (stageName.includes('crisma')) {
            setAgeGroup(AGE_GROUP_VALUES[2]);
          } else if (stageName.includes('eucaristia') || stageName.includes('primeira')) {
            setAgeGroup(AGE_GROUP_VALUES[1]);
          } else if (stageName.includes('pré') || stageName.includes('pre')) {
            setAgeGroup(AGE_GROUP_VALUES[0]);
          } else if (stageName.includes('adulto')) {
            setAgeGroup(AGE_GROUP_VALUES[3]);
          }
        }
      } catch {}
    })();
  }, [classId]);

  const canProceed = () => {
    if (step === 0) return !!ageGroup;
    if (step === 1) return !!theme.trim();
    return true;
  };

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const res = await generateMeetingWithAi({
        input: { theme, ageGroup, duration, approach },
      });
      setResult(res.generated);
      setContentItemId(res.contentItem?.id || null);
      setWhatsappMessage(res.whatsappMessage || '');

      try {
        const status = await getAiCreditsStatus();
        if (status) setCreditsLeft(status.creditsLeft);
      } catch {}
    } catch (e: any) {
      setError(e?.message || t('planner.error_generate'));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateWhatsapp = async () => {
    if (!contentItemId) return;
    setGeneratingWhatsapp(true);
    try {
      const res = await generateWhatsAppMessage({ contentId: contentItemId });
      setWhatsappMessage(res.message);
    } catch (e: any) {
      setError(e?.message || t('planner.error_whatsapp'));
    } finally {
      setGeneratingWhatsapp(false);
    }
  };

  const handleLinkToMeeting = async () => {
    if (!meetingId || !contentItemId) return;
    setLinking(true);
    try {
      await updateMeeting({ id: meetingId, contentId: contentItemId });
      setLinked(true);
    } catch (e: any) {
      setError(e?.message || t('planner.error_link'));
    } finally {
      setLinking(false);
    }
  };

  const durations = [45, 60, 90];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/content-library')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              {t('planner.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('planner.subtitle')}</p>
          </div>
        </div>

        {creditsLeft !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 w-fit">
            <GraduationCap className="h-4 w-4" />
            <span>{t('planner.credits_left', { count: creditsLeft })}</span>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {error.split('/app/billing').length > 1 ? (
              <>
                {error.split('/app/billing')[0]}
                <Link to="/app/billing" className="underline font-semibold hover:text-primary">/app/billing</Link>
                {error.split('/app/billing').slice(1).join('/app/billing')}
              </>
            ) : (
              error
            )}
          </div>
        )}

        {creditsLeft !== null && !result && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            {t('planner.credits_remaining', { count: creditsLeft })}
            {creditsLeft === 0 && (
              <Link to="/app/billing" className="text-primary underline text-xs">{t('planner.upgrade')}</Link>
            )}
          </div>
        )}

        {!result && !generating && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {step === 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">{t('planner.step_age')}</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ageGroups.map(g => (
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
              </Card>
            )}

            {step === 1 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Target className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">{t('planner.step_theme')}</h2>
                </div>
                <div>
                  <Label htmlFor="theme">{tc('theme')}</Label>
                  <Input
                    id="theme"
                    placeholder={t('planner.theme_placeholder')}
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('planner.theme_hint')}
                </p>
              </Card>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">{t('planner.step_duration')}</h2>
                  </div>
                  <div className="flex gap-3">
                    {durations.map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          duration === d
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <ScrollText className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">{t('planner.step_approach')}</h2>
                  </div>
                  <div className="grid gap-3">
                    {approaches.map(a => (
                      <button
                        key={a.value}
                        onClick={() => setApproach(a.value)}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          approach === a.value
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <a.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-sm">{a.label}</div>
                          <div className="text-xs text-muted-foreground">{a.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
              >
                {tCommon('back')}
              </Button>
              {step < 2 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                  {t('planner.continue')}
                </Button>
              ) : (
                <Button onClick={handleGenerate} className="gap-2" size="lg">
                  <Sparkles className="h-4 w-4" />
                  {t('planner.generate')}
                </Button>
              )}
            </div>
          </div>
        )}

        {generating && (
          <Card className="p-12 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('planner.generating_title')}</h3>
              <p className="text-muted-foreground mt-2 animate-pulse">
                {loadingPhrases[loadingPhrase]}
              </p>
            </div>
            <Progress value={66} className="w-64 mx-auto" />
          </Card>
        )}

        {result && !generating && (
          <div className="space-y-4">
            <DetailTabs
              tabs={[
                { id: 'meeting', label: t('planner.tab_meeting') },
                { id: 'whatsapp', label: t('planner.tab_whatsapp') },
                { id: 'refs', label: t('planner.tab_refs') },
              ]}
              value={activeTab}
              onChange={v => setActiveTab(v as typeof activeTab)}
            />

            {activeTab === 'meeting' && (
              <Card className="p-6 space-y-6">
                <div>
                  <Badge variant="secondary">{tc('status_draft')}</Badge>
                  <h2 className="text-2xl font-bold mt-2">{result.title}</h2>
                  <p className="text-muted-foreground">{result.theme}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{tc('pastoral_objective')}</h3>
                  <p className="mt-1">{result.pastoralObjective}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{tc('opening_prayer')}</h3>
                  <p className="mt-1 italic">{result.openingPrayer}</p>
                </div>

                {result.biblicalReading && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{t('planner.word_moment')}</h3>
                    <p className="font-semibold mt-1">{result.biblicalReading.reference}</p>
                    <p className="text-sm italic mt-1">"{result.biblicalReading.text}"</p>
                    <p className="mt-2 text-sm">{result.biblicalReading.explanation}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{t('edit_page.central_content')}</h3>
                  <div className="mt-2 prose prose-sm max-w-none whitespace-pre-line">
                    {result.mainContent}
                  </div>
                </div>

                {result.dynamic && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{tc('dynamic_activity')}</h3>
                    <div className="mt-2 prose prose-sm max-w-none whitespace-pre-line">
                      {result.dynamic}
                    </div>
                  </div>
                )}

                {result.familyTask && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{tc('family_commitment')}</h3>
                    <p className="mt-1">{result.familyTask}</p>
                  </div>
                )}

                {result.closingPrayer && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{tc('closing_prayer')}</h3>
                    <p className="mt-1 italic">{result.closingPrayer}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{t('planner.estimated_duration', { count: result.estimatedTime })}</span>
                </div>
              </Card>
            )}

            {activeTab === 'whatsapp' && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">{t('planner.whatsapp_title')}</h3>
                </div>
                {!whatsappMessage && !generatingWhatsapp && (
                  <Button onClick={handleGenerateWhatsapp} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('planner.generate_message')}
                  </Button>
                )}
                {generatingWhatsapp && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('planner.generating_message')}
                  </div>
                )}
                {whatsappMessage && (
                  <div className="space-y-3">
                    <div className="bg-success/10 rounded-xl p-4 whitespace-pre-line text-sm">
                      {whatsappMessage}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => { navigator.clipboard.writeText(whatsappMessage); toast({ title: t('planner.message_copied') }); }}
                      >
                        <Copy className="h-4 w-4" />
                        {t('planner.copy')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-success/10 hover:bg-success/20 border-success/30 text-success"
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank')}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                        {t('planner.send_whatsapp')}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'refs' && (
              <div className="space-y-4">
                {result.catechismRefs?.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Church className="h-4 w-4" />
                      {t('planner.catechism_refs')}
                    </h3>
                    <ul className="space-y-2">
                      {result.catechismRefs.map((ref: any, i: number) => (
                        <li key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                          <span className="font-semibold text-primary">CIC §{ref.number}</span>
                          <span className="text-muted-foreground"> — {ref.summary}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {result.bibleRefs?.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {t('planner.bible_refs')}
                    </h3>
                    <ul className="space-y-2">
                      {result.bibleRefs.map((ref: any, i: number) => (
                        <li key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                          <span className="font-semibold">{ref.book} {ref.chapter},{ref.verse}</span>
                          <span className="text-muted-foreground"> — "{ref.text}"</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {(!result.catechismRefs?.length && !result.bibleRefs?.length) && (
                  <p className="text-muted-foreground text-sm">{t('planner.no_refs')}</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => { setResult(null); setStep(0); setTheme(''); setWhatsappMessage(''); }}>
                {t('planner.generate_new')}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/app/content-library/${contentItemId}/edit`)}>
                {t('planner.edit_publish')}
              </Button>
              {meetingId && (
                <Button
                  variant={linked ? 'default' : 'secondary'}
                  onClick={handleLinkToMeeting}
                  disabled={linking || linked}
                >
                  {linking ? (
                    <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> {t('planner.linking')}</>
                  ) : linked ? (
                    <>✓ {t('planner.linked')}</>
                  ) : (
                    <>📌 {t('planner.link_to_meeting')}</>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
