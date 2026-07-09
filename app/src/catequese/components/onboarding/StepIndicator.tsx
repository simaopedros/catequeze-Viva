import { ChevronRight, Check } from "lucide-react";

interface Step {
  id: number;
  title: string;
  icon: React.ComponentType<any>;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const isCurrent = currentStep === s.id;
        const isDone = currentStep > s.id;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!onStepClick || currentStep <= s.id}
              onClick={() => onStepClick?.(s.id)}
              className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                isCurrent || isDone
                  ? "bg-[#071A2D] text-white"
                  : "bg-muted text-muted-foreground"
              } ${isDone && onStepClick ? "cursor-pointer" : ""}`}
            >
              {isDone ? (
                <Check className="h-4 w-4" />
              ) : (
                <s.icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.title}</span>
              <span className="text-xs sm:hidden">
                {s.id}/{steps.length}
              </span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}
