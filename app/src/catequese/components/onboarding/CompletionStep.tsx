import { useEffect } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';

interface CompletionSummary {
  role: string;
  items: { label: string; value: string }[];
}

interface CompletionStepProps {
  summary: CompletionSummary;
  onFinish: () => void;
}

export function CompletionStep({ summary, onFinish }: CompletionStepProps) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 5000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="rounded-full bg-green-100 p-4 animate-in zoom-in duration-300">
        <Check className="h-10 w-10 text-green-600" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight">Tudo pronto! ✅</h2>
        <p className="text-muted-foreground">
          O teu espaço está configurado. Aqui está um resumo do que foi criado:
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-card p-4 text-left space-y-2">
        {summary.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Redirecionando em 5 segundos...</p>

      <Button onClick={onFinish} size="lg" className="gap-2">
        Ir para o Dashboard
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
