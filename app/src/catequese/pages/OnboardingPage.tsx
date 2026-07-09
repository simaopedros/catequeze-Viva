import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import {
  ClassSetupStep,
  type ClassSetupDetails,
} from "../components/onboarding/ClassSetupStep";
import { CatechumensSetupStep } from "../components/onboarding/CatechumensSetupStep";
import { CompletionStep } from "../components/onboarding/CompletionStep";
import {
  OnboardingShell,
  type ProgressStep,
} from "../components/onboarding/OnboardingShell";
import {
  DioceseStep,
  type DioceseSelection,
} from "../components/onboarding/DioceseStep";
import {
  ParishStep,
  type ParishSelection,
} from "../components/onboarding/ParishStep";
import { CoordinatorDetails } from "../components/onboarding/CoordinatorDetails";
import {
  getIntendedPlan,
  clearIntendedPlan,
  isInstitutionalPlanId,
} from "../lib/intendedPlan";
import {
  createParish,
  joinParish,
  getOrCreateParishByOsmId,
  completeCoordinatorOnboarding,
  createClass,
  ensurePersonalWorkspace,
} from "wasp/client/operations";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { Button } from "../../client/components/ui/button";
import { ChevronLeft } from "lucide-react";

type AccountType = "personal" | "manager" | null;
type Step =
  | "welcome"
  | "class"
  | "catechumens"
  | "completion"
  | "parish"
  | "details";

interface CompletionSummary {
  role: string;
  title: string;
  description: string;
  items: { label: string; value: string }[];
  primaryActionLabel: string;
  primaryActionTo: string;
}

const STORAGE_KEY = "cv-onboarding-v2";

type PersistedState = {
  accountType: AccountType;
  step: Step;
  workspaceId?: string;
  classId?: string;
  className?: string;
  catechumensCount?: number;
};

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedState;
  } catch {
    return {};
  }
}

function savePersisted(state: PersistedState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function clearPersisted() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function OnboardingPage() {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();

  const persisted = useMemo(() => loadPersisted(), []);
  const [step, setStep] = useState<Step>(persisted.step || "welcome");
  const [accountType, setAccountType] = useState<AccountType>(
    persisted.accountType || null,
  );
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(
    persisted.workspaceId,
  );
  const [classId, setClassId] = useState<string | undefined>(persisted.classId);
  const [className, setClassName] = useState<string | undefined>(
    persisted.className,
  );
  const [catechumensCount, setCatechumensCount] = useState(
    persisted.catechumensCount || 0,
  );

  const [diocese, setDiocese] = useState<DioceseSelection | null>(null);
  const [dioceseStepDone, setDioceseStepDone] = useState(false);
  const [parish, setParish] = useState<ParishSelection | null>(null);
  const [completionData, setCompletionData] =
    useState<CompletionSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step === "welcome") return;
    savePersisted({
      accountType,
      step,
      workspaceId,
      classId,
      className,
      catechumensCount,
    });
  }, [accountType, step, workspaceId, classId, className, catechumensCount]);

  const personalSteps: ProgressStep[] = [
    { id: "welcome", label: t("progress.welcome") },
    { id: "class", label: t("progress.class") },
    { id: "catechumens", label: t("progress.catechumens") },
    { id: "completion", label: t("progress.done") },
  ];

  const managerSteps: ProgressStep[] = [
    { id: "welcome", label: t("progress.welcome") },
    { id: "parish", label: t("progress.institution") },
    { id: "details", label: t("progress.setup") },
    { id: "completion", label: t("progress.done") },
  ];

  const steps =
    accountType === "manager"
      ? managerSteps
      : accountType === "personal"
        ? personalSteps
        : personalSteps;

  const panelCopy = (() => {
    if (step === "welcome") {
      return {
        title: t("shell.welcome_title"),
        subtitle: t("shell.welcome_subtitle"),
      };
    }
    if (accountType === "personal") {
      if (step === "class")
        return {
          title: t("shell.personal_class_title"),
          subtitle: t("shell.personal_class_subtitle"),
        };
      if (step === "catechumens")
        return {
          title: t("shell.personal_people_title"),
          subtitle: t("shell.personal_people_subtitle"),
        };
      return {
        title: t("shell.personal_title"),
        subtitle: t("shell.personal_subtitle"),
      };
    }
    if (step === "parish")
      return {
        title: t("shell.manager_parish_title"),
        subtitle: t("shell.manager_parish_subtitle"),
      };
    if (step === "details")
      return {
        title: t("shell.manager_details_title"),
        subtitle: t("shell.manager_details_subtitle"),
      };
    return {
      title: t("shell.welcome_title"),
      subtitle: t("shell.welcome_subtitle"),
    };
  })();

  const getDeferredTarget = (): string | null => {
    const intended = getIntendedPlan();
    if (!intended) return null;
    const institutional = isInstitutionalPlanId(intended);
    const levelMatchesAccount = institutional
      ? accountType === "manager"
      : accountType === "personal";
    if (!levelMatchesAccount) return null;
    return `/app/billing?plan=${intended}`;
  };

  const handleSecondaryCompletionAction = () => {
    const deferredTarget = getDeferredTarget();
    clearPersisted();
    if (deferredTarget) {
      clearIntendedPlan();
      navigate(deferredTarget);
      return;
    }
    navigate("/app");
  };

  const goBack = () => {
    setError("");
    if (step === "class") {
      setStep("welcome");
      setAccountType(null);
      return;
    }
    if (step === "catechumens") {
      setStep("class");
      return;
    }
    if (step === "parish") {
      setStep("welcome");
      setAccountType(null);
      setDiocese(null);
      setDioceseStepDone(false);
      setParish(null);
      return;
    }
    if (step === "details") {
      setStep("parish");
    }
  };

  /** Catechist: workspace + class, then catechumens step */
  const handlePersonalClass = async (details: ClassSetupDetails) => {
    setSaving(true);
    setError("");
    try {
      const personalParish = await ensurePersonalWorkspace();
      if (!personalParish?.id) throw new Error(t("personal_workspace_error"));

      setWorkspaceId(personalParish.id);
      localStorage.setItem(
        "catequese-viva-active-workspace",
        personalParish.id,
      );
      window.dispatchEvent(
        new CustomEvent("workspace-changed", { detail: personalParish.id }),
      );

      trackMarketingEvent("onboarding_step_completed", {
        account_type: "personal",
        step: "workspace_ready",
      });

      const created = await createClass({
        name: details.className.trim(),
        parishId: personalParish.id,
        dayOfWeek: details.dayOfWeek || "",
        startTime: details.startTime || "",
        endTime: details.endTime || "",
        location: details.location || personalParish.name,
      });

      trackMarketingEvent("first_class_created", {
        account_type: "personal",
        workspace: "personal",
        source: "onboarding",
      });
      trackMarketingEvent("onboarding_step_completed", {
        account_type: "personal",
        step: "class_created",
      });

      setClassId(created.id);
      setClassName(details.className.trim());
      setStep("catechumens");
    } catch (e) {
      const message = e instanceof Error ? e.message : t("finish_error");
      setError(message || t("finish_error"));
    } finally {
      setSaving(false);
    }
  };

  const finishPersonal = (count: number) => {
    setCatechumensCount(count);
    if (count > 0) {
      trackMarketingEvent("activation_completed", {
        account_type: "personal",
        activation_type: "first_class_with_catechumens",
        catechumens: count,
      });
    }
    setCompletionData({
      role: "catechist",
      title:
        count > 0
          ? t("completion.personal_class_ready_title")
          : t("completion.personal_class_empty_title"),
      description:
        count > 0
          ? t("completion.personal_class_ready_desc")
          : t("completion.personal_class_empty_desc"),
      items: [
        { label: t("summary.type"), value: t("summary.personal_account") },
        { label: t("summary.class"), value: className || "—" },
        { label: t("summary.catechumens"), value: String(count) },
      ],
      primaryActionLabel:
        count > 0
          ? t("completion.primary_open_class")
          : t("completion.primary_add_people"),
      primaryActionTo: classId ? `/app/classes/${classId}` : "/app/classes",
    });
    setStep("completion");
    clearPersisted();
  };

  /** Manager path completion (existing logic, simplified) */
  const handleManagerComplete = async (details?: {
    yearName?: string;
    yearStart?: string;
    yearEnd?: string;
    className?: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  }) => {
    if (!parish) return;
    setSaving(true);
    setError("");
    try {
      let parishId = parish.id;

      if (!parishId && parish.osmId) {
        const created = await getOrCreateParishByOsmId({
          osmId: parish.osmId,
          name: parish.name,
          city: parish.city,
          state: parish.state,
        });
        if (!created?.id) throw new Error(t("osm_error"));
        parishId = created.id;
      }

      if (!parishId && parish.isNew) {
        const result = await createParish({
          name: parish.name,
          city: parish.city,
          state: parish.state,
          dioceseId: diocese?.id,
        });
        if (!result?.id) throw new Error(t("create_parish_error"));
        parishId = result.id;
      }

      if (!parishId) throw new Error(t("no_parish_selected"));

      localStorage.setItem("catequese-viva-active-workspace", parishId);
      window.dispatchEvent(
        new CustomEvent("workspace-changed", { detail: parishId }),
      );

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
          const { updateClass } = await import("wasp/client/operations");
          try {
            await updateClass({
              id: result.classId,
              dayOfWeek: details.dayOfWeek,
              startTime: details.startTime,
              endTime: details.endTime,
              location: details.location,
            });
          } catch {
            /* non-critical */
          }
        }
      } else {
        await joinParish({ parishId, role: "PARISH_COORDINATOR" });
      }

      if (details?.className) {
        trackMarketingEvent("first_class_created", {
          account_type: "manager",
          workspace: "institutional",
          source: "onboarding",
        });
      }

      setCompletionData({
        role: "coordinator",
        title: details?.className
          ? t("completion.manager_class_title")
          : t("completion.manager_ready_title"),
        description: details?.className
          ? t("completion.manager_class_desc")
          : t("completion.manager_ready_desc"),
        items: [
          { label: t("summary.diocese"), value: diocese?.name || "—" },
          { label: t("summary.parish"), value: parish.name },
          { label: t("summary.year"), value: details?.yearName || "—" },
          {
            label: t("summary.class"),
            value: details?.className || t("summary.create_later"),
          },
        ],
        primaryActionLabel: details?.className
          ? t("completion.primary_invite_catechist")
          : t("completion.primary_create_class"),
        primaryActionTo: details?.className
          ? `/app/parishes/${parishId}/members`
          : "/app/classes/new",
      });
      setStep("completion");
      clearPersisted();
    } catch (e) {
      const message = e instanceof Error ? e.message : t("finish_error");
      setError(message || t("finish_error"));
    } finally {
      setSaving(false);
    }
  };

  const showBack = step !== "welcome" && step !== "completion";

  return (
    <OnboardingShell
      steps={steps}
      currentStepId={step === "completion" ? "completion" : step}
      panelTitle={panelCopy.title}
      panelSubtitle={panelCopy.subtitle}
      error={error}
      saving={saving}
      savingLabel={t("configuring")}
    >
      {showBack && (
        <button
          type="button"
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("back_clean")}
        </button>
      )}

      {step === "welcome" && (
        <WelcomeStep
          onPersonal={() => {
            trackMarketingEvent("onboarding_started", {
              account_type: "personal",
              intent: "organize_my_class",
            });
            setAccountType("personal");
            setStep("class");
          }}
          onManager={() => {
            trackMarketingEvent("onboarding_started", {
              account_type: "manager",
              intent: "organize_parish_catechesis",
            });
            setAccountType("manager");
            setStep("parish");
          }}
        />
      )}

      {step === "class" && accountType === "personal" && (
        <ClassSetupStep
          loading={saving}
          initial={className ? { className } : undefined}
          onComplete={handlePersonalClass}
        />
      )}

      {step === "catechumens" && classId && className && (
        <CatechumensSetupStep
          classId={classId}
          className={className}
          onContinue={(count) => finishPersonal(count)}
          onSkip={() => finishPersonal(0)}
        />
      )}

      {step === "parish" && accountType === "manager" && (
        <div className="space-y-6">
          {!dioceseStepDone && (
            <DioceseStep
              selected={diocese}
              onSelect={(d) => setDiocese(d)}
              onSkip={() => setDioceseStepDone(true)}
              onContinue={() => {
                trackMarketingEvent("onboarding_step_completed", {
                  account_type: "manager",
                  step: "diocese_selected",
                  has_diocese: true,
                });
                setDioceseStepDone(true);
              }}
            />
          )}
          {dioceseStepDone && (
            <>
              {diocese && (
                <div className="flex items-center gap-3 border border-border/70 px-4 py-3 rounded-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("diocese_selected")}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {diocese.name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setDiocese(null);
                      setDioceseStepDone(false);
                    }}
                  >
                    {t("change_diocese_clean")}
                  </Button>
                </div>
              )}
              <ParishStep
                diocese={diocese}
                selected={parish}
                initialState={diocese?.state}
                onSelect={(p) => setParish(p)}
                onContinue={() => {
                  trackMarketingEvent("onboarding_step_completed", {
                    account_type: "manager",
                    step: "parish_selected",
                  });
                  setStep("details");
                }}
              />
            </>
          )}
        </div>
      )}

      {step === "details" && accountType === "manager" && (
        <CoordinatorDetails
          parishName={parish?.name || t("parish.default_name")}
          onComplete={handleManagerComplete}
        />
      )}

      {step === "completion" && completionData && (
        <CompletionStep
          summary={{
            ...completionData,
            secondaryActionLabel: getDeferredTarget()
              ? t("completion.go_billing")
              : t("completion.go_dashboard"),
          }}
          onPrimaryAction={() => {
            clearPersisted();
            navigate(completionData.primaryActionTo);
          }}
          onSecondaryAction={handleSecondaryCompletionAction}
        />
      )}
    </OnboardingShell>
  );
}
