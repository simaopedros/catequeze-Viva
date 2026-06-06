import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../../client/components/ui/button';

interface TourStep {
  target: string;    // CSS selector for the element to highlight
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard-stats"]',
    title: 'Painel de Controlo',
    description: 'Aqui você vê um resumo da sua catequese: catequizandos ativos, turmas, presença média e pendências.',
    position: 'bottom',
  },
  {
    target: '[data-tour="sidebar-classes"]',
    title: 'Turmas',
    description: 'Gerencie suas turmas, catequistas e encontros. Cada turma tem seu próprio calendário e registo de presenças.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-ai"]',
    title: 'Gerador IA',
    description: 'Crie encontros completos de catequese com inteligência artificial — orações, dinâmicas, referências bíblicas e do Catecismo.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-messages"]',
    title: 'Mensagens',
    description: 'Comunique-se com catequistas, pais e catequizandos. Envie comunicados e mensagens diretas.',
    position: 'right',
  },
  {
    target: '[data-tour="ctrlk"]',
    title: 'Busca Rápida',
    description: 'Pressione Ctrl+K para buscar instantaneamente em toda a plataforma: catequizandos, turmas, Bíblia, Catecismo e muito mais.',
    position: 'bottom',
  },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep];

  const updateTargetRect = useCallback(() => {
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [step.target]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('scroll', updateTargetRect);
    window.addEventListener('resize', updateTargetRect);
    return () => {
      window.removeEventListener('scroll', updateTargetRect);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [updateTargetRect]);

  if (dismissed) return null;

  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setDismissed(true);
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleDismiss = () => {
    setDismissed(true);
    onComplete();
  };

  // Highlight overlay
  const overlayStyle = targetRect ? {
    top: targetRect.top - 4,
    left: targetRect.left - 4,
    width: targetRect.width + 8,
    height: targetRect.height + 8,
  } : {};

  // Tooltip position
  const tooltipStyle: React.CSSProperties = targetRect ? (() => {
    const margin = 12;
    switch (step.position) {
      case 'bottom':
        return { top: targetRect.bottom + margin, left: targetRect.left + targetRect.width / 2, transform: 'translateX(-50%)' };
      case 'top':
        return { bottom: window.innerHeight - targetRect.top + margin, left: targetRect.left + targetRect.width / 2, transform: 'translateX(-50%)' };
      case 'right':
        return { top: targetRect.top + targetRect.height / 2, left: targetRect.right + margin, transform: 'translateY(-50%)' };
      case 'left':
        return { top: targetRect.top + targetRect.height / 2, right: window.innerWidth - targetRect.left + margin, transform: 'translateY(-50%)' };
      default:
        return { top: targetRect.bottom + margin, left: targetRect.left + targetRect.width / 2, transform: 'translateX(-50%)' };
    }
  })() : {};

  return (
    <>
      {/* Dimming overlay */}
      <div className="fixed inset-0 z-[100] bg-black/40 transition-opacity" onClick={handleDismiss} />

      {/* Highlight cutout */}
      {targetRect && (
        <div
          className="fixed z-[101] rounded-lg ring-4 ring-primary ring-offset-2 transition-all duration-300 pointer-events-none"
          style={overlayStyle}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[102] w-80 bg-card border-2 border-primary rounded-xl shadow-2xl p-5 transition-all duration-300"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Passo {currentStep + 1} de {TOUR_STEPS.length}
          </span>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-bold text-lg mb-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <Button size="sm" onClick={handleNext} className="gap-1">
            {isLastStep ? 'Começar' : 'Próximo'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manage the guided tour state.
 * Shows tour on first visit after onboarding.
 */
export function useGuidedTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('catequese-tour-seen');
    if (!seen) {
      // Show tour after a short delay
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = () => {
    localStorage.setItem('catequese-tour-seen', 'true');
    setShowTour(false);
  };

  return { showTour, completeTour };
}
