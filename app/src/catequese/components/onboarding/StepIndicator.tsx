import { ChevronRight, Check } from 'lucide-react';

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

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <button
            type="button"
            disabled={!onStepClick || currentStep <= s.id}
            onClick={() => onStepClick?.(s.id)}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              currentStep === s.id
                ? 'bg-primary text-primary-foreground'
                : currentStep > s.id
                  ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep > s.id ? (
              <Check className="h-4 w-4" />
            ) : (
              <s.icon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{s.title}</span>
            <span className="sm:hidden text-xs">{s.id}/{steps.length}</span>
          </button>
          {i < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}
