import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from 'wasp/client/auth';
import { WelcomeStep } from '../components/onboarding/WelcomeStep';
import { PersonalSetup } from '../components/onboarding/PersonalSetup';
import { CompletionStep } from '../components/onboarding/CompletionStep';
import { DioceseStep, type DioceseSelection } from '../components/onboarding/DioceseStep';
import { ParishStep, type ParishSelection } from '../components/onboarding/ParishStep';
import { CoordinatorDetails } from '../components/onboarding/CoordinatorDetails';
import { getIntendedPlan, clearIntendedPlan, isInstitutionalPlanId } from '../lib/intendedPlan';
import {
  createParish,
  joinParish,
  getOrCreateParishByOsmId,
  completeCoordinatorOnboarding,
  createClass,
  ensurePersonalWorkspace,
} from 'wasp/client/operations';

type Step = 'welcome' | 'personal_setup' | 'diocese' | 'parish' | 'details' | 'completion';

interface CompletionSummary {
  role: string;
  items: { label: string; value: string }[];
}

function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">{children}</div>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { data: authUser } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [accountType, setAccountType] = useState<'personal' | 'manager' | null>(null);
  const [diocese, setDiocese] = useState<DioceseSelection | null>(null);
  const [parish, setParish] = useState<ParishSelection | null>(null);
  const [completionData, setCompletionData] = useState<CompletionSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Step handlers ──────────────────────────────────────────────────────

  const handleDioceseSelect = (d: DioceseSelection) => {
    setDiocese(d);
  };

  const handleParishSelect = (p: ParishSelection) => {
    setParish(p);
  };

  const handleComplete = async (details?: {
    yearName?: string;
    yearStart?: string;
    yearEnd?: string;
    className?: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    householdName?: string;
    phone?: string;
  }) => {
    // Personal account flow doesn't need parish
    // Manager account flow always needs a parish
    if (accountType !== 'personal' && !parish) return;

    setSaving(true);
    setError('');

    try {
      // ── Personal Account Flow ──────────────────────────────────────
      if (accountType === 'personal') {
        const personalParish = await ensurePersonalWorkspace();
        if (!personalParish?.id) {
          throw new Error('Nao foi possivel criar o espaco pessoal. Tente novamente.');
        }

        if (details?.className) {
          await createClass({
            name: details.className.trim(),
            parishId: personalParish.id,
            dayOfWeek: details.dayOfWeek || '6',
            startTime: details.startTime || '09:00',
            endTime: details.endTime || '10:30',
            location: details.location || personalParish.name,
          });
        }

        setCompletionData({
          role: 'catechist',
          items: [
            { label: 'Tipo', value: 'Conta Pessoal' },
            { label: 'Plano', value: (authUser?.subscriptionPlan || 'catechist_free') === 'catechist_free' ? 'Catequista Grátis' : 'Catequista Pro/IA' },
            { label: 'Turma', value: details?.className || 'Criar depois' },
          ],
        });
        setStep('completion');
        return;
      }

      // ── Manager Account Flow — only Coordinator onboarding ─────────
      // Guardians, catechists, and catechumens enter exclusively via
      // invitation from a parish coordinator through the family portal.
      if (!parish) throw new Error('Paróquia não selecionada.');
      let parishId = parish.id;

      // 1. If OSM parish → getOrCreate locally
      if (!parishId && parish.osmId) {
        const created = await getOrCreateParishByOsmId({
          osmId: parish.osmId,
          name: parish.name,
          city: parish.city,
          state: parish.state,
        });
        if (!created?.id) throw new Error('Erro ao registar paróquia do OpenStreetMap.');
        parishId = created.id;
      }

      // 2. If it's a brand new parish (isNew) → create it
      if (!parishId && parish.isNew) {
        const result = await createParish({
          name: parish.name,
          city: parish.city,
          state: parish.state,
          dioceseId: diocese?.id,
        });
        if (!result?.id) throw new Error('Erro ao criar paróquia.');
        parishId = result.id;
      }

      if (!parishId) throw new Error('Nenhuma paróquia selecionada.');

      // Save as active workspace for manager accounts
      localStorage.setItem('catequese-viva-active-workspace', parishId);
      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: parishId }));

      // Coordinator setup — the only role available for self-service institutional onboarding
      if (details?.yearName && details?.yearStart && details?.yearEnd) {
        const result = await completeCoordinatorOnboarding({
          parishName: parish.name,
          parishCity: parish.city,
          parishState: parish.state,
          yearName: details.yearName,
          yearStart: details.yearStart,
          yearEnd: details.yearEnd,
          className: details.className,
          skipClass: !details.className,
        });
        if (!result.existingParishId && details.className && result.classId) {
          const { updateClass } = await import('wasp/client/operations');
          try {
            await updateClass({
              id: result.classId,
              dayOfWeek: details.dayOfWeek,
              startTime: details.startTime,
              endTime: details.endTime,
              location: details.location,
            });
          } catch (_) { /* non-critical */ }
        }
      } else {
        await joinParish({ parishId, role: 'PARISH_COORDINATOR' });
      }

      setCompletionData({
        role: 'coordinator',
        items: [
          { label: 'Diocese', value: diocese?.name || '—' },
          { label: 'Paróquia', value: parish.name },
          { label: 'Ano', value: details?.yearName || '—' },
          { label: 'Turma', value: details?.className || 'Criar depois' },
        ],
      });

      setStep('completion');
    } catch (e: any) {
      setError(e.message || 'Erro ao finalizar configuração.');
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation between steps ──────────────────────────────────────────

  const goTo = (next: Step) => {
    // Auto-advance logic — manager flow skips directly from parish to details
    if (step === 'diocese' && diocese) {
      setStep('parish');
    } else if (step === 'parish' && parish) {
      setStep('details');
    } else {
      setStep(next);
    }
  };

  const handleDioceseSkip = () => {
    setDiocese(null);
    setStep('parish');
  };

  // ── Render ────────────────────────────────────────────────────────────

  // Route after onboarding completes. If the visitor picked a paid plan on the
  // landing/pricing page, send them straight to the right checkout, respecting
  // the account LEVEL: institutional plans only make sense for manager accounts.
  const resolveFinishTarget = (): string => {
    const intended = getIntendedPlan();
    if (intended) {
      const institutional = isInstitutionalPlanId(intended);
      const levelMatchesAccount = institutional ? accountType === 'manager' : accountType === 'personal';
      if (levelMatchesAccount) {
        clearIntendedPlan();
        return `/app/billing?plan=${intended}`;
      }
    }
    return accountType === 'personal' ? '/app/select-workspace' : '/app';
  };

  if (completionData) {
    return (
      <OnboardingLayout>
        <CompletionStep summary={completionData} onFinish={() => navigate(resolveFinishTarget())} />
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuração Inicial</h1>
          <p className="text-muted-foreground mt-1">
            {accountType === 'personal'
              ? 'Vamos configurar o teu espaço pessoal.'
              : 'Vamos configurar a plataforma em 3 passos.'}
          </p>
        </div>

        {/* Step indicator */}
        {step !== 'welcome' && step !== 'completion' && step !== 'personal_setup' && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="flex items-center gap-1">
              {[
                { key: 'diocese', label: 'Diocese' },
                { key: 'parish', label: 'Paróquia' },
                { key: 'details', label: 'Detalhes' },
              ].map((s, i) => {
                const stepKeys = ['diocese', 'parish', 'details'];
                const currentIdx = stepKeys.indexOf(step);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={s.key} className="flex-1 flex items-center gap-1">
                    {/* Connector line */}
                    {i > 0 && (
                      <div className={`h-0.5 flex-1 rounded ${isDone || isCurrent ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                    {/* Step circle */}
                    <div className={`
                      flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-bold shrink-0 transition-all
                      ${isDone ? 'bg-primary border-primary text-primary-foreground' : ''}
                      ${isCurrent ? 'border-primary text-primary bg-primary/10' : ''}
                      ${!isDone && !isCurrent ? 'border-muted-foreground/30 text-muted-foreground' : ''}
                    `}>
                      {isDone ? '✓' : i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Step labels */}
            <div className="flex items-center justify-between">
              {[
                { key: 'diocese', label: 'Diocese' },
                { key: 'parish', label: 'Paróquia' },
                { key: 'details', label: 'Detalhes' },
              ].map((s, i) => {
                const stepKeys = ['diocese', 'parish', 'details'];
                const currentIdx = stepKeys.indexOf(step);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <span key={s.key} className={`text-xs ${isCurrent ? 'font-semibold text-foreground' : isDone ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* WELCOME */}
        {step === 'welcome' && (
          <WelcomeStep
            onPersonal={() => { setAccountType('personal'); setStep('personal_setup'); }}
            onManager={() => { setAccountType('manager'); setStep('diocese'); }}
          />
        )}
        {step === 'personal_setup' && (
          <>
            <button
              onClick={() => { setStep('welcome'); setAccountType(null); }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
            <PersonalSetup
              onComplete={(details) => handleComplete(details)}
              loading={saving}
            />
          </>
        )}

        {/* DIOCESE */}
        {step === 'diocese' && (
          <>
            {!diocese && (
              <button
                onClick={() => { setStep('welcome'); setAccountType(null); }}
                className="text-sm text-muted-foreground hover:text-foreground mb-2"
              >
                ← Voltar
              </button>
            )}
            <DioceseStep
              selected={diocese}
              onSelect={(d) => { setDiocese(d); }}
              onSkip={handleDioceseSkip}
            />
          </>
        )}
        {step === 'diocese' && diocese && (
          <div className="flex justify-between">
            <button onClick={() => setDiocese(null)} className="text-sm text-muted-foreground hover:text-foreground">
              ← Alterar diocese
            </button>
            <button
              onClick={() => setStep('parish')}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              Continuar para Paróquia →
            </button>
          </div>
        )}

        {/* PARISH */}
        {step === 'parish' && (
          <ParishStep
            diocese={diocese}
            selected={parish}
            initialState={diocese?.state}
            onSelect={(p) => { setParish(p); }}
          />
        )}
        {step === 'parish' && parish && (
          <div className="flex justify-between">
            <button onClick={() => setStep('diocese')} className="text-sm text-muted-foreground hover:text-foreground">
              ← Voltar
            </button>
            <button
              onClick={() => setStep('details')}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* DETAILS — Coordinator only for institutional onboarding */}
        {step === 'details' && (
          <div>
            <button onClick={() => setStep('parish')} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">
              ← Voltar
            </button>
            <CoordinatorDetails
              parishName={parish?.name || 'Paróquia'}
              onComplete={handleComplete}
            />
          </div>
        )}

        {/* Saving overlay */}
        {saving && (
          <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
            <div className="bg-card border rounded-xl p-6 shadow-lg text-center">
              <p className="text-sm font-medium">A configurar a plataforma...</p>
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
