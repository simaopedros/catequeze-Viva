import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "../../client/components/ui/button";

interface TourStep {
  target: string;
  stepKey: "dashboard" | "classes" | "ai" | "messages" | "search";
  position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEP_DEFS: TourStep[] = [
  {
    target: '[data-tour="dashboard-stats"]',
    stepKey: "dashboard",
    position: "bottom",
  },
  {
    target: '[data-tour="sidebar-classes"]',
    stepKey: "classes",
    position: "right",
  },
  { target: '[data-tour="sidebar-ai"]', stepKey: "ai", position: "right" },
  {
    target: '[data-tour="sidebar-messages"]',
    stepKey: "messages",
    position: "right",
  },
  { target: '[data-tour="ctrlk"]', stepKey: "search", position: "bottom" },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const { t } = useTranslation("tour");
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = useMemo(
    () =>
      TOUR_STEP_DEFS.map((def) => ({
        ...def,
        title: t(`steps.${def.stepKey}.title`),
        description: t(`steps.${def.stepKey}.description`),
      })),
    [t],
  );

  const step = steps[currentStep];

  const updateTargetRect = useCallback(() => {
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [step.target]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener("scroll", updateTargetRect);
    window.addEventListener("resize", updateTargetRect);
    return () => {
      window.removeEventListener("scroll", updateTargetRect);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [updateTargetRect]);

  if (dismissed) return null;

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setDismissed(true);
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleDismiss = () => {
    setDismissed(true);
    onComplete();
  };

  const overlayStyle = targetRect
    ? {
        top: targetRect.top - 4,
        left: targetRect.left - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
      }
    : {};

  const tooltipStyle: React.CSSProperties = targetRect
    ? (() => {
        const margin = 12;
        switch (step.position) {
          case "bottom":
            return {
              top: targetRect.bottom + margin,
              left: targetRect.left + targetRect.width / 2,
              transform: "translateX(-50%)",
            };
          case "top":
            return {
              bottom: window.innerHeight - targetRect.top + margin,
              left: targetRect.left + targetRect.width / 2,
              transform: "translateX(-50%)",
            };
          case "right":
            return {
              top: targetRect.top + targetRect.height / 2,
              left: targetRect.right + margin,
              transform: "translateY(-50%)",
            };
          case "left":
            return {
              top: targetRect.top + targetRect.height / 2,
              right: window.innerWidth - targetRect.left + margin,
              transform: "translateY(-50%)",
            };
          default:
            return {
              top: targetRect.bottom + margin,
              left: targetRect.left + targetRect.width / 2,
              transform: "translateX(-50%)",
            };
        }
      })()
    : {};

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/40 transition-opacity"
        onClick={handleDismiss}
      />

      {targetRect && (
        <div
          className="pointer-events-none fixed z-[101] rounded-sm ring-4 ring-[#071A2D] ring-offset-2 transition-all duration-300"
          style={overlayStyle}
        />
      )}

      <div
        className="fixed z-[102] w-80 rounded-sm border border-border/70 bg-white p-5 transition-all duration-300"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("stepOf", { current: currentStep + 1, total: steps.length })}
          </span>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3
          className="mb-1 text-lg font-semibold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> {t("previous")}
          </button>
          <Button size="sm" onClick={handleNext} className="gap-1">
            {isLastStep ? t("start") : t("next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function useGuidedTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("catequese-tour-seen");
    if (seen) return;

    const tryShow = () => {
      // Defer tour until cookie consent has been handled.
      // vanilla-cookieconsent sets cc_cookie once the user accepts/rejects.
      const hasCookieConsent = document.cookie.includes("cc_cookie");
      if (!hasCookieConsent) {
        // Banner still visible — wait and retry
        const timer = setTimeout(tryShow, 500);
        return () => clearTimeout(timer);
      }
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    };

    const cleanup = tryShow();
    return cleanup;
  }, []);

  const completeTour = () => {
    localStorage.setItem("catequese-tour-seen", "true");
    setShowTour(false);
  };

  return { showTour, completeTour };
}
