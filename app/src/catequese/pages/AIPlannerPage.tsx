import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { AppShell } from '../AppShell';
import { Button } from '../../client/components/ui/button';
import { Card } from '../../client/components/ui/card';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Textarea } from '../../client/components/ui/textarea';
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
  Check,
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

const AGE_GROUPS: { value: string; label: string; icon: LucideIcon; age: string }[] = [
  { value: 'Pre-catequese: 6-8 anos', label: 'Pré-catequese', icon: Sprout, age: '6-8 anos' },
  { value: 'Primeira Eucaristia: 9-11 anos', label: '1ª Eucaristia', icon: Wheat, age: '9-11 anos' },
  { value: 'Crisma: 12-15 anos', label: 'Crisma', icon: Flame, age: '12-15 anos' },
  { value: 'Adultos', label: 'Adultos', icon: BookOpen, age: '18+ anos' },
];

const DURATIONS = [
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
];

const APPROACHES = [
  { value: 'Mais dinâmica/lúdica', label: 'Dinâmica e Lúdica', icon: Heart, desc: 'Com jogos, brincadeiras e atividades práticas' },
  { value: 'Mais bíblica/contemplativa', label: 'Bíblica e Contemplativa', icon: BookOpen, desc: 'Foco na leitura orante e reflexão' },
  { value: 'Mista: doutrinal com momentos dinâmicos', label: 'Mista', icon: Church, desc: 'Equilíbrio entre doutrina e dinâmica' },
];

const LOADING_PHRASES = [
  'Consultando o Catecismo da Igreja Católica...',
  'Preparando uma dinâmica especial para seus catequizandos...',
  'Selecionando as melhores passagens bíblicas...',
  'Adaptando a linguagem para a faixa etária escolhida...',
  'Organizando o roteiro com carinho pastoral...',
  'Buscando referências do Magistério da Igreja...',
  'Rezando para que este encontro toque os corações...',
];

export default function AIPlannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get('meetingId');
  const classId = searchParams.get('classId');

  // Step state
  const [step, setStep] = useState(0);
  const [ageGroup, setAgeGroup] = useState('');
  const [theme, setTheme] = useState(meetingId ? 'Encontro da turma' : ''); // Pre-fill if coming from meeting
  const [duration, setDuration] = useState(60);
  const [approach, setApproach] = useState('');
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [contentItemId, setContentItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'meeting' | 'whatsapp' | 'refs'>('meeting');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [generatingWhatsapp, setGeneratingWhatsapp] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);

  // Loading phrase rotation
  useState(() => {
    if (generating) {
      const interval = setInterval(() => {
        setLoadingPhrase(p => (p + 1) % LOADING_PHRASES.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  });

  // Pre-fill age group from class when classId is provided
  useEffect(() => {
    if (!classId) return;
    (async () => {
      try {
        const cls = await getClassDetails({ id: classId });
        if (cls?.stage?.name) {
          const stageName = cls.stage.name.toLowerCase();
          if (stageName.includes('crisma')) {
            setAgeGroup('Crisma: 12-15 anos');
          } else if (stageName.includes('eucaristia') || stageName.includes('primeira')) {
            setAgeGroup('Primeira Eucaristia: 9-11 anos');
          } else if (stageName.includes('pré') || stageName.includes('pre')) {
            setAgeGroup('Pre-catequese: 6-8 anos');
          } else if (stageName.includes('adulto')) {
            setAgeGroup('Adultos');
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
      setCreditsLeft(res.creditsUsed ? null : null);

      // Load credits status
      try {
        const status = await getAiCreditsStatus();
        if (status) setCreditsLeft(status.creditsLeft);
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar encontro. Tente novamente.');
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
      setError(e?.message || 'Erro ao gerar mensagem.');
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
      setError(e?.message || 'Erro ao vincular conteúdo ao encontro.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/content-library')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              Gerador Inteligente de Encontros
            </h1>
            <p className="text-sm text-muted-foreground">Crie roteiros de catequese completos com IA</p>
          </div>
        </div>

        {/* Credits indicator */}
        {creditsLeft !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 w-fit">
            <GraduationCap className="h-4 w-4" />
            <span>{creditsLeft} créditos de IA restantes</span>
          </div>
        )}

        {/* Error */}
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

        {/* No result yet — show wizard */}
        {!result && !generating && (
          <div className="space-y-6">
            {/* Progress steps */}
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

            {/* Step 0: Age group */}
            {step === 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Para qual faixa etária?</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {AGE_GROUPS.map(g => (
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

            {/* Step 1: Theme */}
            {step === 1 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Target className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Qual o tema do encontro?</h2>
                </div>
                <div>
                  <Label htmlFor="theme">Tema</Label>
                  <Input
                    id="theme"
                    placeholder="Ex: O Sacramento da Eucaristia, A Oração do Pai Nosso..."
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Seja específico. A IA usa o tema para montar todo o roteiro.
                </p>
              </Card>
            )}

            {/* Step 2: Duration & Approach */}
            {step === 2 && (
              <div className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Duração do encontro</h2>
                  </div>
                  <div className="flex gap-3">
                    {DURATIONS.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setDuration(d.value)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          duration === d.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <ScrollText className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Abordagem pastoral</h2>
                  </div>
                  <div className="grid gap-3">
                    {APPROACHES.map(a => (
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

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
              >
                Voltar
              </Button>
              {step < 2 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                  Continuar
                </Button>
              ) : (
                <Button onClick={handleGenerate} className="gap-2" size="lg">
                  <Sparkles className="h-4 w-4" />
                  Gerar com IA
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <Card className="p-12 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Gerando seu encontro...</h3>
              <p className="text-muted-foreground mt-2 animate-pulse">
                {LOADING_PHRASES[loadingPhrase]}
              </p>
            </div>
            <Progress value={66} className="w-64 mx-auto" />
          </Card>
        )}

        {/* Result */}
        {result && !generating && (
          <div className="space-y-4">
            <DetailTabs
              tabs={[
                { id: 'meeting', label: 'Encontro Completo' },
                { id: 'whatsapp', label: 'Mensagem WhatsApp' },
                { id: 'refs', label: 'Referências' },
              ]}
              value={activeTab}
              onChange={v => setActiveTab(v as typeof activeTab)}
            />

            {/* Meeting tab */}
            {activeTab === 'meeting' && (
              <Card className="p-6 space-y-6">
                <div>
                  <Badge variant="secondary">Rascunho</Badge>
                  <h2 className="text-2xl font-bold mt-2">{result.title}</h2>
                  <p className="text-muted-foreground">{result.theme}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Objetivo Pastoral</h3>
                  <p className="mt-1">{result.pastoralObjective}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Oração Inicial</h3>
                  <p className="mt-1 italic">{result.openingPrayer}</p>
                </div>

                {result.biblicalReading && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Momento da Palavra</h3>
                    <p className="font-semibold mt-1">{result.biblicalReading.reference}</p>
                    <p className="text-sm italic mt-1">"{result.biblicalReading.text}"</p>
                    <p className="mt-2 text-sm">{result.biblicalReading.explanation}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Conteúdo Central</h3>
                  <div className="mt-2 prose prose-sm max-w-none whitespace-pre-line">
                    {result.mainContent}
                  </div>
                </div>

                {result.dynamic && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Dinâmica / Atividade</h3>
                    <div className="mt-2 prose prose-sm max-w-none whitespace-pre-line">
                      {result.dynamic}
                    </div>
                  </div>
                )}

                {result.familyTask && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Compromisso na Família</h3>
                    <p className="mt-1">{result.familyTask}</p>
                  </div>
                )}

                {result.closingPrayer && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Oração Final</h3>
                    <p className="mt-1 italic">{result.closingPrayer}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duração estimada: {result.estimatedTime} minutos</span>
                </div>
              </Card>
            )}

            {/* WhatsApp tab */}
            {activeTab === 'whatsapp' && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Mensagem para o grupo de pais</h3>
                </div>
                {!whatsappMessage && !generatingWhatsapp && (
                  <Button onClick={handleGenerateWhatsapp} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Gerar mensagem
                  </Button>
                )}
                {generatingWhatsapp && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando mensagem...
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
                        onClick={() => { navigator.clipboard.writeText(whatsappMessage); toast({ title: 'Mensagem copiada!' }); }}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-success/10 hover:bg-success/20 border-success/30 text-success"
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank')}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                        Enviar WhatsApp
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* References tab */}
            {activeTab === 'refs' && (
              <div className="space-y-4">
                {result.catechismRefs?.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Church className="h-4 w-4" />
                      Referências do Catecismo (CIC)
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
                      Referências Bíblicas
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
                  <p className="text-muted-foreground text-sm">Nenhuma referência gerada.</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button onClick={() => { setResult(null); setStep(0); setTheme(''); setWhatsappMessage(''); }}>
                Gerar novo encontro
              </Button>
              <Button variant="outline" onClick={() => navigate(`/app/content-library/${contentItemId}/edit`)}>
                Editar e publicar
              </Button>
              {meetingId && (
                <Button
                  variant={linked ? 'default' : 'secondary'}
                  onClick={handleLinkToMeeting}
                  disabled={linking || linked}
                >
                  {linking ? (
                    <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Vinculando...</>
                  ) : linked ? (
                    <>✓ Vinculado ao Encontro</>
                  ) : (
                    <>📌 Vincular ao Encontro</>
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
