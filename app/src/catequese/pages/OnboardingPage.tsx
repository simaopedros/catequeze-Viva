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
import { trackMarketingEvent } from '../../client/analytics/marketingAnalytics';
import { cn } from '../../client/utils';
import { CheckCircle2, ChevronLeft, Church } from 'lucide-react';

type Step = 'welcome' | 'personal_setup' | 'parish' | 'details' | 'completion';

interface CompletionSummary {
  role: string;
  title: string;
  description: string;
  items: { label: string; value: string }[];
  primaryActionLabel: string;
  primaryActionTo: string;
}

function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,0.96))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
  backLabel,
  onBack,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3 text-center sm:text-left">
        {onBack && backLabel && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </button>
        )}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="text-base text-slate-600 sm:text-lg">{subtitle}</p>
        </div>
      </section>
      {children}
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

  const getDeferredTarget = (): string | null => {
    const intended = getIntendedPlan();
    if (!intended) return null;

    const institutional = isInstitutionalPlanId(intended);
    const levelMatchesAccount = institutional
      ? accountType === 'manager'
      : accountType === 'personal';

    if (!levelMatchesAccount) return null;
    return `/app/billing?plan=${intended}`;
  };

  const handleSecondaryCompletionAction = () => {
    const deferredTarget = getDeferredTarget();
    if (deferredTarget) {
      clearIntendedPlan();
      navigate(deferredTarget);
      return;
    }

    navigate('/app');
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
    if (accountType !== 'personal' && !parish) return;

    setSaving(true);
    setError('');

    try {
      if (accountType === 'personal') {
        const personalParish = await ensurePersonalWorkspace();
        if (!personalParish?.id) {
          throw new Error(t('personal_workspace_error'));
        }

        trackMarketingEvent('onboarding_step_completed', {
          account_type: 'personal',
          step: 'personal_setup_submitted',
          created_class: Boolean(details?.className),
        });

        let createdClass: { id: string } | null = null;
        if (details?.className) {
          createdClass = await createClass({
            name: details.className.trim(),
            parishId: personalParish.id,
            dayOfWeek: details.dayOfWeek || '',
            startTime: details.startTime || '',
            endTime: details.endTime || '',
            location: details.location || personalParish.name,
          });

          trackMarketingEvent('first_class_created', {
            account_type: 'personal',
            workspace: 'personal',
            source: 'onboarding',
          });
          trackMarketingEvent('activation_completed', {
            account_type: 'personal',
            activation_type: 'first_class_created',
          });
        }

        setCompletionData({
          role: 'catechist',
          title: createdClass ? t('completion.personal_class_title') : t('completion.personal_ready_title'),
          description: createdClass ? t('completion.personal_class_desc') : t('completion.personal_ready_desc'),
          items: [
            { label: t('summary.type'), value: t('summary.personal_account') },
            {
              label: t('summary.plan'),
              value: (authUser?.subscriptionPlan || 'catechist_free') === 'single'
                ? t('summary.plan_paid')
                : t('summary.plan_none'),
            },
            { label: t('summary.class'), value: details?.className || t('summary.create_later') },
          ],
          primaryActionLabel: createdClass ? t('completion.primary_create_meeting') : t('completion.primary_create_class'),
          primaryActionTo: createdClass ? '/app/ai-hub?mode=create-meeting' : '/app/classes/new',
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

      trackMarketingEvent('onboarding_step_completed', {
        account_type: 'manager',
        step: 'institution_selected',
        has_diocese: Boolean(diocese?.id),
      });

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
          } catch (_) {
            /* non-critical */
          }
        }
      } else {
        await joinParish({ parishId, role: 'PARISH_COORDINATOR' });
      }

      trackMarketingEvent('onboarding_step_completed', {
        account_type: 'manager',
        step: 'details_submitted',
        created_class: Boolean(details?.className),
        created_year: Boolean(details?.yearName),
      });

      if (details?.className) {
        trackMarketingEvent('first_class_created', {
          account_type: 'manager',
          workspace: 'institutional',
          source: 'onboarding',
        });
        trackMarketingEvent('activation_completed', {
          account_type: 'manager',
          activation_type: 'first_class_created',
        });
      }

      setCompletionData({
        role: 'coordinator',
        title: details?.className ? t('completion.manager_class_title') : t('completion.manager_ready_title'),
        description: details?.className ? t('completion.manager_class_desc') : t('completion.manager_ready_desc'),
        items: [
          { label: t('summary.diocese'), value: diocese?.name || '—' },
          { label: t('summary.parish'), value: parish.name },
          { label: t('summary.year'), value: details?.yearName || '—' },
          { label: t('summary.class'), value: details?.className || t('summary.create_later') },
        ],
        primaryActionLabel: details?.className ? t('completion.primary_invite_catechist') : t('completion.primary_create_class'),
        primaryActionTo: details?.className ? `/app/parishes/${parishId}/members` : '/app/classes/new',
      });
      setStep('completion');
    } catch (e) {
      const message = e instanceof Error ? e.message : t('finish_error');
      setError(message || t('finish_error'));
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = [
    { key: 'parish', label: t('steps.institution'), icon: Church },
    { key: 'details', label: t('steps.details'), icon: CheckCircle2 },
  ];

  if (completionData) {
    return (
      <OnboardingLayout>
        <CompletionStep
          summary={{
            ...completionData,
            secondaryActionLabel: getDeferredTarget() ? t('completion.go_billing') : t('completion.go_dashboard'),
          }}
          onPrimaryAction={() => navigate(completionData.primaryActionTo)}
          onSecondaryAction={handleSecondaryCompletionAction}
        />
      </OnboardingLayout>
    );
  }

  const shellCopy =
    step === 'welcome'
      ? { title: t('shell.welcome_title'), subtitle: t('shell.welcome_subtitle') }
      : accountType === 'personal'
        ? { title: t('shell.personal_title'), subtitle: t('shell.personal_subtitle') }
        : step === 'parish'
          ? { title: t('shell.manager_parish_title'), subtitle: t('shell.manager_parish_subtitle') }
          : { title: t('shell.manager_details_title'), subtitle: t('shell.manager_details_subtitle') };

  return (
    <OnboardingLayout>
      <div className="space-y-8">
        <StepShell
          title={shellCopy.title}
          subtitle={shellCopy.subtitle}
          backLabel={step !== 'welcome' ? t('back').replace('← ', '') : undefined}
          onBack={
            step === 'personal_setup'
              ? () => {
                  setStep('welcome');
                  setAccountType(null);
                }
              : step === 'parish'
                ? () => {
                    setStep('welcome');
                    setAccountType(null);
                    setDiocese(null);
                    setDioceseStepDone(false);
                    setParish(null);
                  }
                : step === 'details'
                  ? () => setStep('parish')
                  : undefined
          }
        >
          {step !== 'welcome' && step !== 'completion' && step !== 'personal_setup' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {stepLabels.map((s, i) => {
                const stepKeys = ['parish', 'details'];
                const currentIdx = stepKeys.indexOf(step);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div
                    key={s.key}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-sm font-medium transition-all',
                      isDone ? 'border-primary/20 bg-primary/[0.06] text-primary' : isCurrent ? 'border-primary/25 bg-white text-slate-950 shadow-sm' : 'border-border/70 bg-slate-50/70 text-slate-500'
                    )}
                  >
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Etapa {i + 1}</span>
                    <p className="mt-1">{s.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 'welcome' && (
            <WelcomeStep
              onPersonal={() => {
                trackMarketingEvent('onboarding_started', {
                  account_type: 'personal',
                  intent: 'organize_my_class',
                });
                setAccountType('personal');
                setStep('personal_setup');
              }}
              onManager={() => {
                trackMarketingEvent('onboarding_started', {
                  account_type: 'manager',
                  intent: 'organize_parish_catechesis',
                });
                setAccountType('manager');
                setStep('parish');
              }}
            />
          )}

          {step === 'personal_setup' && (
            <div className="rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm shadow-slate-200/60">
              <PersonalSetup
                onComplete={(details) => handleComplete(details)}
                loading={saving}
              />
            </div>
          )}

          {step === 'parish' && (
            <div className="space-y-4 rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm shadow-slate-200/60">
              {!dioceseStepDone && (
                <>
                  <DioceseStep
                    selected={diocese}
                    onSelect={(d) => setDiocese(d)}
                    onSkip={() => setDioceseStepDone(true)}
                    onContinue={() => {
                      trackMarketingEvent('onboarding_step_completed', {
                        account_type: 'manager',
                        step: 'diocese_selected',
                        has_diocese: true,
                      });
                      setDioceseStepDone(true);
                    }}
                  />
                </>
              )}

              {dioceseStepDone && (
                <>
                  {diocese && (
                    <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">{t('diocese_selected')}</p>
                        <p className="text-sm font-semibold text-slate-950">{diocese.name}</p>
                      </div>
                      <button onClick={() => { setDiocese(null); setDioceseStepDone(false); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                        {t('change_diocese')}
                      </button>
                    </div>
                  )}
                  <ParishStep
                    diocese={diocese}
                    selected={parish}
                    initialState={diocese?.state}
                    onSelect={(p) => {
                      setParish(p);
                    }}
                    onContinue={() => {
                      trackMarketingEvent('onboarding_step_completed', {
                        account_type: 'manager',
                        step: 'parish_selected',
                        parish_source: parish?.isNew ? 'manual' : parish?.osmId ? 'osm' : 'existing',
                      });
                      setStep('details');
                    }}
                  />
                </>
              )}
            </div>
          )}


          {step === 'details' && (
            <div className="rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm shadow-slate-200/60">
              <CoordinatorDetails
                parishName={parish?.name || t('parish.default_name')}
                onComplete={handleComplete}
              />
            </div>
          )}
        </StepShell>

        {saving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/55 backdrop-blur-sm">
            <div className="rounded-3xl border border-border/70 bg-white px-8 py-6 text-center shadow-lg shadow-slate-300/30">
              <p className="text-lg font-semibold text-slate-950">{t('configuring')}</p>
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}

