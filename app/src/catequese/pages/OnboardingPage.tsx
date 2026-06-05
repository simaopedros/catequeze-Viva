import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AppShell } from '../AppShell';
import { WelcomeStep } from '../components/onboarding/WelcomeStep';
import { CompletionStep } from '../components/onboarding/CompletionStep';
import { DioceseStep, type DioceseSelection } from '../components/onboarding/DioceseStep';
import { ParishStep, type ParishSelection } from '../components/onboarding/ParishStep';
import { RoleStep, type RoleType } from '../components/onboarding/RoleStep';
import { CoordinatorDetails } from '../components/onboarding/CoordinatorDetails';
import { CatechistDetails } from '../components/onboarding/CatechistDetails';
import { GuardianDetails } from '../components/onboarding/GuardianDetails';
import { ViewerDetails } from '../components/onboarding/ViewerDetails';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import {
  createParish,
  joinParish,
  getOrCreateParishByOsmId,
  completeCoordinatorOnboarding,
  createClass,
  createHousehold,
  addGuardianToHousehold,
} from 'wasp/client/operations';

type Step = 'welcome' | 'diocese' | 'parish' | 'role' | 'details' | 'completion';

interface CompletionSummary {
  role: string;
  items: { label: string; value: string }[];
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [diocese, setDiocese] = useState<DioceseSelection | null>(null);
  const [parish, setParish] = useState<ParishSelection | null>(null);
  const [role, setRole] = useState<RoleType | null>(null);
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
    if (!parish || !role) return;

    setSaving(true);
    setError('');

    try {
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

      // 3. Role-specific setup
      const roleMap: Record<RoleType, string> = {
        coordinator: 'PARISH_COORDINATOR',
        catechist: 'LEAD_CATECHIST',
        guardian: 'GUARDIAN',
        viewer: 'PASTORAL_VIEWER',
      };

      if (role === 'coordinator') {
        // Onboarding completo do coordenador (cria parish + year + class)
        // Se a parish já existe (não é nova), só criar membership + year + class
        await joinParish({ parishId, role: 'PARISH_COORDINATOR' });

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
            // Update class with custom schedule from details
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
      } else if (role === 'catechist') {
        await joinParish({ parishId, role: 'ASSISTANT_CATECHIST' });

        if (details?.className) {
          await createClass({
            name: details.className.trim(),
            parishId,
            dayOfWeek: details.dayOfWeek || '6',
            startTime: details.startTime || '09:00',
            endTime: details.endTime || '10:30',
            location: details.location || parish.name,
          });
        }

        setCompletionData({
          role: 'catechist',
          items: [
            { label: 'Diocese', value: diocese?.name || '—' },
            { label: 'Paróquia', value: parish.name },
            { label: 'Turma', value: details?.className || 'Criar depois' },
          ],
        });
      } else if (role === 'guardian') {
        await joinParish({ parishId, role: 'GUARDIAN' });

        const household = await createHousehold({
          name: details?.householdName || 'Família',
          phone: details?.phone,
          parishId,
        });

        if (household?.id) {
          await addGuardianToHousehold({ householdId: household.id });
        }

        setCompletionData({
          role: 'guardian',
          items: [
            { label: 'Paróquia', value: parish.name },
            { label: 'Família', value: details?.householdName || 'Família' },
          ],
        });
      } else if (role === 'viewer') {
        await joinParish({ parishId, role: 'PASTORAL_VIEWER' });

        setCompletionData({
          role: 'viewer',
          items: [
            { label: 'Paróquia', value: parish.name },
            { label: 'Perfil', value: 'Liderança Pastoral' },
          ],
        });
      }

      setStep('completion');
    } catch (e: any) {
      setError(e.message || 'Erro ao finalizar configuração.');
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation between steps ──────────────────────────────────────────

  const goTo = (next: Step) => {
    // Auto-advance logic
    if (step === 'diocese' && diocese) {
      setStep('parish');
    } else if (step === 'parish' && parish) {
      setStep('role');
    } else if (step === 'role' && role) {
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

  if (completionData) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <CompletionStep summary={completionData} onFinish={() => navigate('/app')} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuração Inicial</h1>
          <p className="text-muted-foreground mt-1">
            Vamos configurar a plataforma em 4 passos.
          </p>
        </div>

        {/* Step indicator */}
        {step !== 'welcome' && step !== 'completion' && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="flex items-center gap-1">
              {[
                { key: 'diocese', label: 'Diocese' },
                { key: 'parish', label: 'Paróquia' },
                { key: 'role', label: 'Perfil' },
                { key: 'details', label: 'Detalhes' },
              ].map((s, i) => {
                const stepKeys = ['diocese', 'parish', 'role', 'details'];
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
                { key: 'role', label: 'Perfil' },
                { key: 'details', label: 'Detalhes' },
              ].map((s, i) => {
                const stepKeys = ['diocese', 'parish', 'role', 'details'];
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
          <WelcomeStep onStart={() => setStep('diocese')} />
        )}

        {/* DIOCESE */}
        {step === 'diocese' && (
          <DioceseStep
            selected={diocese}
            onSelect={(d) => { setDiocese(d); }}
            onSkip={handleDioceseSkip}
          />
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
              onClick={() => setStep('role')}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              Continuar para Perfil →
            </button>
          </div>
        )}

        {/* ROLE */}
        {step === 'role' && (
          <>
            <RoleStep selected={role} onSelect={(r) => { setRole(r); }} />
            <div className="flex justify-between">
              <button onClick={() => setStep('parish')} className="text-sm text-muted-foreground hover:text-foreground">
                ← Voltar
              </button>
              {role && (
                <button
                  onClick={() => setStep('details')}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
                >
                  Continuar →
                </button>
              )}
            </div>
          </>
        )}

        {/* DETAILS */}
        {step === 'details' && role === 'coordinator' && (
          <div>
            <button onClick={() => setStep('role')} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">
              ← Voltar
            </button>
            <CoordinatorDetails
              parishName={parish?.name || 'Paróquia'}
              onComplete={handleComplete}
            />
          </div>
        )}

        {step === 'details' && role === 'catechist' && (
          <div>
            <button onClick={() => setStep('role')} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">
              ← Voltar
            </button>
            <CatechistDetails
              parishName={parish?.name || 'Paróquia'}
              onComplete={(data) => handleComplete(data)}
            />
          </div>
        )}

        {step === 'details' && role === 'guardian' && (
          <div>
            <button onClick={() => setStep('role')} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">
              ← Voltar
            </button>
            <GuardianDetails
              onComplete={(data) => handleComplete(data)}
            />
          </div>
        )}

        {step === 'details' && role === 'viewer' && (
          <div>
            <button onClick={() => setStep('role')} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">
              ← Voltar
            </button>
            <ViewerDetails onComplete={() => handleComplete({})} />
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
    </AppShell>
  );
}
