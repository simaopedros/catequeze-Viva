import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

type Step = 'welcome' | 'personal_setup' | 'parish' | 'details' | 'completion';

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
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const { data: authUser } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [accountType, setAccountType] = useState<'personal' | 'manager' | null>(null);
  const [diocese, setDiocese] = useState<DioceseSelection | null>(null);
  const [dioceseStepDone, setDioceseStepDone] = useState(false);
  const [parish, setParish] = useState<ParishSelection | null>(null);
  const [completionData, setCompletionData] = useState<CompletionSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    if (accountType !== 'personal' && !parish) return;

    setSaving(true);
    setError('');

    try {
      if (accountType === 'personal') {
        const personalParish = await ensurePersonalWorkspace();
        if (!personalParish?.id) {
          throw new Error(t('personal_workspace_error'));
        }

        if (details?.className) {
          await createClass({
            name: details.className.trim(),
            parishId: personalParish.id,
            dayOfWeek: details.dayOfWeek || '',
            startTime: details.startTime || '',
            endTime: details.endTime || '',
            location: details.location || personalParish.name,
          });
        }

        setCompletionData({
          role: 'catechist',
          items: [
            { label: t('summary.type'), value: t('summary.personal_account') },
            { label: t('summary.plan'), value: (authUser?.subscriptionPlan || 'catechist_free') === 'catechist_free' ? t('summary.plan_free') : t('summary.plan_pro') },
            { label: t('summary.class'), value: details?.className || t('summary.create_later') },
          ],
        });
        setStep('completion');
        return;
      }

      if (!parish) throw new Error(t('parish_not_selected'));
      let parishId = parish.id;

      if (!parishId && parish.osmId) {
        const created = await getOrCreateParishByOsmId({
          osmId: parish.osmId,
          name: parish.name,
          city: parish.city,
          state: parish.state,
        });
        if (!created?.id) throw new Error(t('osm_error'));
        parishId = created.id;
      }

      if (!parishId && parish.isNew) {
        const result = await createParish({
          name: parish.name,
          city: parish.city,
          state: parish.state,
          dioceseId: diocese?.id,
        });
        if (!result?.id) throw new Error(t('create_parish_error'));
        parishId = result.id;
      }

      if (!parishId) throw new Error(t('no_parish_selected'));

      localStorage.setItem('catequese-viva-active-workspace', parishId);
      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: parishId }));

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
          { label: t('summary.diocese'), value: diocese?.name || '—' },
          { label: t('summary.parish'), value: parish.name },
          { label: t('summary.year'), value: details?.yearName || '—' },
          { label: t('summary.class'), value: details?.className || t('summary.create_later') },
        ],
      });

      setStep('completion');
    } catch (e: any) {
      setError(e.message || t('finish_error'));
    } finally {
      setSaving(false);
    }
  };

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
    // Personal: go directly to dashboard (skip workspace selector, it's redundant)
    return '/app';
  };

  const stepLabels = [
    { key: 'parish', label: t('steps.institution') },
    { key: 'details', label: t('steps.details') },
  ];

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
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {accountType === 'personal' ? t('subtitle_personal') : t('subtitle_manager')}
          </p>
        </div>

        {step !== 'welcome' && step !== 'completion' && step !== 'personal_setup' && (
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              {stepLabels.map((s, i) => {
                const stepKeys = ['parish', 'details'];
                const currentIdx = stepKeys.indexOf(step);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={s.key} className="flex-1 flex items-center gap-1">
                    {i > 0 && (
                      <div className={`h-0.5 flex-1 rounded ${isDone || isCurrent ? 'bg-primary' : 'bg-muted'}`} />
                    )}
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
            <div className="flex items-center justify-between">
              {stepLabels.map((s, i) => {
                const stepKeys = ['parish', 'details'];
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

        {step === 'welcome' && (
          <WelcomeStep
            onPersonal={() => { setAccountType('personal'); setStep('personal_setup'); }}
            onManager={() => { setAccountType('manager'); setStep('parish'); }}
          />
        )}
        {step === 'personal_setup' && (
          <>
            <button
              onClick={() => { setStep('welcome'); setAccountType(null); }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('back')}
            </button>
            <PersonalSetup
              onComplete={(details) => handleComplete(details)}
              loading={saving}
            />
          </>
        )}

        {step === 'parish' && (
          <>
            {!dioceseStepDone && (
              <>
                <button
                  onClick={() => { setStep('welcome'); setAccountType(null); }}
                  className="text-sm text-muted-foreground hover:text-foreground mb-2"
                >
                  {t('back')}
                </button>
                <DioceseStep
                  selected={diocese}
                  onSelect={(d) => setDiocese(d)}
                  onSkip={() => setDioceseStepDone(true)}
                />
                {diocese && (
                  <div className="flex justify-between mt-4">
                    <button onClick={() => setDiocese(null)} className="text-sm text-muted-foreground hover:text-foreground">
                      {t('change_diocese')}
                    </button>
                    <button
                      onClick={() => setDioceseStepDone(true)}
                      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
                    >
                      {t('continue')}
                    </button>
                  </div>
                )}
              </>
            )}
            {dioceseStepDone && (
              <>
                {diocese && (
                  <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-3 mb-4 flex items-center gap-2">
                    <span className="text-xs font-medium text-secondary">{t('diocese_selected')}: {diocese.name}</span>
                    <button onClick={() => { setDiocese(null); setDioceseStepDone(false); }} className="text-xs text-muted-foreground hover:text-foreground ml-auto">
                      {t('change_diocese')}
                    </button>
                  </div>
                )}
                <ParishStep
                  diocese={diocese}
                  selected={parish}
                  initialState={diocese?.state}
                  onSelect={(p) => { setParish(p); }}
                />
              </>
            )}
          </>
        )}
        {step === 'parish' && parish && (
          <div className="flex justify-between">
            <button onClick={() => setParish(null)} className="text-sm text-muted-foreground hover:text-foreground">
              {t('back')}
            </button>
            <button
              onClick={() => setStep('details')}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              {t('continue')}
            </button>
          </div>
        )}

        {step === 'details' && (
          <div>
            <button onClick={() => setStep('parish')} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">
              {t('back')}
            </button>
            <CoordinatorDetails
              parishName={parish?.name || t('parish.default_name')}
              onComplete={handleComplete}
            />
          </div>
        )}

        {saving && (
          <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
            <div className="bg-card border rounded-xl p-6 shadow-elevation-md text-center">
              <p className="text-sm font-medium">{t('configuring')}</p>
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
